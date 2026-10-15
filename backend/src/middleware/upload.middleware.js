// src/middleware/upload.middleware.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const MAX_FILE_SIZE = (parseInt(process.env.MAX_FILE_SIZE_MB) || 10) * 1024 * 1024;

// Map document types to upload folders
const UPLOAD_FOLDERS = {
  COMPLETION_CERTIFICATE: 'completion-certificates',
  RECOMMENDATION_LETTER: 'recommendation-letters',
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const docType = req.body.documentType || req.query.documentType;
    const folder = UPLOAD_FOLDERS[docType] || 'misc';
    const uploadPath = path.join(__dirname, '../../uploads', folder);

    // Create folder if it doesn't exist
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const studentId = req.user?.student?.studentId || 'unknown';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${studentId}_${timestamp}${ext}`;
    cb(null, safeName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext) && file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    const err = new Error('Only PDF files are allowed');
    err.code = 'INVALID_FILE_TYPE';
    cb(err, false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

const evidenceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/task-evidence');
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const studentId = req.user?.student?.studentId || 'unknown';
    cb(null, `${studentId}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const evidenceFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg'];
  const allowedMimeTypes = ['application/pdf', 'image/png', 'image/jpeg'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext) && allowedMimeTypes.includes(file.mimetype)) cb(null, true);
  else {
    const err = new Error('Task evidence must be a PDF, PNG, or JPG file');
    err.code = 'INVALID_FILE_TYPE';
    cb(err, false);
  }
};

const uploadEvidence = multer({
  storage: evidenceStorage,
  fileFilter: evidenceFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

// Excel upload (for student import)
const excelStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/imports');
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `import_${Date.now()}.xlsx`);
  },
});

const excelFilter = (req, file, cb) => {
  const allowed = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new Error('Only Excel files (.xlsx) are allowed');
    err.code = 'INVALID_FILE_TYPE';
    cb(err, false);
  }
};

const uploadExcel = multer({
  storage: excelStorage,
  fileFilter: excelFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

module.exports = { upload, uploadEvidence, uploadExcel };
