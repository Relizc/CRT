import assert from "node:assert/strict";
import { Simulation } from "../src/simulation.js";

const simulation = new Simulation();
simulation.valid = true;
simulation.functions = [() => 0.1, () => -0.06];
simulation.setSourceMode("single");
const first = simulation.fire();
simulation.advance(0.2);
assert.ok(first.trail.length > 12, "manual path keeps more than the short tail");
assert.deepEqual(first.trail[0], [0, 0, 0]);
assert.deepEqual(first.trail.at(-1), first.r);
assert.notEqual(first.trail.at(-1), first.r);
const visited = structuredClone(first.trail);
const second = simulation.fire();
assert.notEqual(first.trail, second.trail);
assert.deepEqual(first.trail, visited, "another click preserves the first path");
simulation.advance(0.1);
assert.deepEqual(first.trail.slice(0, visited.length), visited);
assert.ok(first.distance > second.distance);
assert.ok(first.trail.length > second.trail.length);

simulation.advance(2);
assert.equal(simulation.cloud.particles.length, 0);
assert.equal(simulation.cloud.completedShots.length, 2);
assert.deepEqual(simulation.cloud.completedShots, [first, second]);
for (const electron of simulation.cloud.completedShots) {
  assert.equal(electron.status, "screen");
  assert.deepEqual(electron.trail[0], [0, 0, 0]);
  assert.deepEqual(electron.trail.at(-1), electron.r);
  assert.equal(electron.r[2], 0.5);
  assert.ok(electron.trail.every(p => p.every(Number.isFinite)));
}
const completed = simulation.cloud.completedShots.map(e => structuredClone(e.trail));
simulation.setSourceMode("continuous");
simulation.settings.fireRate = 5;
simulation.advance(2);
assert.deepEqual(simulation.cloud.completedShots.map(e => e.trail), completed);
assert.ok(simulation.cloud.particles.every(e => !e.recordTrail && e.trail.length <= 12));
simulation.settings.fireRate = 0;
simulation.advance(2);
assert.equal(simulation.cloud.completedShots.length, 2, "stream particles do not archive full paths");
simulation.restart();
assert.equal(simulation.cloud.completedShots.length, 0);
assert.equal(simulation.cloud.particles.length, 0);

// Missed manual shots also retain only their actual, finite flight.
const missed = new Simulation();
missed.valid = true;
missed.functions = [() => 6, () => 0];
missed.setSourceMode("single");
const electron = missed.fire();
missed.advance(3);
assert.equal(electron.hit, false);
assert.notEqual(electron.status, "flying");
assert.deepEqual(missed.cloud.completedShots, [electron]);
assert.deepEqual(electron.trail.at(-1), electron.r);
console.log("Manual paths passed: full visited history, independent repeated shots, persistence after impact or miss, unchanged stream tails, and Restart clearing.");

// Clear paths is a drawing operation: particles, fields and the clock continue.
const { createControls } = await import("../src/controls.js");
const { createFakeDOM } = await import("./helpers.js");
const { element } = createFakeDOM();
const clearing = new Simulation();
clearing.valid = true;
clearing.functions = [() => 0.1, () => 0.1];
clearing.setSourceMode("single");
clearing.fire(); clearing.advance(2);
const flying = clearing.fire(); clearing.advance(0.1);
const position = flying.r.slice(), before = structuredClone(flying);
delete before.trail;
const clock = clearing.cloud.time, phase = clearing.time, impacts = clearing.impacts;
let phosphorClears = 0, visible = true;
createControls(clearing, { clear() { phosphorClears++; } }, {
  coils: { setVisible(value) { visible = value; } },
}, () => {});
element("clear-paths").handlers.click();
assert.equal(clearing.cloud.completedShots.length, 0);
assert.deepEqual(flying.trail, [position]);
const after = { ...flying }; delete after.trail;
assert.deepEqual(after, before);
assert.equal(clearing.cloud.time, clock);
assert.equal(clearing.time, phase);
assert.equal(clearing.impacts, impacts);
assert.equal(phosphorClears, 0);
assert.equal(clearing.running, true);
element("coils").checked = false; element("coils").handlers.change();
assert.equal(visible, false);
assert.deepEqual({ ...flying, trail: undefined }, { ...before, trail: undefined });
element("coils").checked = true; element("coils").handlers.change();
assert.equal(visible, true);
clearing.advance(0.1);
assert.ok(flying.trail.length > 1);
assert.deepEqual(flying.trail[0], position);
assert.notDeepEqual(flying.r, position);
console.log("Clear paths preserves live physics, phosphor and clocks; Show coils toggles only visibility.");
