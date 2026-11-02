// Phosphor grid, impact exposure, complete decay, compositing and PNG export.
export function createPhosphorScreen(screen, grid, getSettings) {
  const ctx = screen.getContext("2d", { willReadFrequently: true });
  const gridCtx = grid.getContext("2d");
  const decayRemainders = new Float32Array(screen.width * screen.height);
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = textureCanvas.height = 900;
  const textureContext = textureCanvas.getContext("2d");
  function drawGrid() {
    const c = gridCtx,
      size = 900,
      pad = 0;
    c.fillStyle = "#07120b";
    c.fillRect(0, 0, size, size);
    for (let cm = -15; cm <= 15; cm++) {
      const pos = ((cm + 15) / 30) * size;
      c.strokeStyle =
        cm === 0 ? "#355b35" : cm % 5 === 0 ? "#203c25" : "#112718";
      c.lineWidth = cm === 0 ? 2 : 1;
      c.beginPath();
      c.moveTo(pos, pad);
      c.lineTo(pos, size - pad);
      c.moveTo(pad, pos);
      c.lineTo(size - pad, pos);
      c.stroke();
    }
    c.fillStyle = "#65805c";
    c.font = "20px ui-monospace, monospace";
    c.textAlign = "center";
    for (let cm = -10; cm <= 10; cm += 5) {
      if (!cm) continue;
      c.fillText(`${cm > 0 ? "+" : "−"}${Math.abs(cm)}`, (cm + 15) * 30, 477);
      c.fillText(
        `${cm > 0 ? "+" : "−"}${Math.abs(cm)}`,
        484,
        (15 - cm) * 30 + 7,
      );
    }
    c.fillStyle = "#88a277";
    c.font = "19px ui-monospace, monospace";
    c.fillText("x / cm", 826, 432);
    c.fillText("y / cm", 503, 32);
    const vignette = c.createRadialGradient(450, 450, 200, 450, 450, 620);
    vignette.addColorStop(0, "#00000000");
    vignette.addColorStop(1, "#000a");
    c.fillStyle = vignette;
    c.fillRect(0, 0, size, size);
  }
  drawGrid();
  function clearScreen() {
    ctx.clearRect(0, 0, 900, 900);
    decayRemainders.fill(0);
  }
  function decayScreen(delta) {
    if (delta <= 0) return;
    const settings = getSettings();
    const image = ctx.getImageData(0, 0, screen.width, screen.height);
    const pixels = image.data,
      fraction = -Math.expm1(-delta / settings.persistence);
    // Carry fractional alpha loss between frames so 8-bit rounding cannot leave a permanent glow.
    for (let i = 3, pixel = 0; i < pixels.length; i += 4, pixel++) {
      if (!pixels[i]) {
        decayRemainders[pixel] = 0;
        continue;
      }
      const loss = pixels[i] * fraction + decayRemainders[pixel];
      const removed = Math.min(pixels[i], Math.floor(loss));
      pixels[i] -= removed;
      decayRemainders[pixel] = pixels[i] ? loss - removed : 0;
    }
    ctx.putImageData(image, 0, 0);
  }
  function illuminate(result, fade = 1) {
    const settings = getSettings();
    const brightness = settings.brightness * fade;
    if (!result.hit || brightness <= 0) return;
    const x = ((result.x + 0.15) / 0.3) * 900,
      y = ((0.15 - result.y) / 0.3) * 900;
    ctx.globalCompositeOperation = "lighter";
    // Exposure raises the core and halo smoothly without overflowing canvas alpha.
    const opacity = (base) => -Math.expm1(Math.log1p(-base) * brightness);
    const glow = ctx.createRadialGradient(x, y, 0, x, y, 16);
    glow.addColorStop(0, `rgba(218,255,164,${opacity(0.45)})`);
    glow.addColorStop(0.28, `rgba(126,250,105,${opacity(0.18)})`);
    glow.addColorStop(0.5, `rgba(91,230,80,${opacity(0.02)})`);
    glow.addColorStop(1, "rgba(91,230,80,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - 16, y - 16, 32, 32);
    ctx.globalCompositeOperation = "source-over";
  }
  function updateTexture() {
    textureContext.drawImage(grid, 0, 0);
    textureContext.drawImage(screen, 0, 0);
  }
  function exportPNG() {
    updateTexture();
    const a = document.createElement("a");
    a.href = textureCanvas.toDataURL("image/png");
    a.download = "CRT-phosphor-screen.png";
    a.click();
  }
  return {
    canvas: textureCanvas,
    clear: clearScreen,
    decay: decayScreen,
    illuminate,
    update: updateTexture,
    exportPNG,
  };
}
