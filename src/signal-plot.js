// Pure waveform sampling is shared by the controller and the canvas renderer.
export function sampleSignals(functions, valid, duration) {
  const data = [];
  let maximum = 0.001;
  if (valid) for (let i = 0; i <= 400; i++) {
    const t = duration * i / 400;
    const values = functions.map(fn => {
      try {
        const value = fn(t);
        return Number.isFinite(value) && Math.abs(value) <= 100 ? value : null;
      } catch { return null; }
    });
    values.forEach(value => { if (value !== null) maximum = Math.max(maximum, Math.abs(value)); });
    data.push(values);
  }
  return { data, maximum };
}

export function createSignalPlot(canvas) {
  function draw(data, maximum, time, duration) {
    const w = canvas.clientWidth, h = 74;
    if (!w) return;
    const ratio = Math.min(devicePixelRatio, 2);
    if (canvas.width !== Math.round(w * ratio)) {
      canvas.width = Math.round(w * ratio); canvas.height = h * ratio;
    }
    const c = canvas.getContext("2d");
    c.setTransform(ratio, 0, 0, ratio, 0, 0); c.clearRect(0, 0, w, h);
    c.strokeStyle = "#dfe4d6"; c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.stroke();
    ["#bd744c", "#608dbe"].forEach((color, axis) => {
      c.strokeStyle = color; c.lineWidth = 1.3; c.beginPath(); let pen = false;
      data.forEach((values, index) => {
        const value = values[axis];
        if (value === null) { pen = false; return; }
        const x = index / 400 * w, y = h / 2 - value / maximum * (h / 2 - 7);
        if (pen) c.lineTo(x, y); else c.moveTo(x, y);
        pen = true;
      });
      c.stroke();
    });
    const x = time / duration * w;
    c.strokeStyle = "#375c39"; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke();
  }
  return { draw };
}
