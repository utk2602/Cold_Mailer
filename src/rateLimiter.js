/**
 * Returns a promise that resolves after a random delay between min and max milliseconds.
 * Used between email sends to avoid spam detection and respect Gmail rate limits.
 *
 * @param {number} minMs - Minimum delay in milliseconds (default: 15000 = 15s)
 * @param {number} maxMs - Maximum delay in milliseconds (default: 30000 = 30s)
 * @returns {Promise<number>} The actual delay used (in ms)
 */
function delay(minMs = 15000, maxMs = 30000) {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => {
    setTimeout(() => resolve(ms), ms);
  });
}

module.exports = { delay };
