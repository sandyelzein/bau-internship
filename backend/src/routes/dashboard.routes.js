// src/routes/dashboard.routes.js
const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../controllers/dashboard.controller');
const { authenticate, requireCommittee } = require('../middleware/auth.middleware');

router.get('/stats', authenticate, requireCommittee, getDashboardStats);

module.exports = router;
