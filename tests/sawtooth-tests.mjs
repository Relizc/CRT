import assert from "node:assert/strict";
import { PRESETS } from "../src/config.js";
import { compileExpression } from "../src/equation-parser.js";
import { traceElectron } from "../src/physics.js";
import { Simulation } from "../src/simulation.js";

const [x, y] = PRESETS.sawtooth.map(compileExpression);
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} vs ${b}`);
close(x(0), -.4); close(x(.5), 0); close(x(1), -.4);
close(y(0), -.2); close(y(.125), 0); close(y(.25), -.2);
for (const edge of [.25, .5, .75, 1]) {
  assert.ok(y(edge-1e-8) > .19999);
  close(y(edge), -.2);
}
for (let i = -200; i < 200; i++) {
  const t = i / 157;
  assert.ok(x(t) >= -.4 && x(t) < .4);
  assert.ok(y(t) >= -.2 && y(t) < .2);
  close(y(t+.25), y(t));
  assert.equal(traceElectron(x(t), y(t), {}, false).hit, true);
}
const simulation = new Simulation();
simulation.valid = true; simulation.functions = [x, y]; simulation.loop = false;
const hits = []; simulation.onImpact = hit => hits.push(hit);
simulation.advance(12);
assert.equal(simulation.running, false);
assert.equal(hits.length, 2000);
assert.ok(hits.some(p=>p.x<-.055) && hits.some(p=>p.x>.055));
assert.ok(hits.some(p=>p.y<-.025) && hits.some(p=>p.y>.025));
console.log("Sawtooth passed: ramp direction, four cycles, sharp resets, negative-time periodicity, bounded fields and 2,000 actual electron impacts.");
