import assert from "node:assert/strict";
import { LabController } from "../src/lab-controller.js";
import { FUNCTION_TIME_SCALE } from "../src/config.js";
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} vs ${b}`);

function context({
  rate = 7,
  duration = 1,
  loop = true,
  drive = () => ({ ix: 0, iy: 0 }),
} = {}) {
  const spots = [],
    births = [],
    currentTimes = [];
  const controller = new LabController();
  const state = controller.simulation;
  state.onImpact = (result, brightness) => spots.push({ ...result, brightness });
  state.valid = true;
  state.loop = loop;
  Object.assign(state.settings, { fireRate: rate, duration });
  state.evaluateCurrents = (time) => {
    currentTimes.push(time);
    return drive(time);
  };
  const launch = state.cloud.launch.bind(state.cloud);
  state.cloud.launch = (...args) => {
    const record = launch(...args);
    births.push(record);
    return record;
  };
  controller.onClearScreen = () => { spots.length = 0; };
  return {
    state,
    spots,
    births,
    currentTimes,
    controller,
    step(delta) {
      if (state.running && state.valid) state.advance(delta);
    },
    frame(delta) {
      state.tick(Math.min(delta, 0.05));
    },
    click(id) {
      const methods = { fire: "fire", play: "toggleRunning", restart: "restart" };
      controller[methods[id]]();
    },
  };
}

// Emission is distinct from arrival, including sparse future births in a frame.
const whole = context(),
  framed = context();
whole.step(1);
for (let i = 0; i < 60; i++) framed.step(1 / 60);
assert.equal(whole.births.length, 7);
assert.equal(framed.births.length, 7);
whole.births.forEach((electron, index) => {
  close(electron.birthTime, (index + 1) / 7);
  close(framed.births[index].birthTime, electron.birthTime);
});
assert.equal(
  whole.spots.length,
  0,
  "screen remains dark until the first real flight ends",
);
assert.equal(framed.spots.length, 0);
whole.state.settings.fireRate = 0;
whole.step(2);
assert.equal(whole.births.length, 7);
assert.equal(whole.spots.length, 7);
assert.equal(whole.state.cloud.particles.length, 0);
assert.ok(
  whole.spots.every((spot) => spot.hit && Math.abs(spot.z - 0.5) < 1e-12),
);

const repeated = context({ rate: 2, duration: 0.03 });
repeated.step(1);
assert.equal(repeated.births.length, 2);
close(repeated.births[0].birthTime, 0.5);
close(repeated.births[1].birthTime, 1);
assert.ok(
  repeated.currentTimes.every((time) => time >= 0 && time <= 0.03 + 1e-12),
  "cloud clock maps into the current repeat interval",
);
close(repeated.births[1].physicalAge, 0);
repeated.state.settings.fireRate = 0;
repeated.step(2);
assert.equal(
  repeated.spots.length,
  2,
  "repeating drive neither duplicates nor drops arrivals",
);

const off = context({ rate: 0 });
off.step(1);
assert.equal(off.births.length, 0);
assert.equal(off.spots.length, 0);
close(off.state.cloud.time, 1);
off.state.settings.fireRate = 7;
off.step(1);
assert.equal(off.births.length, 7);

const once = context({ rate: 10, duration: 0.03, loop: false });
once.step(0.4);
assert.equal(once.births.length, 3);
close(once.state.time, 0.03);
assert.equal(
  once.state.running,
  true,
  "existing electrons keep flying after automatic emission ends",
);
assert.equal(once.spots.length, 0);
once.step(2);
assert.equal(once.births.length, 3);
assert.equal(once.spots.length, 3);
assert.equal(once.state.running, false);
assert.equal(once.state.cloud.particles.length, 0);

const single = context();
single.state.setSourceMode("single");
assert.equal(single.state.running, false);
single.click("fire");
single.click("fire");
single.click("fire");
assert.equal(
  single.births.length,
  3,
  "three rapid Fire clicks launch three live electrons",
);
assert.equal(single.state.cloud.particles.length, 3);
assert.equal(new Set(single.births.map((electron) => electron.id)).size, 3);
assert.equal(new Set(single.births.map((electron) => electron.r)).size, 3);
assert.equal(new Set(single.births.map((electron) => electron.u)).size, 3);
assert.equal(
  single.controller.snapshot().canFire,
  true,
  "Fire remains available during existing flights",
);
single.step(0.1);
const pausedStates = single.births.map((electron) => structuredClone(electron));
single.click("play");
single.step(0.5);
single.births.forEach((electron, index) =>
  assert.deepEqual(electron, pausedStates[index]),
);
single.click("play");
single.step(2);
assert.equal(single.spots.length, 3);
assert.equal(single.state.impacts, 3);
assert.equal(single.state.cloud.particles.length, 0);
assert.equal(single.state.running, false);
single.click("fire");
assert.equal(
  single.births.length,
  4,
  "a fourth click after completion is accepted",
);
assert.equal(single.state.cloud.particles.length, 1);

const repeatClicks = context();
repeatClicks.state.setSourceMode("single");
repeatClicks.click("fire");
repeatClicks.step(0.1);
const firstLive = repeatClicks.births[0],
  beforeSecond = structuredClone(firstLive);
repeatClicks.click("fire");
assert.deepEqual(
  firstLive,
  beforeSecond,
  "launching a second electron preserves the first live state and trail",
);
close(repeatClicks.state.cloud.time, 0.1);
close(repeatClicks.births[1].birthTime, 0.1);
assert.equal(repeatClicks.births[1].physicalAge, 0);
repeatClicks.step(0.1);
assert.ok(
  firstLive.r[2] > repeatClicks.births[1].r[2],
  "particles retain different ages and positions",
);
const beforeThird = repeatClicks.births.map((electron) =>
  structuredClone(electron),
);
repeatClicks.click("fire");
beforeThird.forEach((electron, index) =>
  assert.deepEqual(repeatClicks.births[index], electron),
);
close(repeatClicks.state.cloud.time, 0.2);
close(repeatClicks.births[2].birthTime, 0.2);
assert.equal(repeatClicks.births[2].physicalAge, 0);
repeatClicks.step(2);
assert.equal(
  repeatClicks.spots.length,
  3,
  "three overlapping manual flights each create one actual screen arrival",
);
assert.equal(repeatClicks.state.cloud.particles.length, 0);

let current = 0;
const changing = context({ drive: () => ({ ix: current, iy: 0 }) });
changing.state.setSourceMode("single");
changing.click("fire");
changing.step(0.1);
const live = changing.births[0],
  speed = live.speed;
close(live.r[0], 0);
current = 0.1;
changing.state.settings.voltage = 50000;
changing.step(0.1);
assert.ok(
  live.r[0] > 0 && live.u[0] > 0,
  "new shared field acts on an already-flying electron",
);
assert.equal(
  live.speed,
  speed,
  "a later source voltage changes only subsequent electrons",
);
assert.equal(
  changing.spots.length,
  0,
  "a changing field adds no predictive screen spot",
);

const miss = context({ drive: () => ({ ix: 6, iy: 0 }) });
miss.state.setSourceMode("single");
miss.click("fire");
miss.step(2);
assert.equal(miss.spots.length, 0);
assert.equal(miss.state.impacts, 0);
assert.equal(miss.state.cloud.particles.length, 0);
assert.equal(miss.state.lastArrival.hit, false);

const restart = context({ rate: 2 });
restart.step(0.25);
restart.click("restart");
restart.step(0.25);
assert.equal(restart.births.length, 0);
close(restart.state.cloud.time, 0.25);
restart.step(0.25);
assert.equal(restart.births.length, 1);
assert.equal(
  restart.spots.length,
  0,
  "restart and preview do not illuminate the screen",
);
restart.click("restart");
assert.equal(restart.state.cloud.particles.length, 0);
assert.equal(restart.state.impacts, 0);
close(restart.state.time, 0);
close(restart.state.cloud.time, 0);
close(restart.state.emissions.phase, 0);

let failDomain = true;
const recovery = context({
  rate: 100,
  drive: (time) => {
    if (failDomain && time > 0.0065) throw new Error("Drive outside its domain");
    return { ix: 0, iy: 0 };
  },
});
recovery.frame(0.05);
recovery.frame(0.05);
assert.equal(
  recovery.state.running,
  false,
  "a mid-frame drive failure pauses the master clock",
);
assert.match(recovery.state.lastPhysicsError, /outside its domain/);
close(recovery.state.time, recovery.state.cloud.time * FUNCTION_TIME_SCALE);
const stopClock = recovery.state.cloud.time;
assert.ok(stopClock >= 0.06 && stopClock < 0.07);
assert.equal(
  recovery.state.cloud.particles.length,
  6,
  "only births that actually occurred survive failure",
);
assert.ok(
  recovery.state.cloud.particles.every(
    (electron) => electron.birthTime <= stopClock,
  ),
);
close(recovery.state.emissions.phase, 0);
for (const electron of recovery.state.cloud.particles)
  close(electron.physicalAge, (stopClock - electron.birthTime) * 20e-9);
failDomain = false;
recovery.click("play");
recovery.frame(0.05);
assert.equal(recovery.state.running, true);
close(recovery.state.time, recovery.state.cloud.time * FUNCTION_TIME_SCALE);
assert.equal(
  recovery.state.cloud.particles.length,
  11,
  "resuming adds five fresh births without replaying cancelled future births",
);
assert.equal(
  new Set(recovery.state.cloud.particles.map((electron) => electron.birthTime))
    .size,
  11,
);
for (const electron of recovery.state.cloud.particles)
  close(
    electron.physicalAge,
    (recovery.state.cloud.time - electron.birthTime) * 20e-9,
  );
recovery.state.settings.fireRate = 0;
recovery.step(2);
assert.equal(
  recovery.spots.length,
  11,
  "cancelled future launches never arrive after recovery",
);

console.log(
  "Simulation and controls integration passed: births, repeats, actual arrivals, zero rate, draining flights, repeated manual firing, pause/resume, live fields, misses, restart, and domain-error recovery.",
);
