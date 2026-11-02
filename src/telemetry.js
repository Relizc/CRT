import { beamProperties, coilFields } from "./physics.js";

const signed = (number, digits = 3) =>
  `${number < 0 ? "−" : "+"}${Math.abs(number).toFixed(digits)}`;
const arrivalText = (status) =>
  ({
    screen: "Screen impact · electron absorbed",
    returned: "Electron returned to the source",
    "outside-screen": "Electron missed the active screen",
    escaped: "Electron left the tracking volume",
  })[status] || status;

// SI readouts and human-readable source / particle status.
export function updateTelemetry(simulation, currents) {
  const $ = (id) => document.getElementById(id);
  const {
    settings,
    time,
    running,
    valid,
    cloud,
    sourceMode,
    lastArrival,
    lastPhysicsError,
  } = simulation;
  $("time").value = time;
  $("time-value").textContent = `${time.toFixed(3)} s`;
  if (!valid) {
    updateStatus("Equation needs attention", true);
    return;
  }
  if (!currents) {
    updateStatus(lastPhysicsError, true);
    return;
  }
  const { ix, iy } = currents,
    { bx, by } = coilFields(ix, iy, settings);
  $("current-x").textContent = `${signed(ix)} A`;
  $("current-y").textContent = `${signed(iy)} A`;
  $("field-value-x").textContent = `Bᵧ ${signed(by * 1000)} mT`;
  $("field-value-y").textContent = `Bₓ ${signed(bx * 1000)} mT`;
  $("position-x").textContent = lastArrival?.hit
    ? signed(lastArrival.x * 100, 2)
    : "—";
  $("position-y").textContent = lastArrival?.hit
    ? signed(lastArrival.y * 100, 2)
    : "—";
  const active = cloud.particles[0],
    count = cloud.particles.length;
  $("beam-speed").textContent =
    `${((active?.speed ?? beamProperties(settings.voltage).speed) / 1e7).toFixed(3)}e7`;
  $("flight-time").textContent = (
    (active?.physicalAge ?? lastArrival?.flightTime ?? 0) * 1e9
  ).toFixed(2);
  let status =
    sourceMode === "single"
      ? count
        ? "Single electron · live position and velocity"
        : lastArrival
          ? arrivalText(lastArrival.status)
          : "Ready · fire one electron"
      : `${running ? "Continuous emission" : "Paused"} · ${count.toLocaleString()} electrons in flight`;
  if (!running && count)
    status = `Paused · ${count.toLocaleString()} ${count === 1 ? "electron" : "electrons"} in flight`;
  if (sourceMode === "continuous" && settings.fireRate === 0)
    status = `Source off · ${count.toLocaleString()} electrons still in flight`;
  updateStatus(lastPhysicsError || status, !!lastPhysicsError);
}
function updateStatus(text, warning) {
  document.getElementById("status-text").textContent = text;
  document.getElementById("status").classList.toggle("warn", warning);
}
