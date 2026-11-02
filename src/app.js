import { Simulation } from "./simulation.js";
import { createPhosphorScreen } from "./phosphor-screen.js";
import { createApparatus } from "./apparatus.js";
import { createControls } from "./controls.js";
import { createEquationEditor } from "./equations.js";
import { createSignalPlot } from "./signal-plot.js";
import { updateTelemetry } from "./telemetry.js";

// Composition root: connect the components and run the shared animation clock.
const $ = (id) => document.getElementById(id);
const simulation = new Simulation((hit, fade) => screen.illuminate(hit, fade));
const screen = createPhosphorScreen(
  $("screen"),
  $("screen-grid"),
  () => simulation.settings,
);
const signals = createSignalPlot();
let apparatus;
try {
  apparatus = createApparatus($("viewport"), screen.canvas);
} catch (error) {
  $("loading").textContent =
    "3D view requires a browser with WebGL. The equations and calibrated phosphor screen still work.";
  console.error("Three.js initialization:", error);
}
const controls = createControls(simulation, screen, apparatus, changed);
const equations = createEquationEditor(simulation, changed);
let currents = { ix: 0, iy: 0 },
  lastStamp,
  lastTelemetry = 0;

function refresh() {
  let present;
  if (simulation.valid) {
    try {
      present = simulation.evaluateCurrents(simulation.time);
    } catch (error) {
      simulation.lastPhysicsError = error.message;
      simulation.running = false;
    }
  }
  if (present) {
    currents = present;
    apparatus?.coils.setCurrents(present.ix, present.iy);
    apparatus?.guide.update(
      present.ix,
      present.iy,
      simulation.settings,
      controls.guideVisible(),
    );
  } else apparatus?.guide.hide();
  controls.refresh();
  updateTelemetry(simulation, present);
  signals.draw(simulation.time, simulation.settings.duration);
  apparatus?.particles.update(
    simulation.cloud.particles,
    simulation.cloud.completedShots,
  );
}
function changed() {
  signals.rebuild(
    simulation.functions,
    simulation.valid,
    simulation.settings.duration,
  );
  refresh();
}
function animate(stamp) {
  requestAnimationFrame(animate);
  const wallDelta =
    lastStamp === undefined ? 0 : Math.min((stamp - lastStamp) / 1000, 0.05);
  lastStamp = stamp;
  const delta = wallDelta * controls.speed();
  if (!simulation.hold) screen.decay(delta);
  simulation.tick(delta);
  if (stamp - lastTelemetry > 32) {
    refresh();
    lastTelemetry = stamp;
  }
  screen.update();
  apparatus?.coils.animate(
    delta,
    currents.ix,
    currents.iy,
    simulation.running,
    simulation.valid,
  );
  apparatus?.render();
}
document.addEventListener("visibilitychange", () => {
  lastStamp = undefined;
});
equations.setPreset("circle");
requestAnimationFrame(animate);
