import { getTelemetry } from "../telemetry.js";

export function TelemetryPanel({ state, signalRef }) {
  const metrics = getTelemetry(state);
  return <div className="readouts">
    <div className="status" role="status" style={{ display: "none" }}>{metrics.status}</div>
    <div className="metrics">
      <div className="metric"><div className="label">impact x</div><div className="value"><span id="position-x">{metrics.positionX}</span><small>cm</small></div></div>
      <div className="metric"><div className="label">impact y</div><div className="value"><span id="position-y">{metrics.positionY}</span><small>cm</small></div></div>
      <div className="metric"><div className="label">e- velocity (very close to c)</div><div className="value"><span id="beam-speed">{metrics.speed}</span><small>m/s</small></div></div>
      <div className="metric"><div className="label">flight time of e-</div><div className="value"><span id="flight-time">{metrics.flightTime}</span><small>ns</small></div></div>
    </div>
    <div className="signal-wrap">
      <div className="signal-header"><span>current in amps</span><span id="signal-range">0 — {state.settings.duration} s</span></div>
      <canvas id="signals" ref={signalRef} aria-label="Current functions over one repeat interval" />
      <div className="signal-legend"><span>red = Iₓ(t)</span><span>blue = Iᵧ(t)</span><span id="signal-scale">±{state.signalMaximum.toPrecision(3)} A</span></div>
    </div>
  </div>;
}
