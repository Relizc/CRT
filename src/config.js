// Function seconds per playback second; particle physics keeps its own clock.
export const FUNCTION_TIME_SCALE = 0.1;

export const DEFAULT_SETTINGS = Object.freeze({
  voltage: 2000,
  turns: 100,
  gap: 0.02,
  duration: 1,
  persistence: 0.3,
  fireRate: 200,
  brightness: 5,
});
export const SETTING_RULES = [
  ["voltage", 100, 50000],
  ["turns", 1, 1000],
  ["duration", 0.05, 60],
  ["persistence", 0.05, 30],
  ["fireRate", 0, 10000],
  ["brightness", 0, 50],
];
export const PRESETS = {
  circle: ["0.16\\cos(2\\pi t)", "0.18\\sin(2\\pi t)"],
  lissajous: ["0.16\\sin(6\\pi t)", "0.18\\sin(4\\pi t)"],
  heart: [
    "0.16\\sin^{3}(2\\pi t)",
    "0.012(13\\cos(2\\pi t)-5\\cos(4\\pi t)-2\\cos(6\\pi t)-\\cos(8\\pi t))",
  ],
  spiral: ["0.17t\\cos(12\\pi t)", "0.19t\\sin(12\\pi t)"],
  sawtooth: [
    String.raw`0.4(2(t-\lfloor t\rfloor)-1)`,
    String.raw`0.2(2(4t-\lfloor4t\rfloor)-1)`,
  ],
  triangle: [
    String.raw`0.4(2(t-\lfloor t\rfloor)-1)`,
    String.raw`0.2(1-4\left|4t-\lfloor4t\rfloor-0.5\right|)`,
  ],
  smiley: [
    String.raw`\begin{cases}0.58\cos(4.6\pi t)&0\le t<0.5\\-0.2+0.045\cos(40\pi(t-0.54))&0.54\le t<0.64\\0.2+0.045\cos(40\pi(t-0.68))&0.68\le t<0.78\\0.34\cos(\pi+\frac{100\pi}{11}(t-0.839))&0.82\le t<0.98\\2&\text{otherwise}\end{cases}`,
    String.raw`\begin{cases}0.58\sin(4.6\pi t)&0\le t<0.5\\0.2+0.045\sin(40\pi(t-0.54))&0.54\le t<0.64\\0.2+0.045\sin(40\pi(t-0.68))&0.68\le t<0.78\\0.01+0.34\sin(\pi+\frac{100\pi}{11}(t-0.839))&0.82\le t<0.98\\2&\text{otherwise}\end{cases}`,
  ],
};

// Source-on intervals leave enough flight time for each electron to cross
// the coils before the next piecewise stroke changes their currents.
export const SMILEY_EMISSION_WINDOWS = [[0, .45], [.54, .59], [.68, .73], [.82, .93]];
