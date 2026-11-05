import assert from "node:assert/strict";
import { PRESETS } from "../src/config.js";
import { compileExpression } from "../src/equation-parser.js";
import { traceElectron } from "../src/physics.js";
import { Simulation } from "../src/simulation.js";

const [x, y] = PRESETS.triangle.map(compileExpression);
const close = (a, b) => assert.ok(Math.abs(a-b)<1e-10, `${a} vs ${b}`);
close(x(0), -.4); close(x(.5), 0); close(x(1), -.4);
for (const start of [0, .25, .5, .75]) {
  close(y(start), -.2);
  close(y(start+.0625), 0);
  close(y(start+.125), .2);
  close(y(start+.1875), 0);
  close(y(start+.25), -.2);
}
for (const edge of [0, .125, .25, .375, .5, .625, .75, .875, 1]) {
  assert.ok(Math.abs(y(edge-1e-8)-y(edge))<1e-6);
  assert.ok(Math.abs(y(edge+1e-8)-y(edge))<1e-6);
}
for (let i=-200; i<200; i++) {
  const t=i/157;
  assert.ok(y(t)>=-.2 && y(t)<=.2);
  close(y(t+.25), y(t));
  assert.equal(traceElectron(x(t), y(t), {}, false).hit, true);
}
const simulation = new Simulation();
simulation.valid=true; simulation.functions=[x,y]; simulation.loop=false;
const hits=[]; simulation.onImpact=hit=>hits.push(hit);
simulation.advance(12);
assert.equal(simulation.running,false);
assert.equal(hits.length,2000);
assert.ok(hits.some(p=>p.x<-.055) && hits.some(p=>p.x>.055));
assert.ok(hits.some(p=>p.y<-.025) && hits.some(p=>p.y>.025));
console.log("Triangle passed: four cycles, symmetric ramps, continuous peaks and resets, negative-time periodicity, bounded fields and 2,000 live-particle impacts.");
