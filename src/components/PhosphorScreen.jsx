export function PhosphorScreen({ screenRef, gridRef, onExport }) {
  return <div className="screen-shell">
    <div className="screen-well">
      <canvas id="screen-grid" ref={gridRef} width="900" height="900" aria-hidden="true" />
      <canvas id="screen" ref={screenRef} width="900" height="900" aria-label="Electron impact trace on a 30 by 30 centimetre phosphor screen" />
    </div>
    <div className="screen-bezel"><button id="export" title="Save a PNG of the phosphor screen" onClick={onExport}>Save as image</button></div>
  </div>;
}
