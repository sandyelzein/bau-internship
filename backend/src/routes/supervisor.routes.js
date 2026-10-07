// src/routes/supervisor.routes.js
const express = require('express');
const router = express.Router();
const {
  getMySupervisor,
  createMySupervisor,
  updateMySupervisor,
  getSupervisorByInternship,
} = require('../controllers/supervisor.controller');
const { authenticate, requireStudent, requireCommittee } = require('../middleware/auth.middleware');

// Student endpoints
router.get('/my',   authenticate, requireStudent, getMySupervisor);
router.post('/my',  authenticate, requireStudent, createMySupervisor);
router.patch('/my', authenticate, requireStudent, updateMySupervisor);

// Committee endpoint
router.get('/internship/:internshipId', authenticate, requireCommittee, getSupervisorByInternship);

module.exports = router;
