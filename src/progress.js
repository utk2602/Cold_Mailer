/**
 * Simple progress logger for the send loop.
 * Prints a progress bar and stats to the console.
 */
class ProgressLogger {
  constructor(total) {
    this.total = total;
    this.sent = 0;
    this.failed = 0;
    this.startTime = Date.now();
  }

  recordSent() {
    this.sent++;
  }

  recordFailed() {
    this.failed++;
  }

  get processed() {
    return this.sent + this.failed;
  }

  get remaining() {
    return this.total - this.processed;
  }

  /**
   * Returns a formatted progress string.
   */
  getProgressLine() {
    const pct = Math.round((this.processed / this.total) * 100);
    const barLen = 20;
    const filled = Math.round((this.processed / this.total) * barLen);
    const bar = "█".repeat(filled) + "░".repeat(barLen - filled);

    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(0);
    return `[${bar}] ${pct}% | ${this.processed}/${this.total} | ✓ ${this.sent} ✗ ${this.failed} | ${elapsed}s elapsed`;
  }

  /**
   * Returns a final summary string.
   */
  getSummary() {
    const elapsed = ((Date.now() - this.startTime) / 1000 / 60).toFixed(1);
    const lines = [
      "",
      "=".repeat(50),
      "  SEND COMPLETE",
      "=".repeat(50),
      `  Total processed : ${this.processed}`,
      `  Sent            : ${this.sent}`,
      `  Failed          : ${this.failed}`,
      `  Time elapsed    : ${elapsed} minutes`,
      "=".repeat(50),
    ];
    return lines.join("\n");
  }
}

module.exports = { ProgressLogger };
