import assert from "node:assert/strict";
import { GEOMETRY, beamProperties, traceElectron } from "../src/physics.js";
const close = (actual, expected, tolerance = 1e-11) =>
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `${actual} differs from ${expected}`,
  );

assert.equal(GEOMETRY.screenZ, 0.5);
assert.equal(GEOMETRY.screenSize, 0.3);
assert.equal(GEOMETRY.poleSize, 0.02);
const straight = traceElectron(0, 0);
assert.equal(straight.status, "screen");
close(straight.x, 0);
close(straight.y, 0);
close(straight.distance, 0.5);
close(straight.flightTime, 0.5 / beamProperties().speed, 1e-20);
close(beamProperties().speed, 26446533.661236588, 1e-5);

// Independent closed-form combined-field sector calculation, valid inside both apertures.
function sectorReference(ix, iy, voltage) {
  const rigidity = beamProperties(voltage).rigidity;
  const cx =
    (1.25663706127e-6 * 100 * ix) / Math.hypot(0.02, 2 * 0.018) / rigidity;
  const cy =
    (1.25663706127e-6 * 100 * iy) / Math.hypot(0.02, 2 * 0.018) / rigidity;
  const curvature = Math.hypot(cx, cy);
  const angle = Math.asin(0.02 * curvature);
  const displacement =
    curvature === 0
      ? 0
      : (2 * Math.sin(angle / 2) ** 2) / curvature + 0.39 * Math.tan(angle);
  const x = curvature ? (displacement * cx) / curvature : 0;
  const y = curvature ? (displacement * cy) / curvature : 0;
  return { x, y };
}

let comparisons = 0;
for (const voltage of [1000, 2000, 5000, 10000]) {
  for (const ix of [-0.1, -0.01, 0, 0.001, 0.1]) {
    for (const iy of [-0.1, -0.01, 0, 0.001, 0.1]) {
      const actual = traceElectron(ix, iy, { voltage });
      const expected = sectorReference(ix, iy, voltage);
      assert.equal(actual.status, "screen");
      close(actual.x, expected.x);
      close(actual.y, expected.y);
      close(actual.z, 0.5);
      close(actual.flightTime * actual.speed, actual.distance);
      comparisons++;
    }
  }
}

assert.equal(GEOMETRY.horizontalZ, GEOMETRY.verticalZ);
assert.equal(GEOMETRY.horizontalZ, 0.1);
assert.equal(traceElectron(0.4, 0).status, "screen");
assert.equal(traceElectron(0, 1.5).status, "outside-screen");
assert.equal(traceElectron(10, 0).status, "returned");
assert.equal(traceElectron(NaN, 0).status, "invalid");
assert.equal(traceElectron(0, 0, { voltage: 0 }).status, "invalid");
assert.equal(traceElectron(1e308, 0).status, "invalid");
for (let i = 0; i < 300; i++) {
  const result = traceElectron(
    2 * Math.sin(i * 1.618),
    2 * Math.cos(i * 2.718),
    { voltage: 500 + 50 * i },
  );
  assert.ok(
    [result.x, result.y, result.z, result.distance, result.flightTime].every(
      Number.isFinite,
    ),
  );
  assert.ok(result.distance <= 2 + 1e-10);
  assert.ok(result.path.every((point) => point.every(Number.isFinite)));
  assert.equal(result.hit, result.status === "screen");
}
console.log(
  `Physics passed: ${comparisons} independent sector comparisons, zero field, polarity, shared field, return, screen bounds, and 300 finite-path cases.`,
);
