// src/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const { login, register, registerSupervisor, getMe, getRegistrationSettings } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.post('/login', login);
router.get('/registration-settings', getRegistrationSettings);
router.post('/register', register);
router.post('/register-supervisor', registerSupervisor);
router.get('/me', authenticate, getMe);

module.exports = router;
