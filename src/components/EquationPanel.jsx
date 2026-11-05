import { PRESETS } from "../config.js";
import { MathInput } from "./MathInput.jsx";

const labels = { circle: "Circle", lissajous: "Lissajous", heart: "Heart", spiral: "Spiral", smiley: "Smiley face", sawtooth: "Sawtooth", triangle: "Triangle" };
export function EquationPanel({ state, act }) {
  return <>
    <p>pick one</p>
    <p>Function time: 0.1 s per playback second.</p>
    <div className="presets" aria-label="Equation presets">
      {Object.keys(PRESETS).map(name => <button key={name} data-preset={name} className={state.activePreset === name ? "active" : ""} aria-pressed={state.activePreset === name} onClick={() => act("selectPreset", name)}>{labels[name]}</button>)}
    </div>
    {["x", "y"].map((axis, index) => <div key={axis} className="equation-card" id={`card-${axis}`}>
      <div className="eq-top">{index === 0 ? "Enter function for horizontal" : <><label htmlFor="eq-y">Vertical coil</label><span className="unit">AMPERES</span></>}</div>
      <div className="equation-row">
        <span className="eq-label">I<sub>{axis}</sub>(t) =</span>
        <MathInput axis={axis} value={state.equations[index]} onChange={value => act("editEquation", index, value)} />
      </div>
      <div className="eq-error" id={`error-${axis}`} role="alert">{state.equationErrors[index]}</div>
    </div>)}
  </>;
}
