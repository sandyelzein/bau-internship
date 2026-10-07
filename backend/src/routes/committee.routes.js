// src/routes/committee.routes.js
const express = require('express');
const router = express.Router();
const {
  getAllMembers,
  addMember,
  updateMember,
  deleteMember,
  importStudents,
  getEmailLogs,
} = require('../controllers/committee.controller');
const {
  authenticate,
  requireCommittee,
  requireAdmin,
} = require('../middleware/auth.middleware');
const { uploadExcel } = require('../middleware/upload.middleware');

// Admin-only: manage committee members
router.get('/members', authenticate, requireAdmin, getAllMembers);
router.post('/members', authenticate, requireAdmin, addMember);
router.patch('/members/:id', authenticate, requireAdmin, updateMember);
router.delete('/members/:id', authenticate, requireAdmin, deleteMember);

// Admin-only: student Excel import
router.post(
  '/import',
  authenticate,
  requireAdmin,
  uploadExcel.single('file'),
  importStudents
);

// Committee: email logs
router.get('/email-logs', authenticate, requireCommittee, getEmailLogs);

module.exports = router;
