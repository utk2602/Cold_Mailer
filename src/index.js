require("dotenv").config();

const { readExcel } = require("./readExcel");
const { loadTemplates, renderEmail } = require("./templateEngine");
const { initTransporter, sendEmail } = require("./mailer");
const { loadSentEmails, initLog, logSend } = require("./tracker");
const { delay } = require("./rateLimiter");
const { ProgressLogger } = require("./progress");

// --------------- CLI argument parsing ---------------
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    dryRun: false,
    limit: Infinity,
    startFrom: 1,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--dry-run":
        opts.dryRun = true;
        break;
      case "--limit":
        opts.limit = parseInt(args[++i], 10);
        break;
      case "--start-from":
        opts.startFrom = parseInt(args[++i], 10);
        break;
    }
  }

  return opts;
}

// --------------- Config from .env ---------------
function loadConfig() {
  const required = ["EMAIL_USER", "EMAIL_PASS", "SENDER_NAME", "ROLE"];
  for (const key of required) {
    if (!process.env[key]) {
      console.error(`[Config] Missing required env var: ${key}`);
      console.error(
        "Copy .env.example to .env and fill in your values."
      );
      process.exit(1);
    }
  }

  return {
    emailUser: process.env.EMAIL_USER,
    emailPass: process.env.EMAIL_PASS,
    replyTo: process.env.REPLY_TO || process.env.EMAIL_USER,
    bccSelf: process.env.BCC_SELF || "",
    senderName: process.env.SENDER_NAME,
    role: process.env.ROLE,
    excelFile: process.env.EXCEL_FILE || "HR Reachout List.xlsx",
    resumePath: process.env.RESUME_PATH || "",
  };
}

// --------------- Main ---------------
async function main() {
  const opts = parseArgs();
  const config = loadConfig();

  console.log("=".repeat(50));
  console.log("  Cold Mailer — Internship Outreach");
  console.log("=".repeat(50));
  if (opts.dryRun) {
    console.log("*** DRY RUN MODE — no emails will be sent ***\n");
  }

  // 1. Load templates
  loadTemplates();

  // 2. Read Excel
  const contacts = readExcel(config.excelFile);

  // 3. Load send log to skip already-sent
  initLog();
  const alreadySent = loadSentEmails();
  if (alreadySent.size > 0) {
    console.log(`[Tracker] ${alreadySent.size} emails already sent — will skip`);
  }

  // 4. Filter contacts
  let toSend = contacts.filter((c) => {
    if (alreadySent.has(c.email)) return false;
    if (c.sn < opts.startFrom) return false;
    return true;
  });

  if (opts.limit !== Infinity) {
    toSend = toSend.slice(0, opts.limit);
  }

  console.log(`\n[Plan] Will process ${toSend.length} emails\n`);

  if (toSend.length === 0) {
    console.log("Nothing to send. All contacts already emailed or filtered out.");
    return;
  }

  // 5. Initialize SMTP (skip in dry-run)
  if (!opts.dryRun) {
    try {
      await initTransporter({
        emailUser: config.emailUser,
        emailPass: config.emailPass,
      });
    } catch (err) {
      console.error("[Mailer] SMTP connection failed:", err.message);
      console.error(
        "Check your EMAIL_USER and EMAIL_PASS in .env (use Gmail App Password)."
      );
      process.exit(1);
    }
  }

  // 6. Send loop with progress tracking
  const progress = new ProgressLogger(toSend.length);
  const fromField = `${config.senderName} <${config.emailUser}>`;

  for (let i = 0; i < toSend.length; i++) {
    const contact = toSend[i];
    const { subject, html } = renderEmail(contact, config);

    if (opts.dryRun) {
      console.log(`[DRY RUN] (${i + 1}/${toSend.length}) To: ${contact.email}`);
      console.log(`  Subject: ${subject}`);
      console.log(`  Company: ${contact.company} | Person: ${contact.personName}`);
      console.log("");
      progress.recordSent();
      continue;
    }

    try {
      await sendEmail({
        to: contact.email,
        subject,
        html,
        from: fromField,
        replyTo: config.replyTo,
        bcc: config.bccSelf,
        resumePath: config.resumePath,
      });

      logSend(contact, "sent");
      progress.recordSent();
      console.log(
        `  ✓ ${contact.email} (${contact.company})`
      );
    } catch (err) {
      logSend(contact, "failed", err.message);
      progress.recordFailed();
      console.error(
        `  ✗ ${contact.email}: ${err.message}`
      );
    }

    console.log(progress.getProgressLine());

    // Rate limit: wait between sends (skip delay after last email)
    if (i < toSend.length - 1) {
      const waited = await delay();
      console.log(`  Waited ${(waited / 1000).toFixed(1)}s before next send`);
    }
  }

  // 7. Summary
  console.log(progress.getSummary());
  if (!opts.dryRun) {
    console.log("  Check send-log.csv for full details\n");
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
