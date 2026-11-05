import assert from "node:assert/strict";
import { PRESETS, SMILEY_EMISSION_WINDOWS } from "../src/config.js";
import { compileExpression } from "../src/equation-parser.js";
import { traceElectron } from "../src/physics.js";
import { Simulation } from "../src/simulation.js";

const [x, y] = PRESETS.smiley.map(compileExpression);
const close = (a, b, tolerance = 1e-10) => assert.ok(Math.abs(a-b)<tolerance, `${a} vs ${b}`);
for (let i = 0; i <= 1000; i++) {
  const t = i / 1000;
  assert.ok(Number.isFinite(x(t)) && Number.isFinite(y(t)));
}
for (let i = 0; i < 100; i++) {
  const t = .5 * i / 100;
  const point = traceElectron(x(t), y(t), {}, false);
  assert.equal(point.hit, true);
  close(Math.hypot(point.x, point.y), .09644896766090745);
}
for (const [start, center] of [[.54, -.2], [.68, .2]]) {
  for (const offset of [0, .025, .05, .075]) {
    const t = start + offset;
    close(Math.hypot(x(t)-center, y(t)-.2), .045);
    const point = traceElectron(x(t), y(t), {}, false);
    assert.ok(point.hit && point.y > 0);
    assert.equal(Math.sign(point.x), Math.sign(center));
  }
}
const left = traceElectron(x(.839), y(.839), {}, false);
const bottom = traceElectron(x(.894), y(.894), {}, false);
const right = traceElectron(x(.949-1e-8), y(.949-1e-8), {}, false);
assert.ok(left.x<0 && right.x>0 && bottom.y<left.y && bottom.y<right.y);
for (const t of [.51, .65, .79, .99, 1]) assert.equal(traceElectron(x(t), y(t), {}, false).hit, false);

// Renderable samples must come from the real live particle engine too.
const simulation = new Simulation();
simulation.valid = true; simulation.functions = [x, y];
simulation.settings.fireRate = 200;
simulation.loop = false;
simulation.emissionWindows = SMILEY_EMISSION_WINDOWS;
const hits = [];
simulation.onImpact = hit => hits.push(hit);
simulation.advance(14);
assert.ok(hits.length > 1200);
assert.equal(simulation.running, false);
assert.ok(hits.every(p => Math.hypot(p.x, p.y) < .102), "blanked moves leave no stray hits outside the face");
assert.ok(hits.some(p=>p.x<-.08) && hits.some(p=>p.x>.08));
assert.ok(hits.some(p=>p.y>.08) && hits.some(p=>p.y<-.08));
assert.ok(hits.some(p=>p.x<-.025 && p.y>.025 && p.y<.045));
assert.ok(hits.some(p=>p.x>.025 && p.y>.025 && p.y<.045));
assert.ok(hits.some(p=>Math.abs(p.x)<.01 && p.y<-.045 && p.y>-.065));
console.log(`Smiley demo passed: valid piecewise currents, circular outline, two eyes, smile, missed parking intervals and ${hits.length} actual live-particle screen hits.`);

const framed = new Simulation();
framed.valid = true; framed.functions = [x, y]; framed.settings.fireRate = 200;
framed.loop = false; framed.emissionWindows = SMILEY_EMISSION_WINDOWS;
for (let i = 0; i < 840; i++) framed.advance(1 / 60);
assert.equal(framed.cloud.nextId, simulation.cloud.nextId, "beam blanking is independent of frame boundaries");
assert.equal(framed.impacts, simulation.impacts);
