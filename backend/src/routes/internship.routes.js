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
} = require('../controllers/internship.controller');
const {
  authenticate,
  requireStudent,
  requireCommittee,
} = require('../middleware/auth.middleware');

// Student routes
router.post('/requests', authenticate, requireStudent, submitRequest);
router.get('/requests/my', authenticate, requireStudent, getMyRequests);

// Shared (student sees own, committee sees all)
router.get('/requests/:id', authenticate, getRequestById);

// Committee routes
router.get('/requests', authenticate, requireCommittee, getAllRequests);
router.patch('/requests/:id/review', authenticate, requireCommittee, reviewRequest);
router.patch('/:id/status', authenticate, requireCommittee, updateInternshipStatus);

module.exports = router;
