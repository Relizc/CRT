import { createElectron, advanceElectron } from "./physics.js";

export const PARTICLE_NS_PER_SECOND = 20;
const PHYSICAL_SECONDS_PER_PLAYBACK_SECOND = PARTICLE_NS_PER_SECOND * 1e-9;
const DRIVE_STEP = 1 / 240;

export class ElectronCloud {
  constructor() {
    this.particles = [];
    this.completedShots = [];
    this.reset();
  }

  reset(now = 0) {
    if (!Number.isFinite(now) || now < 0)
      throw new RangeError(
        "Particle playback time must be finite and nonnegative.",
      );
    this.time = now;
    this.particles.length = 0;
    this.completedShots.length = 0;
    this.nextId = 1;
  }

  launch(options = {}, birthTime = this.time) {
    if (!Number.isFinite(birthTime) || birthTime < 0)
      throw new RangeError(
        "Electron emission time must be finite and nonnegative.",
      );
    const electron = createElectron({ voltage: options.voltage ?? 2000 });
    electron.id = this.nextId++;
    electron.birthTime = birthTime;
    electron.recordTrail = options.recordTrail === true;
    electron.trail = [electron.r.slice()];
    this.particles.push(electron);
    return electron;
  }

  clearTrails() {
    this.completedShots.length = 0;
    for (const electron of this.particles)
      electron.trail = [electron.r.slice()];
  }

  advance(delta, currentAt, options = {}, onArrival = () => {}) {
    if (!Number.isFinite(delta) || delta < 0)
      throw new RangeError(
        "Particle elapsed time must be finite and nonnegative.",
      );
    return this.advanceTo(this.time + delta, currentAt, options, onArrival);
  }

  advanceTo(now, currentAt, options = {}, onArrival = () => {}) {
    if (!Number.isFinite(now) || now < this.time)
      throw new RangeError(
        "Particle playback time must be finite and cannot move backward.",
      );
    let completed = 0;
    while (this.time < now && this.particles.length) {
      const start = this.time,
        end = Math.min(now, start + DRIVE_STEP);
      let current;
      const newbornCurrents = new Map();
      // Validate every drive sample before advancing this substep. A domain
      // error at a newborn's later midpoint must not move older electrons.
      for (const electron of this.particles) {
        if (electron.birthTime >= end) continue;
        if (electron.birthTime <= start)
          current ??= currentAt((start + end) / 2);
        else if (!newbornCurrents.has(electron.birthTime)) {
          newbornCurrents.set(
            electron.birthTime,
            currentAt((electron.birthTime + end) / 2),
          );
        }
      }
      const arrived = [];
      let retained = 0;
      for (const electron of this.particles) {
        if (electron.birthTime < end) {
          const born = Math.max(start, electron.birthTime);
          // Newborns integrate only their own part of the step and sample its
          // midpoint. Existing electrons share a single drive evaluation.
          const drive =
            born === start ? current : newbornCurrents.get(electron.birthTime);
          advanceElectron(
            electron,
            (end - born) * PHYSICAL_SECONDS_PER_PLAYBACK_SECOND,
            drive.ix,
            drive.iy,
            options,
          );
          electron.trail.push(electron.r.slice());
          if (!electron.recordTrail && electron.trail.length > 12)
            electron.trail.shift();
        }
        if (electron.status !== "flying") {
          electron.endTime =
            electron.birthTime +
            electron.physicalAge / PHYSICAL_SECONDS_PER_PLAYBACK_SECOND;
          arrived.push(electron);
          if (electron.recordTrail) this.completedShots.push(electron);
        } else this.particles[retained++] = electron;
      }
      this.particles.length = retained;
      this.time = end;
      completed += arrived.length;
      for (const electron of arrived) onArrival(electron);
    }
    this.time = now;
    return completed;
  }
}
