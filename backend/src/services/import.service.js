// src/services/import.service.js
// Handles Excel (.xlsx) bulk import of students
// Columns: ID | ENGLISHNAME | CAMPUS | PHONE | EMAIL | CUMULATIVE_GPA | HOURS_EARNED

const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const REQUIRED_COLUMNS = ['ID', 'ENGLISHNAME', 'EMAIL'];

// ✅ FIX: Normalize a header string — trim spaces and uppercase
// This handles headers like ' id ', 'Id', 'ENGLISHNAME ', etc.
function normalizeHeader(str) {
  return String(str).trim().toUpperCase();
}

function validateRow(row, rowIndex) {
  const errors = [];

  if (!row.ID || String(row.ID).trim() === '') {
    errors.push(`Row ${rowIndex}: Missing student ID`);
  }
  if (!row.ENGLISHNAME || String(row.ENGLISHNAME).trim() === '') {
    errors.push(`Row ${rowIndex}: Missing student name`);
  }
  if (!row.EMAIL || String(row.EMAIL).trim() === '') {
    errors.push(`Row ${rowIndex}: Missing email`);
  }

  if (row.CUMULATIVE_GPA !== undefined && row.CUMULATIVE_GPA !== '') {
    const gpa = parseFloat(row.CUMULATIVE_GPA);
    if (isNaN(gpa) || gpa < 0 || gpa > 4) {
      errors.push(`Row ${rowIndex}: Invalid GPA value (must be 0–4)`);
    }
  }

  return errors;
}

function mapRowToStudent(row) {
  // Parse YEARDESC — Excel may store it as "Year 2", "2", 2, "SECOND YEAR", etc.
  // We extract the first digit found in the value and store it as an integer.
  let academicYear = null;

  if (row.YEARDESC !== undefined && row.YEARDESC !== '') {
    academicYear = String(row.YEARDESC).trim();
}

  return {
    studentId:       String(row.ID).trim(),
    fullName:        String(row.ENGLISHNAME).trim(),
    universityEmail: String(row.EMAIL).trim().toLowerCase(),
    campus:          row.CAMPUS ? String(row.CAMPUS).trim() : null,
    phone:           row.PHONE  ? String(row.PHONE).trim()  : null,
    gpa:
      row.CUMULATIVE_GPA !== undefined && row.CUMULATIVE_GPA !== ''
        ? parseFloat(row.CUMULATIVE_GPA)
        : null,
    completedCredits:
      row.HOURS_EARNED !== undefined && row.HOURS_EARNED !== ''
        ? parseInt(row.HOURS_EARNED)
        : null,
    academicYear,
  };
}

async function processStudentImport(filePath) {
  const results = {
    total: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  // ── Read workbook ──────────────────────────────────────────
  let workbook;
  try {
    workbook = XLSX.readFile(filePath, { cellDates: true });
  } catch (e) {
    return { ...results, errors: [`Failed to read Excel file: ${e.message}`] };
  }

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    return { ...results, errors: ['Excel file contains no sheets'] };
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // ✅ FIX: Read raw rows with header:1 so we get arrays, not objects.
  // This lets us normalize the actual header row ourselves before mapping.
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (rawRows.length === 0) {
    return { ...results, errors: ['Excel sheet is completely empty (no rows found)'] };
  }

  // First row = headers
  const rawHeaders = rawRows[0];

  if (rawHeaders.length === 0) {
    return { ...results, errors: ['Header row is empty'] };
  }

  // ✅ FIX: Normalize headers — trim + uppercase so 'id', ' ID ', 'Id' all become 'ID'
  const normalizedHeaders = rawHeaders.map(normalizeHeader);

  // Validate required columns exist after normalization
  const missingColumns = REQUIRED_COLUMNS.filter(col => !normalizedHeaders.includes(col));
  if (missingColumns.length > 0) {
    return {
      ...results,
      errors: [
        `Missing required column(s): ${missingColumns.join(', ')}. ` +
        `Found headers: ${normalizedHeaders.join(', ')}. ` +
        `Expected: ID, ENGLISHNAME, CAMPUS, PHONE, EMAIL, CUMULATIVE_GPA, HOURS_EARNED, YEARDESC`
      ],
    };
  }

  // Data rows = everything after header row
  const dataRows = rawRows.slice(1);

  if (dataRows.length === 0) {
    return { ...results, errors: ['Excel file has headers but no data rows'] };
  }

  results.total = dataRows.length;

  for (let i = 0; i < dataRows.length; i++) {
    const rawRow = dataRows[i];
    const rowNum = i + 2; // Excel row number (1-indexed + header row)

    // Skip fully empty rows (common at end of Excel files)
    const isEmptyRow = rawRow.every(cell => cell === '' || cell === null || cell === undefined);
    if (isEmptyRow) {
      results.total--;
      continue;
    }

    // ✅ FIX: Map array values back to normalized header keys
    const row = {};
    normalizedHeaders.forEach((header, idx) => {
      row[header] = rawRow[idx] !== undefined ? rawRow[idx] : '';
    });

    // Validate row
    const rowErrors = validateRow(row, rowNum);
    if (rowErrors.length > 0) {
      results.errors.push(...rowErrors);
      results.skipped++;
      continue;
    }

    const studentData = mapRowToStudent(row);

    try {
      const existing = await prisma.student.findUnique({
        where: { studentId: studentData.studentId },
      });

      if (existing) {
        // UPDATE — preserve userId, internshipStatus, graduationStatus
        await prisma.student.update({
          where: { studentId: studentData.studentId },
          data: {
            fullName:         studentData.fullName,
            universityEmail:  studentData.universityEmail,
            campus:           studentData.campus,
            phone:            studentData.phone,
            gpa:              studentData.gpa ?? existing.gpa,
            completedCredits: studentData.completedCredits ?? existing.completedCredits,
            academicYear:     studentData.academicYear ?? existing.academicYear,
          },
        });
        results.updated++;
      } else {
        // INSERT
        await prisma.student.create({ data: studentData });
        results.inserted++;
      }
    } catch (err) {
      if (err.code === 'P2002') {
        results.errors.push(
          `Row ${rowNum}: Email ${studentData.universityEmail} already belongs to another student`
        );
      } else {
        results.errors.push(`Row ${rowNum}: Database error – ${err.message}`);
      }
      results.skipped++;
    }
  }

  return results;
}

module.exports = { processStudentImport };