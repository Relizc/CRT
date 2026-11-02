import assert from "node:assert/strict";
import { ElectronCloud, PARTICLE_NS_PER_SECOND } from "../src/particles.js";
const close = (actual, expected, tolerance = 1e-12) =>
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `${actual} vs ${expected}`,
  );
const off = () => ({ ix: 0, iy: 0 });
assert.equal(PARTICLE_NS_PER_SECOND, 20);

const cloud = new ElectronCloud(),
  options = { voltage: 2000, turns: 100, gap: 0.02 };
const first = cloud.launch(options),
  second = cloud.launch(options, 0.05);
assert.notEqual(first, second);
assert.notEqual(first.r, second.r);
assert.notEqual(first.u, second.u);
assert.notEqual(first.id, second.id);
assert.equal("trajectory" in first, false);
assert.equal("path" in first, false);
assert.equal(first.status, "flying");
assert.equal(first.physicalAge, 0);
assert.deepEqual(first.trail, [[0, 0, 0]]);
const initialSpeed = first.speed,
  initialMomentum = first.momentum;
options.voltage = 50000;
cloud.advanceTo(0.1, off, options);
assert.equal(first.voltage, 2000);
assert.equal(first.speed, initialSpeed);
assert.equal(first.momentum, initialMomentum);
close(first.physicalAge, 0.1 * 20e-9);
close(second.physicalAge, 0.05 * 20e-9);
assert.ok(first.r[2] > second.r[2]);
close(first.distance, first.speed * first.physicalAge);
assert.ok(first.trail.length <= 12);
assert.deepEqual(first.trail.at(-1), first.r);
assert.notEqual(first.trail.at(-1), first.r);
assert.ok(
  first.trail.every((position) => position[2] <= first.r[2]),
  "trail contains travelled positions only",
);

// A field switched on after emission must change the already-flying electron.
const switched = new ElectronCloud(),
  unchanged = new ElectronCloud();
const live = switched.launch(),
  straight = unchanged.launch();
switched.advanceTo(0.1, off);
unchanged.advanceTo(0.1, off);
assert.deepEqual(live.r, straight.r);
switched.advanceTo(0.2, () => ({ ix: 0.1, iy: 0 }));
unchanged.advanceTo(0.2, off);
assert.ok(live.r[0] > 0);
close(straight.r[0], 0);
assert.ok(live.u[0] > 0);
close(Math.hypot(...live.u), 1);
assert.equal(live.speed, straight.speed);
assert.equal(live.momentum, straight.momentum);
const xBeforeOff = live.r[0],
  slopeBeforeOff = live.u[0];
switched.advanceTo(0.22, off);
assert.ok(live.r[0] > xBeforeOff);
close(live.u[0], slopeBeforeOff);

// Midpoint drive is evaluated at bounded steps and at each newborn's own age.
const births = new ElectronCloud(),
  sampleTimes = [];
const early = births.launch({}, 0.001),
  late = births.launch({}, 0.009);
births.advanceTo(0.01, (time) => {
  sampleTimes.push(time);
  return off();
});
assert.ok(sampleTimes.length >= 3);
assert.ok(sampleTimes.every((time) => time >= 0.001 && time <= 0.01));
close(early.physicalAge, 0.009 * 20e-9);
close(late.physicalAge, 0.001 * 20e-9);
assert.ok(early.r[2] > late.r[2]);

const delayed = new ElectronCloud(),
  arrivals = [],
  endpoint = delayed.launch();
const expectedDuration = 0.5 / endpoint.speed / 20e-9;
delayed.advanceTo(expectedDuration / 2, off, {}, (electron) =>
  arrivals.push(electron),
);
assert.equal(arrivals.length, 0);
close(endpoint.r[2], 0.25);
delayed.advanceTo(expectedDuration + 0.001, off, {}, (electron) =>
  arrivals.push(electron),
);
assert.deepEqual(arrivals, [endpoint]);
assert.equal(delayed.particles.length, 0);
assert.equal(endpoint.status, "screen");
assert.equal(endpoint.hit, true);
close(endpoint.r[2], 0.5);
close(endpoint.endTime, expectedDuration);
delayed.advanceTo(100, off, {}, (electron) => arrivals.push(electron));
assert.equal(arrivals.length, 1, "each terminal record arrives only once");

