import { PRESETS, SETTING_RULES, SMILEY_EMISSION_WINDOWS } from "./config.js";
import { compileExpression } from "./equation-parser.js";
import { Simulation } from "./simulation.js";
import { sampleSignals } from "./signal-plot.js";

// UI actions and snapshots, independent of React, the DOM and Three.js.
export class LabController {
  constructor() {
    this.simulation = new Simulation();
    this.rawSettings = Object.fromEntries(
      Object.entries(this.simulation.settings).map(([id, value]) => [id, String(value)]),
    );
    this.options = { speed: 0.25, glass: true, coils: true, guide: true };
    this.view = "perspective";
    this.settingsError = "";
    this.equationErrors = ["", ""];
    this.onClearScreen = () => {};
    this.selectPreset("circle");
  }

  validateEquations() {
    const functions = this.equations.map((value, axis) => {
      try {
        const fn = compileExpression(value);
        this.equationErrors[axis] = "";
        return fn;
      } catch (error) {
        this.equationErrors[axis] = error.message;
        return null;
      }
    });
    this.simulation.functions = functions;
    this.simulation.valid = this.equationErrors.every(error => !error);
    if (!this.simulation.valid) this.simulation.running = false;
    this.rebuildSignals();
  }

  rebuildSignals() {
    const simulation = this.simulation;
    const signals = sampleSignals(simulation.functions, simulation.valid, simulation.settings.duration);
    this.signalData = signals.data;
    this.signalMaximum = signals.maximum;
  }

  selectPreset(name) {
    const simulation = this.simulation;
    this.activePreset = name;
    this.equations = [...PRESETS[name]];
    simulation.settings.duration = 1;
    this.rawSettings.duration = "1";
    simulation.time = 0;
    simulation.emissionWindows = name === "smiley" ? SMILEY_EMISSION_WINDOWS : null;
    if (["smiley", "sawtooth", "triangle"].includes(name)) {
      simulation.setSourceMode("continuous");
      simulation.hold = true;
      this.restart();
    }
    this.validateEquations();
  }

  editEquation(axis, value) {
    this.equations[axis] = value;
    this.activePreset = null;
    this.simulation.emissionWindows = null;
    this.validateEquations();
  }

  setSetting(id, value) {
    this.rawSettings[id] = String(value);
    const next = { ...this.simulation.settings };
    for (const [key, min, max] of SETTING_RULES) {
      const text = this.rawSettings[key], number = Number(text);
      const integer = key === "turns" || key === "fireRate";
      if (!text.trim() || !Number.isFinite(number) || number < min || number > max || (integer && !Number.isInteger(number))) {
        this.settingsError = `${key}: enter ${integer ? "an integer" : "a value"} from ${min} to ${max}.`;
        return;
      }
      next[key] = number;
    }
    this.simulation.settings = next;
    this.simulation.time = Math.min(this.simulation.time, next.duration);
    this.settingsError = "";
    this.rebuildSignals();
  }

  setSourceMode(mode) { this.simulation.setSourceMode(mode); }
  fire() { if (!this.settingsError) return this.simulation.fire(); }
  toggleRunning() { this.simulation.toggleRunning(); }
  restart() { this.simulation.restart(); this.onClearScreen(); }
  clearScreen() { this.onClearScreen(); }
  clearPaths() { this.simulation.cloud.clearTrails(); }
  seek(time) { this.simulation.running = false; this.simulation.time = time; }
  setView(view) { this.view = view; }
  setOption(name, value) {
    if (name === "loop" || name === "hold") this.simulation[name] = value;
    else this.options[name] = value;
  }

  snapshot() {
    const simulation = this.simulation;
    let currents = null;
    if (simulation.valid) {
      try { currents = simulation.evaluateCurrents(simulation.time); }
      catch (error) { simulation.lastPhysicsError = error.message; simulation.running = false; }
    }
    const count = simulation.cloud.particles.length;
    return {
      settings: { ...simulation.settings }, rawSettings: { ...this.rawSettings },
      settingsError: this.settingsError, equations: [...this.equations],
      equationErrors: [...this.equationErrors], activePreset: this.activePreset,
      valid: simulation.valid, running: simulation.running, sourceMode: simulation.sourceMode,
      time: simulation.time, loop: simulation.loop, hold: simulation.hold,
      options: { ...this.options }, view: this.view, currents,
      activeParticles: count, impacts: simulation.impacts,
      lastArrival: simulation.lastArrival, activeElectron: simulation.cloud.particles[0] ? { speed: simulation.cloud.particles[0].speed, physicalAge: simulation.cloud.particles[0].physicalAge } : null,
      physicsError: simulation.lastPhysicsError, signalMaximum: this.signalMaximum,
      canFire: simulation.sourceMode === "single" && simulation.valid && !this.settingsError,
      canPlay: simulation.sourceMode !== "single" || count > 0,
    };
  }
}
