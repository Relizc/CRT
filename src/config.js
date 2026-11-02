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
};
