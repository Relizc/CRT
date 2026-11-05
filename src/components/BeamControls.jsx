import { SETTING_RULES } from "../config.js";

const fields = {
  voltage: ["Voltage", "V", 100], turns: ["Turns per coil", "N", 1],
  duration: ["repeat interval", "s", 0.1], persistence: ["Phosphor decay", "s", 0.1],
  fireRate: ["e- fire rate", "electrons/s", 1], brightness: ["Impact brightness", "×", 0.5],
};
export function BeamControls({ state, act }) {
  const toggle = (name, checked) => act("setOption", name, checked);
  return <>
    <div className="section-title">Electron source</div>
    <div className="presets source-modes" role="group" aria-label="Electron source mode">
      <button id="mode-single" aria-pressed={state.sourceMode === "single"} className={state.sourceMode === "single" ? "active" : ""} onClick={() => act("setSourceMode", "single")}>One electron</button>
      <button id="mode-continuous" aria-pressed={state.sourceMode === "continuous"} className={state.sourceMode === "continuous" ? "active" : ""} onClick={() => act("setSourceMode", "continuous")}>Lots</button>
    </div>
    <button id="fire" className="primary" disabled={!state.canFire} onClick={() => act("fire")}>Shott one</button>
    <button id="clear-paths" onClick={() => act("clearPaths")}>Clear paths</button>
    <div className="number-grid">
      {SETTING_RULES.map(([id, min, max]) => {
        const [label, unit, step] = fields[id];
        return <label className="number-field" htmlFor={id} key={id} style={id === "voltage" || id === "turns" ? { display: "none" } : undefined}>
          {label}<div className="input-wrap"><input id={id} type="number" min={min} max={max} step={step} value={state.rawSettings[id]} disabled={id === "fireRate" && state.sourceMode === "single"} onChange={event => act("setSetting", id, event.target.value)} />{unit}</div>
        </label>;
      })}
    </div>
    <p id="settings-error" className="input-error" role="alert">{state.settingsError}</p>
    <div className="range-row">
      <div className="range-label"><label htmlFor="speed">Playback speed</label><output id="speed-value">{state.options.speed.toFixed(2)}×</output></div>
      <input id="speed" type="range" min="0.05" max="2" step="0.05" value={state.options.speed} onChange={event => act("setOption", "speed", Number(event.target.value))} />
    </div>
    <div className="toggles">
      <label><input id="loop" type="checkbox" checked={state.loop} onChange={event => toggle("loop", event.target.checked)} /> Repeat</label>
      <label><input id="hold" type="checkbox" checked={state.hold} onChange={event => toggle("hold", event.target.checked)} /> Hold trace</label>
      <label><input id="glass" type="checkbox" checked={state.options.glass} onChange={event => toggle("glass", event.target.checked)} /> Glass</label>
      <label><input id="coils" type="checkbox" checked={state.options.coils} onChange={event => toggle("coils", event.target.checked)} /> Show coils</label>
    </div>
    <div className="transport">
      <button className="primary" id="play" disabled={!state.canPlay} onClick={() => act("toggleRunning")}>{state.running ? "Ⅱ Pause" : "▶ Play"}</button>
      <button id="restart" title="Restart time and clear screen" onClick={() => act("restart")}>↺ Restart</button>
      <button id="clear" title="Clear phosphor screen" onClick={() => act("clearScreen")}>Clear</button>
    </div>
    <div className="toggles"><label><input id="guide" type="checkbox" checked={state.options.guide} onChange={event => toggle("guide", event.target.checked)} /> Instantaneous guide ray</label></div>
  </>;
}
