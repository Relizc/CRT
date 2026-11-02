import assert from "node:assert/strict";
import {
  createElectron,
  advanceElectron,
  traceElectron,
} from "../src/physics.js";
const close = (actual, expected, tolerance = 1e-10) =>
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `${actual} differs from ${expected}`,
  );
const vectorClose = (actual, expected, tolerance) =>
  actual.forEach((value, i) => close(value, expected[i], tolerance));
let endpoints = 0;
let invariantChecks = 0;

for (const voltage of [500, 2000, 10000]) {
  for (const ix of [-6, -0.4, -0.18, 0, 0.12, 0.4, 6]) {
    for (const iy of [-0.2, 0, 0.15]) {
      const expected = traceElectron(ix, iy, { voltage }, false);
      const electron = createElectron({ voltage });
      const { speed, momentum, gamma } = electron;
      for (let n = 0; electron.status === "flying" && n < 2000; n++) {
        advanceElectron(electron, 20e-9 / 240, ix, iy);
        close(Math.hypot(...electron.u), 1, 1e-12);
        assert.equal(electron.speed, speed);
        assert.equal(electron.momentum, momentum);
        assert.equal(electron.gamma, gamma);
        close(electron.distance, electron.speed * electron.physicalAge, 1e-12);
        invariantChecks++;
      }
      assert.equal(electron.status, expected.status);
      assert.equal(electron.hit, expected.hit);
      vectorClose(electron.r, [expected.x, expected.y, expected.z], 2e-10);
      close(electron.physicalAge, expected.flightTime, 1e-17);
      endpoints++;
    }
  }
}

// A step that reaches a terminal surface uses only the elapsed flight time.
const straight = createElectron();
advanceElectron(straight, 1e-6, 0, 0);
assert.equal(straight.status, "screen");
vectorClose(straight.r, [0, 0, 0.5]);
close(straight.physicalAge, 0.5 / straight.speed, 1e-22);
const terminalSnapshot = structuredClone(straight);
advanceElectron(straight, 1e-6, 6, 6);
assert.deepEqual(straight, terminalSnapshot);
assert.equal("path" in straight, false);
assert.equal("segments" in straight, false);

// Altering the live current affects this electron from its present state.
const changed = createElectron();
advanceElectron(changed, 0.1 / changed.speed, 0.2, 0);
const continuing = structuredClone(changed);
const switchPosition = changed.r.slice();
const switchDirection = changed.u.slice();
const dt = 0.003 / changed.speed;
advanceElectron(changed, dt, 0, 0);
vectorClose(
  changed.r,
  switchPosition.map((value, i) => value + switchDirection[i] * 0.003),
);
vectorClose(changed.u, switchDirection);
advanceElectron(continuing, dt, 0.2, 0);
assert.ok(Math.abs(continuing.u[0] - changed.u[0]) > 1e-3);

// A circle wholly inside the finite gap remains alive for many revolutions.
// No historical path, full-orbit limit, or cumulative-distance limit is used.
const circular = createElectron();
circular.r = [0, 0, 0.1];
const radius = 0.003;
const current =
  ((circular.rigidity / radius) * Math.hypot(0.02, 2 * 0.018)) /
  (1.25663706127e-6 * 100);
const period = (2 * Math.PI * radius) / circular.speed;
advanceElectron(circular, period * 1000.25, current, 0);
assert.equal(circular.status, "flying");
assert.ok(circular.distance > 2);
vectorClose(circular.r, [radius, 0, 0.1 + radius], 1e-11);
vectorClose(circular.u, [1, 0, 0], 1e-10);
close(Math.hypot(circular.r[0] - radius, circular.r[2] - 0.1), radius);
advanceElectron(circular, 1e-6, 0, 0);
assert.equal(circular.status, "escaped");
close(circular.r[0], 1);

// Every electron holds its own state and launch energy.
const first = createElectron({ voltage: 2000 });
const second = createElectron({ voltage: 10000 });
advanceElectron(first, 1e-9, 0, 0);
assert.deepEqual(second.r, [0, 0, 0]);
assert.notEqual(first.speed, second.speed);
assert.throws(() => createElectron({ voltage: 0 }), RangeError);
assert.throws(() => advanceElectron(second, -1, 0, 0), RangeError);
console.log(
  `Live physics passed: ${endpoints} constant-current endpoints, ${invariantChecks} relativistic state invariants, exact terminal time, live current switching, 1000-turn survival, independent particles, and side escape.`,
);
