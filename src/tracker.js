const fs = require("fs");
const path = require("path");

const LOG_FILE = path.join(__dirname, "..", "send-log.csv");
const CSV_HEADER = "sn,email,company,status,timestamp,error";

/**
 * Loads already-sent emails from send-log.csv.
 * Returns a Set of email addresses that were successfully sent.
 */
function loadSentEmails() {
  const sent = new Set();
  if (!fs.existsSync(LOG_FILE)) return sent;

  const lines = fs.readFileSync(LOG_FILE, "utf-8").split("\n");
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(",");
    // parts: sn, email, company, status, timestamp, error
    const email = parts[1];
    const status = parts[3];
    if (status === "sent") {
      sent.add(email);
    }
  }
  return sent;
}

/**
 * Ensures the CSV log file exists with headers.
 */
function initLog() {
  if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, CSV_HEADER + "\n", "utf-8");
    console.log("[Tracker] Created send-log.csv");
  } else {
    console.log(`[Tracker] Loaded send-log.csv`);
  }
}

/**
 * Appends a send result to the CSV log.
 *
 * @param {object} contact - { sn, email, company }
 * @param {string} status - "sent" or "failed"
 * @param {string} [error] - Error message if failed
 */
function logSend(contact, status, error = "") {
  const timestamp = new Date().toISOString();
  // Escape commas in company name and error
  const safeCompany = String(contact.company).replace(/,/g, ";");
  const safeError = String(error).replace(/,/g, ";").replace(/\n/g, " ");
  const line = `${contact.sn},${contact.email},${safeCompany},${status},${timestamp},${safeError}\n`;
  fs.appendFileSync(LOG_FILE, line, "utf-8");
}

module.exports = { loadSentEmails, initLog, logSend };
