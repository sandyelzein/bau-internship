// src/routes/internship.routes.js
const express = require('express');
const router = express.Router();
const {
  submitRequest,
  getMyRequests,
  getAllRequests,
  getRequestById,
  reviewRequest,
  updateInternshipStatus,
  getRequestSettings,
  updateRequestSettings,
} = require('../controllers/internship.controller');
const {
  authenticate,
  requireStudent,
  requireCommittee,
  requireAdmin,
} = require('../middleware/auth.middleware');
const { uploadEvidence } = require('../middleware/upload.middleware');

// Student routes
router.get('/settings', authenticate, getRequestSettings);
router.patch('/settings', authenticate, requireAdmin, updateRequestSettings);
router.post('/requests', authenticate, requireStudent, uploadEvidence.fields([
  { name: 'acceptanceLetter', maxCount: 1 },
  { name: 'taskDocuments', maxCount: 10 },
]), submitRequest);
router.get('/requests/my', authenticate, requireStudent, getMyRequests);

// Shared (student sees own, committee sees all)
router.get('/requests/:id', authenticate, getRequestById);

// Committee routes
router.get('/requests', authenticate, requireCommittee, getAllRequests);
router.patch('/requests/:id/review', authenticate, requireCommittee, reviewRequest);
router.patch('/:id/status', authenticate, requireCommittee, updateInternshipStatus);

module.exports = router;
