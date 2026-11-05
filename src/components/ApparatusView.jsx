const views = { perspective: "Perspective", magnets: "Coils", top: "Top", front: "Front" };
export function ApparatusView({ state, graphics, viewportRef, act }) {
  return <>
    <div className="viewport" id="viewport">
      <div className="apparatus-canvas" ref={viewportRef} />
      <div className="view-top"><div className="view-buttons">
        {Object.entries(views).map(([name, label]) => <button key={name} data-view={name} onClick={() => act("setView", name)}>{label}</button>)}
      </div></div>
      {!graphics.ready && <div className="loading" id="loading" role="status">{graphics.error || "Starting electron optics…"}</div>}
      <div className="view-bottom" />
    </div>
    <div className="particle-summary"><span><b id="particle-count">{state.activeParticles.toLocaleString()}</b> e-</span><span><b id="impact-count">{state.impacts.toLocaleString()}</b> hits</span></div>
    <div className="timeline">
      <label htmlFor="time">t</label><input id="time" type="range" min="0" max={state.settings.duration} step="0.0001" value={state.time} onChange={event => act("seek", Number(event.target.value))} /><output id="time-value">{state.time.toFixed(3)} s</output>
    </div>
  </>;
}
