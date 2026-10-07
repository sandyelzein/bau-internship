// src/routes/document.routes.js
const express = require('express');
const router = express.Router();
const {
  uploadDocument,
  getMyDocuments,
  getStudentDocuments,
  deleteDocument,
} = require('../controllers/document.controller');
const {
  authenticate,
  requireStudent,
  requireCommittee,
} = require('../middleware/auth.middleware');
const { upload } = require('../middleware/upload.middleware');

// Student routes
router.post(
  '/upload',
  authenticate,
  requireStudent,
  upload.single('file'),
  uploadDocument
);
router.get('/my', authenticate, requireStudent, getMyDocuments);
router.delete('/:id', authenticate, requireStudent, deleteDocument);

// Committee routes
router.get('/student/:studentId', authenticate, requireCommittee, getStudentDocuments);

module.exports = router;
