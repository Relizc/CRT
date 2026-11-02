import { SETTING_RULES } from "./config.js";

// Numeric settings, source controls, transport and view-control event wiring.
export function createControls(simulation, screen, apparatus, onChange) {
  const $ = (id) => document.getElementById(id);
  function readSettings() {
    const next = { ...simulation.settings };
    for (const [id, min, max] of SETTING_RULES) {
      const value = Number($(id).value),
        integer = ["turns", "fireRate"].includes(id);
      if (
        !Number.isFinite(value) ||
        value < min ||
        value > max ||
        (integer && !Number.isInteger(value))
      ) {
        $("settings-error").textContent =
          `${$(id).closest("label").firstChild.textContent.trim()}: enter ${integer ? "an integer" : "a value"} from ${min} to ${max}.`;
        refresh();
        return;
      }
      next[id] = value;
    }
    simulation.settings = next;
    simulation.time = Math.min(simulation.time, next.duration);
    $("time").max = next.duration;
    $("settings-error").textContent = "";
    onChange();
  }
  function refresh() {
    const { sourceMode, running, valid, cloud, impacts } = simulation;
    $("play").innerHTML = running ? "Ⅱ &nbsp; Pause" : "▶ &nbsp; Play";
    $("mode-single").classList.toggle("active", sourceMode === "single");
    $("mode-continuous").classList.toggle(
      "active",
      sourceMode === "continuous",
    );
    $("mode-single").setAttribute(
      "aria-pressed",
      String(sourceMode === "single"),
    );
    $("mode-continuous").setAttribute(
      "aria-pressed",
      String(sourceMode === "continuous"),
    );
    $("fire").disabled =
      sourceMode !== "single" || !valid || !!$("settings-error").textContent;
    $("fireRate").disabled = sourceMode === "single";
    $("play").disabled =
      sourceMode === "single" && cloud.particles.length === 0;
    $("particle-count").textContent = cloud.particles.length.toLocaleString();
    $("impact-count").textContent = impacts.toLocaleString();
  }
  for (const [id] of SETTING_RULES)
    $(id).addEventListener("input", readSettings);
  $("speed").addEventListener(
    "input",
    () =>
      ($("speed-value").textContent =
        `${Number($("speed").value).toFixed(2)}×`),
  );
  ["single", "continuous"].forEach((mode) =>
    $(`mode-${mode}`).addEventListener("click", () => {
      simulation.setSourceMode(mode);
      onChange();
    }),
  );
  $("fire").addEventListener("click", () => {
    if ($("settings-error").textContent) return;
    simulation.fire();
    onChange();
  });
  $("play").addEventListener("click", () => {
    simulation.toggleRunning();
    onChange();
  });
  $("restart").addEventListener("click", () => {
    simulation.restart();
    screen.clear();
    onChange();
  });
  $("clear").addEventListener("click", screen.clear);
  $("clear-paths").addEventListener("click", () => {
    simulation.cloud.clearTrails();
    onChange();
  });
  $("time").addEventListener("input", () => {
    simulation.running = false;
    simulation.time = Number($("time").value);
    onChange();
    screen.update();
  });
  $("export").addEventListener("click", screen.exportPNG);
  $("loop").addEventListener(
    "change",
    () => (simulation.loop = $("loop").checked),
  );
  $("hold").addEventListener(
    "change",
    () => (simulation.hold = $("hold").checked),
  );
  $("glass").addEventListener("change", () =>
    apparatus?.setGlass($("glass").checked),
  );
  $("coils").addEventListener("change", () =>
    apparatus?.coils.setVisible($("coils").checked),
  );
  $("guide").addEventListener("change", onChange);
  document
    .querySelectorAll("[data-view]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        apparatus?.setView(button.dataset.view),
      ),
    );
  return {
    refresh,
    speed: () => Number($("speed").value),
    guideVisible: () => $("guide").checked,
  };
}
