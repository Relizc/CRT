// Current waveforms and the drive-time cursor on the 2D signal plot.
export function createSignalPlot() {
  const $ = (id) => document.getElementById(id);
  let signalData = [],
    signalMaximum = 0.2;
  function rebuild(functions, valid, duration) {
    signalData = [];
    signalMaximum = 0.001;
    if (valid)
      for (let i = 0; i <= 400; i++) {
        const t = (duration * i) / 400;
        const values = functions.map((fn) => {
          try {
            const x = fn(t);
            return Number.isFinite(x) && Math.abs(x) <= 100 ? x : null;
          } catch {
            return null;
          }
        });
        values.forEach((v) => {
          if (v !== null) signalMaximum = Math.max(signalMaximum, Math.abs(v));
        });
        signalData.push(values);
      }
    $("signal-range").textContent = `0 — ${duration} s`;
    $("signal-scale").textContent = `±${signalMaximum.toPrecision(3)} A`;
  }
  function draw(time, duration) {
    const canvas = $("signals"),
      w = canvas.clientWidth,
      h = 74;
    if (!w) return;
    const ratio = Math.min(devicePixelRatio, 2);
    if (canvas.width !== Math.round(w * ratio)) {
      canvas.width = Math.round(w * ratio);
      canvas.height = h * ratio;
    }
    const c = canvas.getContext("2d");
    c.setTransform(ratio, 0, 0, ratio, 0, 0);
    c.clearRect(0, 0, w, h);
    c.strokeStyle = "#dfe4d6";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(0, h / 2);
    c.lineTo(w, h / 2);
    c.stroke();
    ["#bd744c", "#608dbe"].forEach((color, axis) => {
      c.strokeStyle = color;
      c.lineWidth = 1.3;
      c.beginPath();
      let pen = false;
      signalData.forEach((values, index) => {
        const value = values[axis];
        if (value === null) {
          pen = false;
          return;
        }
        const x = (index / 400) * w,
          y = h / 2 - (value / signalMaximum) * (h / 2 - 7);
        if (pen) c.lineTo(x, y);
        else c.moveTo(x, y);
        pen = true;
      });
      c.stroke();
    });
    const x = (time / duration) * w;
    c.strokeStyle = "#375c39";
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, h);
    c.stroke();
  }
  return { rebuild, draw };
}
