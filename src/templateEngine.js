const fs = require("fs");
const path = require("path");
const Handlebars = require("handlebars");

const TEMPLATES_DIR = path.join(__dirname, "..", "templates");

let bodyTemplate = null;
let subjectTemplate = null;

/**
 * Loads and compiles the email templates from disk.
 * Call once at startup.
 */
function loadTemplates() {
  const bodyPath = path.join(TEMPLATES_DIR, "internship.html");
  const subjectPath = path.join(TEMPLATES_DIR, "subject.txt");

  if (!fs.existsSync(bodyPath)) {
    throw new Error(`Email body template not found: ${bodyPath}`);
  }
  if (!fs.existsSync(subjectPath)) {
    throw new Error(`Subject template not found: ${subjectPath}`);
  }

  bodyTemplate = Handlebars.compile(fs.readFileSync(bodyPath, "utf-8"));
  subjectTemplate = Handlebars.compile(
    fs.readFileSync(subjectPath, "utf-8").trim()
  );

  console.log("[Template] Loaded email templates");
}

/**
 * Renders the email body and subject for a single contact.
 *
 * @param {object} contact - { personName, company, email, sn }
 * @param {object} config  - { senderName, role }
 * @returns {{ subject: string, html: string }}
 */
function renderEmail(contact, config) {
  if (!bodyTemplate || !subjectTemplate) {
    throw new Error("Templates not loaded. Call loadTemplates() first.");
  }

  const data = {
    personName: contact.personName,
    company: contact.company,
    senderName: config.senderName,
    role: config.role,
  };

  return {
    subject: subjectTemplate(data),
    html: bodyTemplate(data),
  };
}

module.exports = { loadTemplates, renderEmail };
