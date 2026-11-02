import assert from "node:assert/strict";
import { Simulation } from "../src/simulation.js";
import { FUNCTION_TIME_SCALE } from "../src/config.js";

const close = (a, b, tolerance = 1e-10) =>
  assert.ok(Math.abs(a - b) < tolerance, `${a} vs ${b}`);
function experiment() {
  const simulation = new Simulation();
  simulation.valid = true;
  simulation.functions = [(t) => 0.16 * Math.cos(2 * Math.PI * t), () => 0];
  simulation.settings.fireRate = 0;
  return simulation;
}
assert.equal(FUNCTION_TIME_SCALE, 0.1);
const clock = experiment();
clock.advance(1);
close(clock.time, 0.1);
close(clock.cloud.time, 1);
close(clock.evaluateCurrents(clock.time).ix, 0.16 * Math.cos(0.2 * Math.PI));
clock.advance(9);
close(clock.time, 1);
clock.advance(0.5);
close(clock.time, 0.05, 1e-12);
close(clock.cloud.time, 10.5);

// The new function clock must not slow particle flight or emission scheduling.
const arrivals = [], samples = [], flight = experiment();
flight.functions = [(t) => { samples.push(t); return 0; }, () => 0];
flight.onImpact = (hit) => arrivals.push(hit);
flight.setSourceMode("single");
const electron = flight.fire();
flight.advance(0.1);
close(flight.time, 0.01);
close(electron.physicalAge, 2e-9, 1e-20);
close(electron.r[2], electron.speed * 2e-9);
assert.ok(samples.every((t) => t >= 0 && t <= 0.01 + 1e-12));
flight.advance(1);
assert.equal(arrivals.length, 1);
assert.equal(electron.status, "screen");
close(electron.physicalAge, 0.5 / electron.speed, 1e-20);

// End-of-cycle emission and final-current draining still use playback time.
const once = experiment();
once.settings.duration = 0.1;
once.settings.fireRate = 10;
once.loop = false;
once.functions = [() => 0, () => 0];
once.advance(1.2);
close(once.time, 0.1);
assert.equal(once.cloud.nextId - 1, 10);
once.advance(2);
assert.equal(once.impacts, 10);
assert.equal(once.running, false);

const whole = experiment(), framed = experiment();
whole.advance(10.25);
for (let i = 0; i < 615; i++) framed.advance(1 / 60);
close(whole.time, 0.025);
close(framed.time, whole.time);
console.log("Function clock passed: 0.1× progression, full-cycle looping, midpoint samples, unchanged electron speed and emission rate, draining and frame independence.");
