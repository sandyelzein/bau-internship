// src/routes/student.routes.js
const express = require('express');
const router = express.Router();
const {
  getMyProfile,
  getAllStudents,
  getStudentById,
  updateStudent,
} = require('../controllers/student.controller');
const {
  authenticate,
  requireStudent,
  requireCommittee,
} = require('../middleware/auth.middleware');

// Student routes
router.get('/profile', authenticate, requireStudent, getMyProfile);

// Committee routes
router.get('/', authenticate, requireCommittee, getAllStudents);
router.get('/:studentId', authenticate, requireCommittee, getStudentById);
router.patch('/:studentId', authenticate, requireCommittee, updateStudent);

module.exports = router;
