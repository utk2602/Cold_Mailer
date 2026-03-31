const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");

// Basic email regex for validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Reads the Excel file and returns an array of contact objects.
 * Auto-detects the header row by scanning for "Email" in any cell.
 *
 * @param {string} filePath - Path to the Excel file
 * @returns {Array<{sn: number, company: string, email: string, personName: string}>}
 */
function readExcel(filePath) {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Excel file not found: ${absolutePath}`);
  }
  const workbook = XLSX.readFile(absolutePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Find the header row — look for a row containing "Email", "Company" AND "Person Name" or "Sr"
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(rawData.length, 30); i++) {
    const row = rawData[i];
    if (!Array.isArray(row)) continue;
    const cells = row.map((c) => String(c || "").trim().toLowerCase().replace(/[\n\r]+/g, " "));
    const hasEmail = cells.includes("email");
    const hasCompany = cells.includes("company");
    const hasName = cells.some((c) => c === "person name" || c === "name" || c === "contact name");
    const hasSr = cells.some((c) => c.includes("sr") && c.includes("no"));
    // Require at least email + company + one more identifying column
    if (hasEmail && hasCompany && (hasName || hasSr)) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    throw new Error(
      'Could not find header row with "Email" and "Company" columns in the Excel file.'
    );
  }

  const headerRow = rawData[headerRowIndex];
  const headers = [];
  for (let c = 0; c < headerRow.length; c++) {
    const val = headerRow[c];
    headers.push(
      val != null
        ? String(val).trim().toLowerCase().replace(/[\n\r]+/g, " ")
        : ""
    );
  }

  // Map column indices
  const emailIdx = headers.findIndex((h) => h === "email");
  const companyIdx = headers.findIndex((h) => h === "company");
  const nameIdx = headers.findIndex(
    (h) => h === "person name" || h === "name" || h === "contact name"
  );
  const snIdx = headers.findIndex(
    (h) => h.includes("sr") || h.includes("serial") || h.includes("no")
  );

  if (emailIdx === -1) {
    throw new Error('Could not find "Email" column in the Excel file.');
  }

  const contacts = [];
  const seenEmails = new Set();
  let skippedNoEmail = 0;
  let skippedDuplicate = 0;

  for (let i = headerRowIndex + 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!Array.isArray(row) || row.length === 0) continue;

    const email = String(row[emailIdx] || "").trim().toLowerCase();

    // Skip rows with missing or invalid email
    if (!email || !EMAIL_REGEX.test(email)) {
      if (row[companyIdx]) skippedNoEmail++;
      continue;
    }

    // Skip duplicate emails
    if (seenEmails.has(email)) {
      skippedDuplicate++;
      continue;
    }
    seenEmails.add(email);

    contacts.push({
      sn: snIdx !== -1 ? Number(row[snIdx]) || i - headerRowIndex : i - headerRowIndex,
      company: String(row[companyIdx] || "Unknown Company").trim(),
      email: email,
      personName: nameIdx !== -1 ? String(row[nameIdx] || "Hiring Manager").trim() : "Hiring Manager",
    });
  }

  console.log(`[Excel] Loaded ${contacts.length} contacts from "${sheetName}"`);
  if (skippedNoEmail > 0) {
    console.log(`[Excel] Skipped ${skippedNoEmail} rows with missing/invalid email`);
  }
  if (skippedDuplicate > 0) {
    console.log(`[Excel] Skipped ${skippedDuplicate} duplicate emails`);
  }

  return contacts;
}

module.exports = { readExcel };
