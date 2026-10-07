// src/services/scheduler.service.js
// node-cron scheduler — runs daily at 08:00
// Job 1: Send supervisor reminder 7 days after internship start
// Job 2: Send evaluation request (or missing-supervisor warning) 7 days before end

const cron = require('node-cron');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const {
  sendSupervisorReminderEmail,
  sendSupervisorMissingEmail,
  sendEvaluationRequestEmail,
} = require('./email.service');

const prisma = new PrismaClient();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
// Evaluation token valid for 14 days
const TOKEN_VALIDITY_DAYS = 14;

// ── Helpers ──────────────────────────────────────────────────

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isToday(date) {
  const d = new Date(date);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth()    === now.getMonth() &&
    d.getDate()     === now.getDate()
  );
}

// Generate a cryptographically secure raw token + its SHA-256 hash
function generateToken() {
  const raw = crypto.randomBytes(48).toString('hex'); // 96-char hex string
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

// ── Job 1: Supervisor reminder ───────────────────────────────
// Fires for every approved internship where:
//   - startDate was exactly 7 days ago
//   - no supervisor has been submitted yet
//   - reminder not already sent (checked via EmailLog to avoid duplicates)

async function runSupervisorReminderJob() {
  console.log('⏰ [Scheduler] Running supervisor reminder job…');

  const sevenDaysAgo = addDays(new Date(), -7);
  // Get a date-only range to match (start of that day to end of that day)
  const dayStart = new Date(sevenDaysAgo); dayStart.setHours(0, 0, 0, 0);
  const dayEnd   = new Date(sevenDaysAgo); dayEnd.setHours(23, 59, 59, 999);

  const internships = await prisma.internship.findMany({
    where: {
      status: 'IN_PROGRESS',
      supervisor: null,                   // no supervisor submitted
      request: {
        startDate: { gte: dayStart, lte: dayEnd },
        status: 'APPROVED',
      },
    },
    include: {
      request: { include: { student: true } },
    },
  });

  console.log(`  Found ${internships.length} internship(s) needing supervisor reminder`);

  for (const internship of internships) {
    const student = internship.request.student;

    // Idempotency: skip if we already sent this reminder
    const alreadySent = await prisma.emailLog.findFirst({
      where: {
        recipient: student.universityEmail,
        triggerType: 'SUPERVISOR_REMINDER',
        // sent after the internship start date
        sentAt: { gte: internship.request.startDate },
      },
    });
    if (alreadySent) {
      console.log(`  Skipping ${student.studentId} — reminder already sent`);
      continue;
    }

    await sendSupervisorReminderEmail({
      studentName:  student.fullName,
      studentEmail: student.universityEmail,
      companyName:  internship.request.companyName,
    });

    console.log(`  ✅ Supervisor reminder sent → ${student.universityEmail}`);
  }
}

// ── Job 2: Evaluation request (or missing-supervisor warning) ─
// Fires for every approved internship where:
//   - endDate is exactly 7 days from today
//   - evaluation not yet sent

async function runEvaluationRequestJob() {
  console.log('⏰ [Scheduler] Running evaluation request job…');

  const inSevenDays = addDays(new Date(), 7);
  const dayStart = new Date(inSevenDays); dayStart.setHours(0, 0, 0, 0);
  const dayEnd   = new Date(inSevenDays); dayEnd.setHours(23, 59, 59, 999);

  const internships = await prisma.internship.findMany({
    where: {
      status: 'IN_PROGRESS',
      evaluationStatus: 'NOT_SENT',
      request: {
        endDate: { gte: dayStart, lte: dayEnd },
        status: 'APPROVED',
      },
    },
    include: {
      request: { include: { student: true } },
      supervisor: true,
    },
  });

  console.log(`  Found ${internships.length} internship(s) approaching end date`);

  for (const internship of internships) {
    const student = internship.request.student;

    if (!internship.supervisor) {
      // No supervisor — warn the student instead
      await sendSupervisorMissingEmail({
        studentName:  student.fullName,
        studentEmail: student.universityEmail,
        companyName:  internship.request.companyName,
      });

      // Mark as OVERDUE so we don't spam them daily
      await prisma.internship.update({
        where: { id: internship.id },
        data: { evaluationStatus: 'OVERDUE' },
      });

      console.log(`  ⚠️  Missing supervisor warning → ${student.universityEmail}`);
      continue;
    }

    // Supervisor exists — generate secure token and send evaluation email
    const { raw, hash } = generateToken();
    const expiresAt = addDays(new Date(), TOKEN_VALIDITY_DAYS);

    // Store hashed token only
    const tokenRecord = await prisma.evaluationToken.create({
      data: {
        tokenHash:   hash,
        expiresAt,
        internshipId: internship.id,
      },
    });

    const evaluationLink = `${FRONTEND_URL}/evaluation/${raw}`;

    await sendEvaluationRequestEmail({
      supervisorName:  internship.supervisor.name,
      supervisorEmail: internship.supervisor.email,
      studentName:     student.fullName,
      companyName:     internship.request.companyName,
      role:            internship.request.role,
      evaluationLink,
      expiresAt,
    });

    await prisma.internship.update({
      where: { id: internship.id },
      data: { evaluationStatus: 'SENT' },
    });

    console.log(`  ✅ Evaluation email → ${internship.supervisor.email} (token #${tokenRecord.id})`);
  }
}

// ── Initialize all cron jobs ─────────────────────────────────
// Called once from src/index.js at startup

function initScheduler() {
  console.log('⏰ Scheduler initialized');

  // Runs every day at 08:00 server time
  cron.schedule('0 8 * * *', async () => {
    try { await runSupervisorReminderJob(); }
    catch (e) { console.error('Supervisor reminder job failed:', e); }

    try { await runEvaluationRequestJob(); }
    catch (e) { console.error('Evaluation request job failed:', e); }
  });
}

module.exports = { initScheduler };
