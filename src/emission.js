// Phase measures progress toward the next electron, independently of the rate.
// Intervals include their right endpoint, so adjacent intervals cannot duplicate it.
export class EmissionScheduler {
  constructor() {
    this.reset();
  }

  reset() {
    this.phase = 0;
  }

  advanceEmission(delta, rate, emit) {
    if (!Number.isFinite(delta) || delta < 0)
      throw new RangeError(
        "Emission elapsed time must be finite and nonnegative.",
      );
    if (!Number.isFinite(rate) || rate < 0 || rate > 10000)
      throw new RangeError(
        "Electron rate must be between 0 and 10,000 per simulation second.",
      );
    if (delta === 0 || rate === 0) return 0;

    const startPhase = this.phase;
    const total = startPhase + delta * rate;
    // Snap tiny accumulation errors at a boundary, including low-rate emissions.
    const count = Math.floor(total + 1e-10);
    if (!Number.isSafeInteger(count))
      throw new RangeError("Emission interval is too large.");

    this.phase = Math.max(0, total - count);
    for (let index = 0; index < count; index++) {
      emit(Math.min(delta, (1 - startPhase + index) / rate));
    }
    return count;
  }
}
