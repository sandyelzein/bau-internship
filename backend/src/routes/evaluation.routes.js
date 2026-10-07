// src/routes/evaluation.routes.js
const express = require('express');
const router = express.Router();
const {
  getEvaluationContext,
  submitEvaluation,
  getEvaluationResults,
} = require('../controllers/evaluation.controller');
const { authenticate, requireCommittee } = require('../middleware/auth.middleware');

// Public routes — no auth, supervisor uses these via email link
router.get('/:token',        getEvaluationContext);
router.post('/:token/submit', submitEvaluation);

// Committee only
router.get('/', authenticate, requireCommittee, getEvaluationResults);

module.exports = router;
