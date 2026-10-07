// backend/test-eval-email.js
// Run with: node test-eval-email.js <internshipId>
// Example:  node test-eval-email.js 1

require('dotenv').config();
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { sendEvaluationRequestEmail } = require('./src/services/email.service');

const prisma = new PrismaClient();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

async function main() {
  const internshipId = parseInt(process.argv[2]);
  if (!internshipId) {
    console.error('Usage: node test-eval-email.js <internshipId>');
    process.exit(1);
  }

  const internship = await prisma.internship.findUnique({
    where: { id: internshipId },
    include: {
      supervisor: true,
      request: { include: { student: true } },
    },
  });

  if (!internship)           { console.error('Internship not found'); process.exit(1); }
  if (!internship.supervisor) { console.error('No supervisor on this internship'); process.exit(1); }

  const raw  = crypto.randomBytes(48).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 14);

  await prisma.evaluationToken.create({
    data: { tokenHash: hash, expiresAt, internshipId },
  });

  const evaluationLink = `${FRONTEND_URL}/evaluation/${raw}`;

  await sendEvaluationRequestEmail({
    supervisorName:  internship.supervisor.name,
    supervisorEmail: internship.supervisor.email,
    studentName:     internship.request.student.fullName,
    companyName:     internship.request.companyName,
    role:            internship.request.role,
    evaluationLink,
    expiresAt,
  });

  await prisma.internship.update({
    where: { id: internshipId },
    data:  { evaluationStatus: 'SENT' },
  });

  console.log('✅ Email sent to:', internship.supervisor.email);
  console.log('🔗 Evaluation link:', evaluationLink);
  console.log('⏰ Expires:', expiresAt.toLocaleDateString());
}

main()
  .catch(e => { console.error('❌', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());