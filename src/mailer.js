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
 * Sends a single email.
 *
 * @param {object} options
 * @param {string} options.to          - Recipient email
 * @param {string} options.subject     - Email subject
 * @param {string} options.html        - Email body HTML
 * @param {string} options.from        - Sender "Name <email>"
 * @param {string} options.replyTo     - Reply-To address
 * @param {string} [options.bcc]       - BCC address
 * @param {string} [options.resumePath]- Path to resume attachment
 * @returns {Promise<object>} Nodemailer send result
 */
async function sendEmail(options) {
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

  const result = await transporter.sendMail(mailOptions);
  return result;
}

module.exports = { initTransporter, sendEmail };
