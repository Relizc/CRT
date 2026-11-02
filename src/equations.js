import { MathfieldElement } from "mathlive";
import { compileExpression } from "./equation-parser.js";
import { PRESETS } from "./config.js";

// MathLive fields, LaTeX validation and equation presets.
export function createEquationEditor(simulation, onChange) {
  const $ = (id) => document.getElementById(id);
  MathfieldElement.fontsDirectory = null;
  MathfieldElement.soundsDirectory = null;
  const fields = ["x", "y"].map((axis) => {
    const field = new MathfieldElement();
    field.id = `eq-${axis}`;
    field.setAttribute(
      "aria-label",
      `${axis === "x" ? "Horizontal" : "Vertical"} coil current in amperes as a function of t`,
    );
    field.mathVirtualKeyboardPolicy = "manual";
    field.smartFence = true;
    $(`field-${axis}`).append(field);
    return field;
  });
  function validate() {
    const next = [];
    let ok = true;
    fields.forEach((field, index) => {
      const axis = index ? "y" : "x";
      try {
        next.push(compileExpression(field.value));
        $(`error-${axis}`).textContent = "";
        $(`card-${axis}`).classList.remove("invalid");
      } catch (error) {
        ok = false;
        next.push(null);
        $(`error-${axis}`).textContent = error.message;
        $(`card-${axis}`).classList.add("invalid");
      }
    });
    simulation.functions = next;
    simulation.valid = ok;
    if (!ok) simulation.running = false;
    onChange();
  }
  function setPreset(name) {
    fields.forEach((field, i) => (field.value = PRESETS[name][i]));
    document
      .querySelectorAll("[data-preset]")
      .forEach((button) =>
        button.classList.toggle("active", button.dataset.preset === name),
      );
    simulation.settings.duration = 1;
    $("duration").value = 1;
    $("time").max = 1;
    simulation.time = 0;
    validate();
  }
  fields.forEach((field) =>
    field.addEventListener("input", () => {
      document
        .querySelectorAll("[data-preset]")
        .forEach((button) => button.classList.remove("active"));
      validate();
    }),
  );
  document
    .querySelectorAll("[data-preset]")
    .forEach((button) =>
      button.addEventListener("click", () => setPreset(button.dataset.preset)),
    );
  return { setPreset };
}
