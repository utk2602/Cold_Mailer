const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

let transporter = null;

/**
 * Creates and verifies the Nodemailer SMTP transporter.
 *
 * @param {object} config - { emailUser, emailPass }
 * @returns {Promise<void>}
 */
async function initTransporter(config) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: config.emailUser,
      pass: config.emailPass,
    },
  });

  // Verify connection
  await transporter.verify();
  console.log("[Mailer] SMTP connection verified");
}

/**
 * Sends a single email with retry logic.
 *
 * @param {object} options
 * @param {string} options.to          - Recipient email
 * @param {string} options.subject     - Email subject
 * @param {string} options.html        - Email body HTML
 * @param {string} options.from        - Sender "Name <email>"
 * @param {string} options.replyTo     - Reply-To address
 * @param {string} [options.bcc]       - BCC address
 * @param {string} [options.resumePath]- Path to resume attachment
 * @param {number} [maxRetries=2]      - Max retry attempts (0 = no retries)
 * @returns {Promise<object>} Nodemailer send result
 */
async function sendEmail(options, maxRetries = 2) {
  if (!transporter) {
    throw new Error("Transporter not initialized. Call initTransporter() first.");
  }

  const mailOptions = {
    from: options.from,
    to: options.to,
    replyTo: options.replyTo,
    subject: options.subject,
    html: options.html,
  };

  // BCC yourself
  if (options.bcc) {
    mailOptions.bcc = options.bcc;
  }

  // Attach resume if path is provided and file exists
  if (options.resumePath) {
    const absPath = path.resolve(options.resumePath);
    if (fs.existsSync(absPath)) {
      mailOptions.attachments = [
        {
          filename: path.basename(absPath),
          path: absPath,
        },
      ];
    } else {
      console.warn(`[Mailer] Resume file not found: ${absPath} — sending without attachment`);
    }
  }

  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await transporter.sendMail(mailOptions);
      return result;
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const backoff = Math.pow(2, attempt) * 1000; // 1s, 2s
        console.warn(`  [Retry ${attempt + 1}/${maxRetries}] ${options.to} — waiting ${backoff / 1000}s...`);
        await new Promise((r) => setTimeout(r, backoff));
      }
    }
  }

  throw lastError;
}

module.exports = { initTransporter, sendEmail };
