import assert from "node:assert/strict";
import { createPhosphorScreen } from "../src/phosphor-screen.js";
import { createControls } from "../src/controls.js";
import { Simulation } from "../src/simulation.js";
import { createFakeDOM } from "./helpers.js";

const { element, gradients, fills, downloads } = createFakeDOM();
const simulation = new Simulation();
Object.entries(simulation.settings).forEach(
  ([id, value]) => (element(id).value = String(value)),
);
const screen = createPhosphorScreen(
  element("screen"),
  element("grid"),
  () => simulation.settings,
);
const hit = { hit: true, x: 0.01, y: -0.02 };
function draw(gain, fade = 1, result = hit) {
  simulation.settings.brightness = gain;
  gradients.length = 0;
  fills.length = 0;
  screen.illuminate(result, fade);
  assert.equal(
    element("screen").getContext().globalCompositeOperation,
    "source-over",
  );
  return { gradients: [...gradients], fills: [...fills] };
}
function stops(drawing) {
  assert.equal(drawing.fills.length, 1);
  return drawing.gradients[0].stops.map((stop) => {
    const rgba = stop.color.match(
      /^rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\deE.+-]+)\s*\)$/,
    );
    assert.ok(rgba);
    const values = rgba.slice(1).map(Number);
    assert.ok(
      values
        .slice(0, 3)
        .every(
          (channel) =>
            Number.isFinite(channel) && channel >= 0 && channel <= 255,
        ),
    );
    assert.ok(Number.isFinite(values[3]) && values[3] >= 0 && values[3] <= 1);
    return { offset: stop.offset, alpha: values[3] };
  });
}
for (const [gain, fade, result] of [
  [0, 1, hit],
  [5, 0, hit],
  [5, 1, { ...hit, hit: false }],
]) {
  const drawing = draw(gain, fade, result);
  assert.equal(drawing.fills.length, 0);
  assert.equal(drawing.gradients.length, 0);
}
const normal = stops(draw(1)),
  bright = stops(draw(5)),
  maximum = stops(draw(50));
assert.ok(bright[0].alpha > normal[0].alpha);
const halo = (values) => values.find((stop) => stop.offset === 0.5)?.alpha;
assert.ok(halo(bright) > 0);
assert.ok(halo(maximum) > halo(bright));
assert.equal(maximum.at(-1).alpha, 0);
stops(draw(5, 0.2)).forEach((stop, i) =>
  assert.ok(Math.abs(stop.alpha - normal[i].alpha) < 1e-12),
);
assert.deepEqual(draw(5).gradients[0].coordinates, [480, 510, 0, 480, 510, 16]);

// Exercise the exported controls against a real live Simulation.
let clearCalls = 0;
const controls = createControls(
  simulation,
  {
    ...screen,
    clear() {
      clearCalls++;
    },
  },
  undefined,
  () => controls.refresh(),
);
const electron = simulation.cloud.launch();
simulation.cloud.advanceTo(0.1, () => ({ ix: 0, iy: 0 }));
simulation.emissions.advanceEmission(0.1, 7, () => {});
const before = structuredClone(electron),
  phase = simulation.emissions.phase;
element("brightness").value = "50";
element("brightness").handlers.input();
assert.equal(simulation.settings.brightness, 50);
assert.equal(simulation.cloud.particles[0], electron);
assert.deepEqual(electron, before);
assert.equal(simulation.cloud.time, 0.1);
assert.equal(simulation.emissions.phase, phase);
assert.equal(clearCalls, 0);
for (const invalid of ["-0.5", "50.5", "not a number"]) {
  element("brightness").value = invalid;
  element("brightness").handlers.input();
  assert.equal(simulation.settings.brightness, 50);
  assert.ok(element("settings-error").textContent.length > 0);
  assert.deepEqual(electron, before);
}
screen.exportPNG();
assert.equal(downloads.at(-1).download, "CRT-phosphor-screen.png");
console.log(
  "Impact brightness, zero suppression, exposure, unchanged live states, validation and PNG export passed.",
);
