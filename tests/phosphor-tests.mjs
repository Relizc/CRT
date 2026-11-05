import assert from "node:assert/strict";
import { createPhosphorScreen } from "../src/phosphor-screen.js";
import { DEFAULT_SETTINGS } from "../src/config.js";
import { createFakeDOM } from "./helpers.js";

function experiment(initial, persistence) {
  const { element } = createFakeDOM();
  const image = {
    data: new Uint8ClampedArray(
      initial.flatMap((alpha) => [100, 200, 50, alpha]),
    ),
  };
  const canvas = element("screen");
  canvas.width = initial.length;
  canvas.getContext().getImageData = () => image;
  const screen = createPhosphorScreen(canvas, element("grid"), () => ({
    persistence,
  }));
  return { screen, image };
}
for (const persistence of [0.05, 0.3, 1.5, 30]) {
  for (const fps of [30, 60, 144]) {
    const initial = [1, 8, 64, 255],
      { screen, image } = experiment(initial, persistence);
    for (let i = 0; i < Math.ceil(10 * persistence * fps); i++)
      screen.decay(1 / fps);
    assert.deepEqual(
      initial.map((_, i) => image.data[i * 4 + 3]),
      [0, 0, 0, 0],
      `residue at tau=${persistence}, fps=${fps}`,
    );
    assert.deepEqual(Array.from(image.data.slice(0, 3)), [100, 200, 50]);
  }
}
const { screen, image } = experiment([255], 0.3);
for (let i = 0; i < 18; i++) screen.decay(1 / 60);
assert.ok(Math.abs(image.data[3] - 255 / Math.E) <= 1);
screen.clear();
image.data[3] = 1;
screen.decay(0.001);
assert.equal(image.data[3], 1, "clear resets fractional decay carry");
assert.equal(DEFAULT_SETTINGS.persistence, 0.3);

console.log(
  "Complete decay, exponential timing, clear and 0.3 s default passed.",
);
