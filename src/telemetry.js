import { beamProperties } from "./physics.js";
const signed = (number, digits = 2) => `${number < 0 ? "−" : "+"}${Math.abs(number).toFixed(digits)}`;
const arrivalText = status => ({ screen: "Screen impact · electron absorbed", returned: "Electron returned to the source", "outside-screen": "Electron missed the active screen", escaped: "Electron left the tracking volume" })[status] || status;

// Format readouts without mutating any UI or simulation state.
export function getTelemetry(state) {
  const { activeElectron, lastArrival, activeParticles: count, sourceMode, running, settings } = state;
  let status = sourceMode === "single"
    ? count ? "Single electron · live position and velocity" : lastArrival ? arrivalText(lastArrival.status) : "Ready · fire one electron"
    : `${running ? "Continuous emission" : "Paused"} · ${count.toLocaleString()} electrons in flight`;
  if (!running && count) status = `Paused · ${count.toLocaleString()} ${count === 1 ? "electron" : "electrons"} in flight`;
  if (sourceMode === "continuous" && settings.fireRate === 0) status = `Source off · ${count.toLocaleString()} electrons still in flight`;
  if (!state.valid) status = "Equation needs attention";
  return {
    positionX: lastArrival?.hit ? signed(lastArrival.x * 100) : "—",
    positionY: lastArrival?.hit ? signed(lastArrival.y * 100) : "—",
    speed: `${((activeElectron?.speed ?? beamProperties(settings.voltage).speed) / 1e7).toFixed(3)}e7`,
    flightTime: ((activeElectron?.physicalAge ?? lastArrival?.flightTime ?? 0) * 1e9).toFixed(2),
    status: state.physicsError || status,
  };
}
