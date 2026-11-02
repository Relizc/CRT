import assert from "node:assert/strict";
import {
  createElectron,
  advanceElectron,
  coilFields,
  traceElectron,
  GEOMETRY,
} from "../src/physics.js";
const close = (a, b, tolerance = 1e-10) =>
  assert.ok(Math.abs(a - b) < tolerance, `${a} vs ${b}`);
const vectorClose = (a, b, tolerance) =>
  a.forEach((v, i) => close(v, b[i], tolerance));
assert.equal(GEOMETRY.horizontalZ, GEOMETRY.verticalZ);
assert.equal(GEOMETRY.coilRadii[0], GEOMETRY.coilRadii[1]);
for (const current of [-0.2, -0.1, 0, 0.1, 0.2]) {
  const { bx, by } = coilFields(current, current);
  close(Math.abs(bx), Math.abs(by));
  const horizontal = traceElectron(current, 0);
  const vertical = traceElectron(0, current);
  close(horizontal.x, vertical.y);
  close(horizontal.y, 0);
  close(vertical.x, 0);
  const diagonal = traceElectron(current, current);
  close(diagonal.x, diagonal.y);
}
const both = createElectron();
both.r = [0, 0, 0.1];
advanceElectron(both, 0.001 / both.speed, 0.2, 0.2);
assert.ok(
  both.u[0] > 0 && both.u[1] > 0,
  "both force components act in the same interval",
);
const reverse = createElectron();
reverse.r = [0, 0, 0.1];
advanceElectron(reverse, 0.001 / reverse.speed, -0.2, -0.2);
vectorClose(reverse.r, [-both.r[0], -both.r[1], both.r[2]]);

// Independent RK4 integration in arc length, with no use of the exact-helix
// implementation or its boundary solver. Start obliquely so motion has a
// component along B; rotate B during the flight and cross the field boundary.
function rk4(e, distance, ix, iy) {
  let q = [...e.r, ...e.u];
  const { bx, by } = coilFields(ix, iy);
  const derivative = (state) => {
    const [x, y, z, ux, uy, uz] = state;
    const inField =
      Math.abs(x) < 0.01 && Math.abs(y) < 0.01 && z > 0.09 && z < 0.11;
    const k = inField ? -1 / e.rigidity : 0;
    return [ux, uy, uz, k * (-uz * by), k * (uz * bx), k * (ux * by - uy * bx)];
  };
  const count = Math.ceil(distance / 2e-7),
    ds = distance / count;
  for (let n = 0; n < count; n++) {
    const a = derivative(q),
      b = derivative(q.map((v, i) => v + (ds * a[i]) / 2));
    const c = derivative(q.map((v, i) => v + (ds * b[i]) / 2)),
      d = derivative(q.map((v, i) => v + ds * c[i]));
    q = q.map((v, i) => v + (ds * (a[i] + 2 * b[i] + 2 * c[i] + d[i])) / 6);
  }
  e.r = q.slice(0, 3);
  e.u = q.slice(3);
}
for (const [ix, iy] of [
  [0.2, 0.15],
  [-1.2, 0.8],
  [3, -2],
  [-4, -3],
]) {
  const e = createElectron();
  e.r = [0.001, -0.002, 0.098];
  e.u = [0.24, -0.32, Math.sqrt(0.84)];
  const expected = structuredClone(e);
  for (const [distance, x, y] of [
    [0.003, ix, iy],
    [0.004, -iy, ix],
    [0.024, ix, iy],
  ]) {
    advanceElectron(e, distance / e.speed, x, y);
    rk4(expected, distance, x, y);
    vectorClose(e.r, expected.r, 2e-7);
    vectorClose(e.u, expected.u, 1e-5);
    close(Math.hypot(...e.u), 1, 1e-12);
  }
}
// Static prediction must agree with independent live stepping, including misses.
for (let n = 0; n < 80; n++) {
  const ix = 5 * Math.sin(n * 1.618),
    iy = 5 * Math.cos(n * 2.718);
  const predicted = traceElectron(ix, iy),
    e = createElectron();
  for (let i = 0; i < 3000 && e.status === "flying"; i++)
    advanceElectron(e, 20e-9 / 240, ix, iy);
  assert.equal(e.status, predicted.status);
  vectorClose(e.r, [predicted.x, predicted.y, predicted.z], 1e-8);
}
console.log(
  "Combined fields passed: simultaneous force, reversed current, oblique helices, changing field direction and boundary exits vs independent RK4, and 80 guide/live endpoint comparisons.",
);
