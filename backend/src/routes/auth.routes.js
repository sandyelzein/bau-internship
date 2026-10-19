// src/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const { login, register, registerSupervisor, getMe, getRegistrationSettings } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { publicFormLimiter } = require('../middleware/form-security.middleware');

router.post('/login', publicFormLimiter, login);
router.get('/registration-settings', getRegistrationSettings);
router.post('/register', publicFormLimiter, register);
router.post('/register-supervisor', publicFormLimiter, registerSupervisor);
router.get('/me', authenticate, getMe);

module.exports = router;
