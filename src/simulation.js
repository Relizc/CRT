import { DEFAULT_SETTINGS, FUNCTION_TIME_SCALE } from "./config.js";
import { ElectronCloud } from "./particles.js";
import { EmissionScheduler } from "./emission.js";

// Function clock, emission, manual firing and arrivals. No DOM or rendering code.
export class Simulation {
  constructor(onImpact = () => {}) {
    this.settings = { ...DEFAULT_SETTINGS };
    this.cloud = new ElectronCloud();
    this.emissions = new EmissionScheduler();
    this.functions = [];
    this.valid = false;
    this.running = true;
    this.sourceMode = "continuous";
    this.time = 0;
    this.loop = true;
    this.hold = false;
    this.lastArrival = null;
    this.impacts = 0;
    this.lastPhysicsError = "";
    this.onImpact = onImpact;
  }

  evaluateCurrents(t) {
    const ix = this.functions[0](t),
      iy = this.functions[1](t);
    if (!Number.isFinite(ix) || !Number.isFinite(iy))
      throw new Error(
        "Current is undefined at this time. Check the domain of both equations.",
      );
    if (Math.max(Math.abs(ix), Math.abs(iy)) > 100)
      throw new Error(
        "Current exceeds the ±100 A simulation range. Reduce the equation amplitude.",
      );
    return { ix, iy };
  }

  setSourceMode(mode) {
    this.sourceMode = mode;
    this.emissions.reset();
    this.running = mode === "continuous" || this.cloud.particles.length > 0;
  }

  fire() {
    if (this.sourceMode !== "single" || !this.valid) return;
    const electron = this.cloud.launch({
      voltage: this.settings.voltage,
      recordTrail: true,
    });
    this.lastPhysicsError = "";
    this.running = true;
    return electron;
  }

  toggleRunning() {
    if (
      this.sourceMode === "continuous" &&
      this.time >= this.settings.duration &&
      !this.cloud.particles.length
    ) {
      this.time = 0;
      this.emissions.reset();
    }
    this.lastPhysicsError = "";
    this.running = !this.running;
  }

  restart() {
    this.time = 0;
    this.emissions.reset();
    this.cloud.reset();
    this.impacts = 0;
    this.lastArrival = null;
    this.lastPhysicsError = "";
    this.running = this.sourceMode === "continuous";
  }

  tick(delta) {
    if (!this.running || !this.valid) return;
    try {
      this.advance(delta);
    } catch (error) {
      this.lastPhysicsError = error.message;
      this.running = false;
    }
  }

  advance(delta) {
    if (!this.valid) return;
    let remaining = delta;
    while (remaining > 1e-12) {
      if (this.time >= this.settings.duration - 1e-12 && this.loop)
        this.time = 0;
      const held = this.time >= this.settings.duration - 1e-12;
      const interval = held
        ? remaining
        : Math.min(
            remaining,
            (this.settings.duration - this.time) / FUNCTION_TIME_SCALE,
          );
      const startTime = this.time,
        startClock = this.cloud.time,
        endClock = startClock + interval;
      if (this.sourceMode === "continuous" && !held) {
        this.emissions.advanceEmission(
          interval,
          this.settings.fireRate,
          (offset) =>
            this.cloud.launch(
              { voltage: this.settings.voltage },
              startClock + offset,
            ),
        );
      }
      try {
        this.cloud.advanceTo(
          endClock,
          (clock) =>
            this.evaluateCurrents(
              held
                ? this.settings.duration
                : startTime + (clock - startClock) * FUNCTION_TIME_SCALE,
            ),
          this.settings,
          (electron) => {
            const [x, y, z] = electron.r;
            this.lastArrival = {
              x,
              y,
              z,
              status: electron.status,
              hit: electron.hit,
              flightTime: electron.physicalAge,
            };
            if (electron.hit) {
              this.impacts++;
              const fade = this.hold
                ? 1
                : Math.exp(
                    -Math.max(0, endClock - electron.endTime) /
                      this.settings.persistence,
                  );
              this.onImpact(this.lastArrival, fade);
            }
          },
        );
      } catch (error) {
        // Resume at the last completed substep; future births never happened.
        if (!held)
          this.time =
            startTime + (this.cloud.time - startClock) * FUNCTION_TIME_SCALE;
        this.cloud.particles = this.cloud.particles.filter(
          (electron) => electron.birthTime <= this.cloud.time,
        );
        this.emissions.reset();
        throw error;
      }
      if (!held) this.time += interval * FUNCTION_TIME_SCALE;
      remaining -= interval;
    }
    if (
      !this.cloud.particles.length &&
      (this.sourceMode === "single" ||
        (this.time >= this.settings.duration - 1e-12 && !this.loop))
    )
      this.running = false;
  }
}
