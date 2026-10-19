// src/services/email.service.js
// Full file — includes original templates + 3 new ones
const nodemailer = require('nodemailer');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function createTransporter() {
  const mode = (process.env.EMAIL_MODE || (process.env.NODE_ENV === 'production' ? 'real' : 'test'))
    .trim()
    .toLowerCase();
  if (mode === 'test') {
    if (!process.env.MAILTRAP_USER || !process.env.MAILTRAP_PASS) {
      throw new Error('MAILTRAP_USER and MAILTRAP_PASS are required when EMAIL_MODE=test');
    }
    return nodemailer.createTransport({
      host: process.env.MAILTRAP_HOST || 'sandbox.smtp.mailtrap.io',
      port: parseInt(process.env.MAILTRAP_PORT) || 2525,
      auth: {
        user: process.env.MAILTRAP_USER,
        pass: process.env.MAILTRAP_PASS,
      },
    });
  }

  if (mode !== 'real') {
    throw new Error('EMAIL_MODE must be either test or real');
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.SMTP_FROM) {
    throw new Error('SMTP_USER, SMTP_PASS, and SMTP_FROM are required when EMAIL_MODE=real');
  }

  const port = parseInt(process.env.SMTP_PORT, 10) || 587;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

const FROM_ADDRESS = process.env.SMTP_FROM || '"BAU Internship System" <noreply@bau.edu.lb>';

// ── Shared BAU email wrapper ─────────────────────────────────
function bauWrapper(bodyHtml) {
  return `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background-color: #003571; padding: 20px; text-align: center;">
      <h1 style="color: white; margin: 0;">BAU Internship System</h1>
      <p style="color: #cce0ff; margin: 5px 0;">Faculty of Sciences – CS Department</p>
    </div>
    <div style="padding: 30px; background: #f9f9f9;">
      ${bodyHtml}
      <p style="color: #666; font-size: 12px; margin-top: 30px;">
        This is an automated message from BAU Internship Management System.
      </p>
    </div>
  </div>`;
}

// ── Core send + log ──────────────────────────────────────────
async function sendEmail({ to, subject, html, logHtml, triggerType }) {
  let status = 'SENT';
  let errorMessage = null;

  try {
    const transporter = createTransporter();
    await transporter.sendMail({ from: FROM_ADDRESS, to, subject, html });
    console.log(`📧 Email sent to ${to} [${triggerType}]`);
  } catch (err) {
    status = 'FAILED';
    errorMessage = err.message;
    console.error(`❌ Email failed to ${to}:`, err.message);
  }

  await prisma.emailLog.create({
    data: { recipient: to, subject, body: logHtml || html, status, errorMessage, triggerType },
  });

  return status === 'SENT';
}

async function sendManualEmail({ to, subject, message }) {
  const escapedMessage = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const html = bauWrapper(`<p style="white-space:pre-wrap;">${escapedMessage}</p>`);

  return sendEmail({ to, subject, html, triggerType: 'MANUAL' });
}

// ── EXISTING: Approval email ─────────────────────────────────
async function sendApprovalEmail({ studentName, studentEmail, request }) {
  const subject = 'Internship Request Approved – BAU';
  const html = bauWrapper(`
    <h2 style="color: #003571;">Congratulations, ${studentName}!</h2>
    <p>Your internship request has been <strong style="color: #28a745;">approved</strong>.</p>
    <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
      <tr style="background:#003571;color:white;"><th style="padding:10px;text-align:left;">Field</th><th style="padding:10px;text-align:left;">Details</th></tr>
      <tr style="background:white;"><td style="padding:10px;border:1px solid #ddd;">Request ID</td><td style="padding:10px;border:1px solid #ddd;">${request.requestCode}</td></tr>
      <tr style="background:#f2f2f2;"><td style="padding:10px;border:1px solid #ddd;">Company</td><td style="padding:10px;border:1px solid #ddd;">${request.companyName}</td></tr>
      <tr style="background:white;"><td style="padding:10px;border:1px solid #ddd;">Role</td><td style="padding:10px;border:1px solid #ddd;">${request.role}</td></tr>
      <tr style="background:#f2f2f2;"><td style="padding:10px;border:1px solid #ddd;">Start Date</td><td style="padding:10px;border:1px solid #ddd;">${new Date(request.startDate).toLocaleDateString()}</td></tr>
      <tr style="background:white;"><td style="padding:10px;border:1px solid #ddd;">End Date</td><td style="padding:10px;border:1px solid #ddd;">${new Date(request.endDate).toLocaleDateString()}</td></tr>
    </table>
    <p>Please log in to the system to add your supervisor information and upload required documents.</p>
  `);
  return sendEmail({ to: studentEmail, subject, html, triggerType: 'REQUEST_APPROVED' });
}

// ── EXISTING: Rejection email ────────────────────────────────
async function sendRejectionEmail({ studentName, studentEmail, request, reason }) {
  const subject = 'Internship Request Update – BAU';
  const html = bauWrapper(`
    <h2 style="color: #003571;">Dear ${studentName},</h2>
    <p>Your internship request has been <strong style="color: #dc3545;">rejected</strong>.</p>
    <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
      <tr style="background:#003571;color:white;"><th style="padding:10px;text-align:left;">Field</th><th style="padding:10px;text-align:left;">Details</th></tr>
      <tr style="background:white;"><td style="padding:10px;border:1px solid #ddd;">Request ID</td><td style="padding:10px;border:1px solid #ddd;">${request.requestCode}</td></tr>
      <tr style="background:#f2f2f2;"><td style="padding:10px;border:1px solid #ddd;">Company</td><td style="padding:10px;border:1px solid #ddd;">${request.companyName}</td></tr>
      <tr style="background:white;"><td style="padding:10px;border:1px solid #ddd;">Role</td><td style="padding:10px;border:1px solid #ddd;">${request.role}</td></tr>
    </table>
    <div style="background:#fff3cd;padding:15px;border-left:4px solid #ffc107;margin:20px 0;">
      <strong>Reason:</strong><br/>${reason || 'No specific reason provided.'}
    </div>
    <p>You may submit a new internship request after addressing the concerns above.</p>
  `);
  return sendEmail({ to: studentEmail, subject, html, triggerType: 'REQUEST_REJECTED' });
}

// ── NEW: Supervisor reminder (sent to student 1 week after start) ──
async function sendSupervisorReminderEmail({ studentName, studentEmail, companyName }) {
  const subject = 'Supervisor Information Required – BAU Internship System';
  const html = bauWrapper(`
    <h2 style="color: #003571;">Dear ${studentName},</h2>
    <p>Your internship at <strong>${companyName}</strong> is now underway.</p>
    <div style="background:#fff3cd;padding:15px;border-left:4px solid #ffc107;margin:20px 0;">
      <strong>Action Required:</strong> You have not yet submitted your supervisor's contact information.
    </div>
    <p>Please log in to the BAU Internship System and provide your supervisor's details as soon as possible.</p>
    <p>Supervisor information is required for your internship evaluation to be completed.</p>
    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/student"
       style="display:inline-block;background:#003571;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:10px;">
      Log In &amp; Add Supervisor
    </a>
  `);
  return sendEmail({ to: studentEmail, subject, html, triggerType: 'SUPERVISOR_REMINDER' });
}

// ── NEW: Missing supervisor (sent when evaluation due but no supervisor) ──
async function sendSupervisorMissingEmail({ studentName, studentEmail, companyName }) {
  const subject = 'Supervisor Information Missing – Action Required';
  const html = bauWrapper(`
    <h2 style="color: #003571;">Dear ${studentName},</h2>
    <p>Your internship at <strong>${companyName}</strong> is approaching its end date.</p>
    <div style="background:#f8d7da;padding:15px;border-left:4px solid #dc3545;margin:20px 0;">
      <strong>Urgent:</strong> Your supervisor information is missing. The evaluation email cannot be sent without it.
    </div>
    <p>Please log in immediately and provide your supervisor's contact information so the evaluation process can proceed.</p>
    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/student"
       style="display:inline-block;background:#003571;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:10px;">
      Log In &amp; Add Supervisor
    </a>
  `);
  return sendEmail({ to: studentEmail, subject, html, triggerType: 'SUPERVISOR_MISSING' });
}

async function sendSupervisorProfileInvitationEmail({ supervisorName, supervisorEmail, setupLink, expiresAt }) {
  const subject = 'Confirm Your Supervisor Profile – BAU Internship System';
  const html = bauWrapper(`
    <h2 style="color: #003571;">Hello ${supervisorName},</h2>
    <p>A BAU internship student has listed you as their internship supervisor.</p>
    <p>Use the secure link below to confirm your name, position, and contact details.</p>
    <a href="${setupLink}"
       style="display:inline-block;background:#003571;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:10px;">
      Confirm Supervisor Profile
    </a>
    <p style="color:#666;font-size:13px;margin-top:20px;">
      This link expires ${new Date(expiresAt).toLocaleString()} and can only be used once.
      If you were not expecting this email, you can ignore it.
    </p>
  `);
  return sendEmail({
    to: supervisorEmail,
    subject,
    html,
    logHtml: bauWrapper('<p>Secure supervisor profile link sent. The link token is not stored in email logs.</p>'),
    triggerType: 'SUPERVISOR_PROFILE_INVITATION',
  });
}

async function sendCompletionCertificateReminderEmail({ studentName, studentEmail, companyName }) {
  const subject = 'Completion Certificate Required – BAU Internship System';
  const html = bauWrapper(`
    <h2 style="color: #003571;">Dear ${studentName},</h2>
    <p>Your internship at <strong>${companyName}</strong> has been marked as completed.</p>
    <div style="background:#fff3cd;padding:15px;border-left:4px solid #ffc107;margin:20px 0;">
      <strong>Action Required:</strong> Please upload your internship completion certificate.
    </div>
    <p>Log in to the BAU Internship System and upload the certificate under My Internships.</p>
    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/student/documents"
       style="display:inline-block;background:#003571;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:10px;">
      Upload Completion Certificate
    </a>
  `);
  return sendEmail({ to: studentEmail, subject, html, triggerType: 'CERTIFICATE_REMINDER' });
}

// ── NEW: Evaluation request (sent to supervisor) ─────────────
async function sendEvaluationRequestEmail({
  supervisorName,
  supervisorEmail,
  studentName,
  companyName,
  role,
  evaluationLink,
  expiresAt,
}) {
  const subject = `Internship Evaluation Request – ${studentName} – BAU`;
  const html = bauWrapper(`
    <h2 style="color: #003571;">Dear ${supervisorName},</h2>
    <p>You are receiving this email because you are supervising <strong>${studentName}</strong>
       during their internship at <strong>${companyName}</strong>.</p>
    <p>Beirut Arab University requests that you complete a brief evaluation of the student's performance.</p>

    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      <tr style="background:#003571;color:white;">
        <th style="padding:10px;text-align:left;">Detail</th>
        <th style="padding:10px;text-align:left;">Information</th>
      </tr>
      <tr style="background:white;">
        <td style="padding:10px;border:1px solid #ddd;">Student</td>
        <td style="padding:10px;border:1px solid #ddd;">${studentName}</td>
      </tr>
      <tr style="background:#f2f2f2;">
        <td style="padding:10px;border:1px solid #ddd;">Company</td>
        <td style="padding:10px;border:1px solid #ddd;">${companyName}</td>
      </tr>
      <tr style="background:white;">
        <td style="padding:10px;border:1px solid #ddd;">Role</td>
        <td style="padding:10px;border:1px solid #ddd;">${role}</td>
      </tr>
    </table>

    <div style="text-align:center;margin:30px 0;">
      <a href="${evaluationLink}"
         style="display:inline-block;background:#003571;color:white;padding:16px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">
        Complete Evaluation
      </a>
    </div>

    <div style="background:#e8eef7;padding:12px;border-radius:6px;font-size:13px;color:#555;">
      <strong>Note:</strong> This link is valid until ${new Date(expiresAt).toLocaleDateString()}.
      It can only be used once. No account or login is required.
    </div>
  `);
  return sendEmail({ to: supervisorEmail, subject, html, triggerType: 'EVALUATION_REQUEST' });
}

module.exports = {
  sendManualEmail,
  sendApprovalEmail,
  sendRejectionEmail,
  sendSupervisorReminderEmail,
  sendSupervisorMissingEmail,
  sendSupervisorProfileInvitationEmail,
  sendCompletionCertificateReminderEmail,
  sendEvaluationRequestEmail,
};
