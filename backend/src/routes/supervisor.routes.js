// src/routes/supervisor.routes.js
const express = require('express');
const router = express.Router();
const {
  getMySupervisor,
  createMySupervisor,
  updateMySupervisor,
  getSupervisorByInternship,
  getAssignedInternships,
  submitAuthenticatedEvaluation,
  getProfileSetup,
  completeProfileSetup,
} = require('../controllers/supervisor.controller');
const { authenticate, requireStudent, requireCommittee, requireSupervisor } = require('../middleware/auth.middleware');
const { publicFormLimiter } = require('../middleware/form-security.middleware');

// Public one-time supervisor profile setup link
router.get('/profile/:token', publicFormLimiter, getProfileSetup);
router.post('/profile/:token', publicFormLimiter, completeProfileSetup);

// Student endpoints
router.get('/my',   authenticate, requireStudent, getMySupervisor);
router.post('/my',  authenticate, requireStudent, createMySupervisor);
router.patch('/my', authenticate, requireStudent, updateMySupervisor);

// Committee endpoint
router.get('/internship/:internshipId', authenticate, requireCommittee, getSupervisorByInternship);
router.get('/internships', authenticate, requireSupervisor, getAssignedInternships);
router.post('/internships/:internshipId/evaluation', authenticate, requireSupervisor, submitAuthenticatedEvaluation);

module.exports = router;