const misses = new ElectronCloud(),
  miss = misses.launch(),
  missArrivals = [];
misses.advanceTo(
  10,
  () => ({ ix: 6, iy: 0 }),
  {},
  (electron) => missArrivals.push(electron),
);
assert.deepEqual(missArrivals, [miss]);
assert.equal(miss.hit, false);
assert.notEqual(miss.status, "flying");
assert.equal(misses.particles.length, 0);
close(Math.hypot(...miss.u), 1);

const population = new ElectronCloud(),
  count = 10001;
for (let i = 0; i < count; i++) population.launch();
assert.equal(
  population.particles.length,
  count,
  "all independent launches are retained without a cap",
);
assert.equal(
  new Set(population.particles.map((electron) => electron.id)).size,
  count,
);
population.advance(0.01, off);
assert.equal(population.particles.length, count);
const ids = new Set();
population.advanceTo(2, off, {}, (electron) => {
  ids.add(electron.id);
  assert.equal(electron.hit, true);
});
assert.equal(ids.size, count);
assert.equal(population.particles.length, 0);
population.advanceTo(3, off, {}, () =>
  assert.fail("retired particle arrived twice"),
);

const sparse = new ElectronCloud(),
  sparseArrivals = [];
const a = sparse.launch({}, 0.25),
  b = sparse.launch({}, 0.75),
  c = sparse.launch({}, 0.99);
sparse.advanceTo(0.2, off);
assert.equal(a.physicalAge, 0);
assert.equal(c.physicalAge, 0);
sparse.advanceTo(1, off, {}, (electron) => sparseArrivals.push(electron));
assert.equal(sparseArrivals.length, 0);
assert.ok(a.distance > b.distance && b.distance > c.distance);
close(a.physicalAge, 0.75 * 20e-9);
close(c.physicalAge, 0.01 * 20e-9);
sparse.advanceTo(10, off, {}, (electron) => sparseArrivals.push(electron));
assert.deepEqual(sparseArrivals, [a, b, c]);
const manual = sparse.launch();
sparse.advanceTo(12, off);
assert.equal(manual.status, "screen");
assert.equal(sparse.particles.length, 0);

// A later newborn midpoint can fail after the shared midpoint was valid.
// Validate the whole step before changing any existing record or trail.
const atomic = new ElectronCloud();
const older = atomic.launch(),
  newborn = atomic.launch({}, 0.003);
const before = [older, newborn].map((electron) => structuredClone(electron));
assert.throws(
  () =>
    atomic.advanceTo(1 / 240, (time) => {
      if (time > 0.003) throw new Error("Drive domain failure");
      return off();
    }),
  /Drive domain failure/,
);
assert.equal(atomic.time, 0);
assert.deepEqual(older, before[0]);
assert.deepEqual(newborn, before[1]);
atomic.advanceTo(1 / 240, off);
close(older.physicalAge, 20e-9 / 240);
close(newborn.physicalAge, (1 / 240 - 0.003) * 20e-9);
assert.equal(older.trail.length, 2);
assert.equal(newborn.trail.length, 2);

const cached = new ElectronCloud(),
  driveSamples = [];
cached.launch();
cached.launch();
cached.launch({}, 0.001);
cached.launch({}, 0.001);
cached.advanceTo(1 / 240, (time) => {
  driveSamples.push(time);
  return off();
});
assert.equal(
  driveSamples.length,
  2,
  "one shared drive sample and one per unique newborn time",
);

assert.throws(() => cloud.launch({}, -1), /emission time/);
assert.throws(() => cloud.advance(-1, off), /elapsed time/);
assert.throws(() => cloud.advanceTo(-1, off), /backward/);
const previousTime = cloud.time;
assert.throws(() => cloud.advanceTo(Infinity, off), /finite/);
assert.equal(cloud.time, previousTime);
cloud.reset();
assert.equal(cloud.time, 0);
assert.equal(cloud.particles.length, 0);
cloud.reset(5);
assert.equal(cloud.time, 5);
console.log(
  "Live per-electron fields, independent states, bounded trails, invariants, births, arrivals, atomic domain failure, cached midpoint drives, and 10,001 uncapped particles passed.",
);
