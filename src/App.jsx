import { useCrtLab } from "./hooks/useCrtLab.js";
import { EquationPanel } from "./components/EquationPanel.jsx";
import { BeamControls } from "./components/BeamControls.jsx";
import { ApparatusView } from "./components/ApparatusView.jsx";
import { PhosphorScreen } from "./components/PhosphorScreen.jsx";
import { TelemetryPanel } from "./components/TelemetryPanel.jsx";

export default function App() {
  const { state, graphics, act, refs, exportPNG } = useCrtLab();
  return <main className="app">
    <aside><EquationPanel state={state} act={act} /><BeamControls state={state} act={act} /></aside>
    <section className="workbench" aria-label="CRT simulation">
      <ApparatusView state={state} graphics={graphics} viewportRef={refs.viewport} act={act} />
      <div className="lower">
        <PhosphorScreen screenRef={refs.screenCanvas} gridRef={refs.gridCanvas} onExport={exportPNG} />
        <TelemetryPanel state={state} signalRef={refs.signalCanvas} />
      </div>
    </section>
  </main>;
}
