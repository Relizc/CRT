import assert from "node:assert/strict";
import { EmissionScheduler } from "../src/emission.js";
const close = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} vs ${expected}`);

function simulate(rate, deltas) {
  const scheduler = new EmissionScheduler(),
    events = [];
  let time = 0,
    total = 0;
  for (const delta of deltas) {
    const count = scheduler.advanceEmission(delta, rate, (offset) => {
      assert.ok(
        offset > 0 && offset <= delta,
        "every emission is inside its interval",
      );
      events.push(time + offset);
    });
    total += count;
    time += delta;
    assert.ok(scheduler.phase >= 0 && scheduler.phase < 1);
  }
  assert.equal(total, events.length);
  return { scheduler, events };
}

const single = simulate(7, [1]),
  frames = simulate(7, Array(60).fill(1 / 60));
assert.equal(single.events.length, 7);
assert.equal(frames.events.length, 7);
single.events.forEach((time, index) => {
  close(time, (index + 1) / 7);
  close(frames.events[index], time);
});
close(single.scheduler.phase, 0);
close(frames.scheduler.phase, 0);
const irregular = simulate(7, [0.13, 0.07, 0.01, 0.19, 0.04, 0.31, 0.25]);
assert.equal(irregular.events.length, 7);
irregular.events.forEach((time, index) => close(time, single.events[index]));

const fractional = simulate(0.3, Array(600).fill(1 / 60));
assert.equal(fractional.events.length, 3);
fractional.events.forEach((time, index) => close(time, (index + 1) / 0.3));
const veryLow = simulate(0.006, Array(10000).fill(1 / 60));
assert.equal(
  veryLow.events.length,
  1,
  "fractional accumulation does not miss the last low-rate event",
);
close(veryLow.scheduler.phase, 0);

const scheduler = new EmissionScheduler(),
  offsets = [];
assert.equal(
  scheduler.advanceEmission(0.25, 2, (offset) => offsets.push(offset)),
  0,
);
close(scheduler.phase, 0.5);
assert.equal(
  scheduler.advanceEmission(100, 0, () => assert.fail("zero rate emitted")),
  0,
);
close(scheduler.phase, 0.5);
assert.equal(
  scheduler.advanceEmission(0.125, 4, (offset) => offsets.push(offset)),
  1,
);
assert.deepEqual(offsets, [0.125]);
close(scheduler.phase, 0);
assert.equal(
  scheduler.advanceEmission(0.25, 4, (offset) => offsets.push(offset)),
  1,
);
assert.deepEqual(offsets, [0.125, 0.25]);
assert.equal(
  scheduler.advanceEmission(0, 4, () => assert.fail("zero interval emitted")),
  0,
);
assert.equal(
  scheduler.advanceEmission(0.1, 4, () => {}),
  0,
);
close(scheduler.phase, 0.4);
assert.equal(
  scheduler.advanceEmission(0.1, 8, (offset) => offsets.push(offset)),
  1,
);
close(offsets.at(-1), 0.075);
close(scheduler.phase, 0.2);

// A repeating equation should keep this scheduler, including its partial phase.
const repeated = simulate(2.5, [1, 1]);
assert.equal(repeated.events.length, 5);
repeated.events.forEach((time, index) => close(time, (index + 1) / 2.5));
assert.equal(repeated.events.filter((time) => time === 2).length, 1);
const maximum = simulate(10000, [1]);
assert.equal(maximum.events.length, 10000);
close(maximum.events[0], 0.0001);
close(maximum.events.at(-1), 1);
const maximumFrames = simulate(10000, Array(60).fill(1 / 60));
assert.equal(maximumFrames.events.length, 10000);
close(maximumFrames.scheduler.phase, 0);
assert.equal(
  simulate(10000, [2]).events.length,
  20000,
  "valid intervals have no per-call event cap",
);

const preservedPhase = scheduler.phase;
for (const [delta, rate] of [
  [-1, 1],
  [Infinity, 1],
  [1, -1],
  [1, 10001],
  [1, NaN],
  [1e308, 10000],
]) {
  assert.throws(
    () =>
      scheduler.advanceEmission(delta, rate, () =>
        assert.fail("invalid call emitted"),
      ),
    RangeError,
  );
  assert.equal(scheduler.phase, preservedPhase, "invalid calls preserve phase");
}
scheduler.reset();
close(scheduler.phase, 0);
const resetOffsets = [];
scheduler.advanceEmission(0.5, 2, (offset) => resetOffsets.push(offset));
assert.deepEqual(
  resetOffsets,
  [0.5],
  "reset starts with a whole period before the first electron",
);
console.log(
  "Emission count, fractional phase, offsets, frame independence, zero rate, rate changes, repeat boundaries, and bounds checks passed.",
);
