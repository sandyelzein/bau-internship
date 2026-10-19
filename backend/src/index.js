// src/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes       = require('./routes/auth.routes');
const studentRoutes    = require('./routes/student.routes');
const committeeRoutes  = require('./routes/committee.routes');
const internshipRoutes = require('./routes/internship.routes');
const documentRoutes   = require('./routes/document.routes');
const dashboardRoutes  = require('./routes/dashboard.routes');
const supervisorRoutes = require('./routes/supervisor.routes');   // NEW
const evaluationRoutes = require('./routes/evaluation.routes');   // NEW

const { errorHandler } = require('./middleware/error.middleware');
const { initScheduler } = require('./services/scheduler.service'); // NEW

const app = express();
const PORT = process.env.PORT || 5000;
app.set('trust proxy', 1);

// ── Middleware ────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/students',    studentRoutes);
app.use('/api/committee',   committeeRoutes);
app.use('/api/internships', internshipRoutes);
app.use('/api/documents',   documentRoutes);
app.use('/api/dashboard',   dashboardRoutes);
app.use('/api/supervisor',  supervisorRoutes);   // NEW
app.use('/api/evaluation',  evaluationRoutes);   // NEW

app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ BAU Internship Backend running on http://localhost:${PORT}`);
  const emailMode = (process.env.EMAIL_MODE || (process.env.NODE_ENV === 'production' ? 'real' : 'test'))
    .trim()
    .toLowerCase();
  console.log(`📧 Email mode: ${emailMode}`);
  initScheduler(); // NEW — start cron jobs
});
