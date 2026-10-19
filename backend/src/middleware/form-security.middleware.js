const rateLimit = require('express-rate-limit');

const publicFormLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many form attempts. Please try again in 15 minutes.' },
});

module.exports = { publicFormLimiter };
