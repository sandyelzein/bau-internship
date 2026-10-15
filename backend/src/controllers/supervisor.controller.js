const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const { sendSupervisorProfileInvitationEmail } = require('../services/email.service');

const prisma = new PrismaClient();
const PROFILE_SETUP_TOKEN_HOURS = 72;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

async function sendProfileSetupInvitation(supervisor) {
  if (supervisor.userId) return false;

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + PROFILE_SETUP_TOKEN_HOURS * 60 * 60 * 1000);

  await prisma.supervisorProfileToken.upsert({
    where: { supervisorId: supervisor.id },
    update: { tokenHash, expiresAt, usedAt: null },
    create: { supervisorId: supervisor.id, tokenHash, expiresAt },
  });

  try {
    return await sendSupervisorProfileInvitationEmail({
      supervisorName: supervisor.name,
      supervisorEmail: supervisor.email,
      setupLink: `${FRONTEND_URL}/supervisor/profile/${rawToken}`,
      expiresAt,
    });
  } catch (error) {
    console.error('Supervisor profile invitation failed:', error.message);
    return false;
  }
}

const getProfileSetup = async (req, res, next) => {
  try {
    const tokenHash = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const token = await prisma.supervisorProfileToken.findUnique({
      where: { tokenHash },
      include: { supervisor: true },
    });
    if (!token || token.usedAt || token.expiresAt <= new Date() || token.supervisor.userId) {
      return res.status(410).json({ error: 'This supervisor profile link is invalid, expired, or already used' });
    }

    res.json({
      supervisor: {
        name: token.supervisor.name,
        position: token.supervisor.position,
        email: token.supervisor.email,
        phone: token.supervisor.phone,
      },
    });
  } catch (error) {
    next(error);
  }
};

const completeProfileSetup = async (req, res, next) => {
  try {
    const { name, position, phone } = req.body;
    if (!name?.trim() || !position?.trim()) {
      return res.status(400).json({ error: 'Name and position are required' });
    }

    const tokenHash = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const token = await prisma.supervisorProfileToken.findUnique({
      where: { tokenHash },
      include: { supervisor: true },
    });
    if (!token || token.usedAt || token.expiresAt <= new Date() || token.supervisor.userId) {
      return res.status(410).json({ error: 'This supervisor profile link is invalid, expired, or already used' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const claimed = await tx.supervisorProfileToken.updateMany({
        where: { id: token.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (!claimed.count) return false;

      const profile = await tx.supervisor.updateMany({
        where: { id: token.supervisorId, userId: null },
        data: { name: name.trim(), position: position.trim(), phone: phone?.trim() || null },
      });
      if (!profile.count) throw new Error('A supervisor account now exists; sign in to manage your profile');
      return true;
    });

    if (!updated) return res.status(410).json({ error: 'This supervisor profile link has already been used' });
    res.json({ message: 'Your supervisor profile has been confirmed successfully' });
  } catch (error) {
    if (error.message.includes('supervisor account now exists')) {
      return res.status(409).json({ error: error.message });
    }
    next(error);
  }
};

async function findStudentInternship(studentId) {
  return prisma.internship.findFirst({
    where: { request: { studentId, status: 'APPROVED' } },
    include: { supervisor: true, request: true },
    orderBy: { createdAt: 'desc' },
  });
}

const getMySupervisor = async (req, res, next) => {
  try {
    const internship = await findStudentInternship(req.user.student?.studentId);
    if (!internship) return res.status(404).json({ error: 'No approved internship found' });
    res.json({ internshipId: internship.id, evaluationStatus: internship.evaluationStatus, supervisor: internship.supervisor, startDate: internship.request.startDate, endDate: internship.request.endDate });
  } catch (err) { next(err); }
};

const createMySupervisor = async (req, res, next) => {
  try {
    const { position, name, email, phone } = req.body;
    if (!position?.trim() || !name?.trim() || !email?.trim()) return res.status(400).json({ error: 'Supervisor position, name, and email are required' });
    const internship = await findStudentInternship(req.user.student?.studentId);
    if (!internship) return res.status(404).json({ error: 'No approved internship found' });
    if (internship.supervisor) return res.status(409).json({ error: 'A supervisor is already assigned' });

    const normalizedEmail = email.trim().toLowerCase();
    let supervisor = await prisma.supervisor.findUnique({ where: { email: normalizedEmail } });
    if (!supervisor) {
      supervisor = await prisma.supervisor.create({ data: { position: position.trim(), name: name.trim(), email: normalizedEmail, phone: phone?.trim() || null } });
    }
    await prisma.internship.update({ where: { id: internship.id }, data: { supervisorId: supervisor.id } });
    const invitationSent = await sendProfileSetupInvitation(supervisor);
    res.status(201).json({
      message: supervisor.userId
        ? 'Supervisor assigned successfully'
        : invitationSent
          ? 'Supervisor saved and a secure profile link was emailed to them.'
          : 'Supervisor saved, but the profile link email could not be sent. Please check the email configuration and try again.',
      invitationSent,
      supervisor,
    });
  } catch (err) { next(err); }
};

const updateMySupervisor = async (req, res, next) => {
  try {
    const { position, name, email, phone } = req.body;
    if (!position?.trim() || !name?.trim() || !email?.trim()) return res.status(400).json({ error: 'Supervisor position, name, and email are required' });
    const internship = await findStudentInternship(req.user.student?.studentId);
    if (!internship?.supervisor) return res.status(404).json({ error: 'No supervisor found to update' });
    if (internship.supervisor.userId) return res.status(403).json({ error: 'This supervisor has activated their account; contact an administrator to change their profile' });
    const updated = await prisma.supervisor.update({
      where: { id: internship.supervisor.id },
      data: { position: position.trim(), name: name.trim(), email: email.trim().toLowerCase(), phone: phone?.trim() || null },
    });
    const invitationSent = await sendProfileSetupInvitation(updated);
    res.json({
      message: invitationSent
        ? 'Supervisor information updated and a secure profile link was emailed to them.'
        : 'Supervisor information updated, but the profile link email could not be sent. Please check the email configuration and try again.',
      invitationSent,
      supervisor: updated,
    });
  } catch (err) { next(err); }
};

const getSupervisorByInternship = async (req, res, next) => {
  try {
    const internship = await prisma.internship.findUnique({ where: { id: parseInt(req.params.internshipId) }, include: { supervisor: true } });
    res.json(internship?.supervisor || null);
  } catch (err) { next(err); }
};

const getAssignedInternships = async (req, res, next) => {
  try {
    const internships = await prisma.internship.findMany({
      where: { supervisorId: req.user.supervisor?.id },
      include: {
        request: { include: { student: { select: { studentId: true, fullName: true, universityEmail: true, campus: true } } } },
        documents: { where: { documentType: 'COMPLETION_CERTIFICATE' }, orderBy: { uploadedAt: 'desc' } },
        evaluation: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(internships);
  } catch (err) { next(err); }
};

const submitAuthenticatedEvaluation = async (req, res, next) => {
  try {
    const supervisorId = req.user.supervisor?.id;
    const internshipId = parseInt(req.params.internshipId);
    const internship = await prisma.internship.findFirst({ where: { id: internshipId, supervisorId } });
    if (!internship) return res.status(404).json({ error: 'Assigned internship not found' });
    if (await prisma.evaluationSubmission.findUnique({ where: { internshipId } })) return res.status(409).json({ error: 'An evaluation has already been submitted for this internship' });

    const scoreFields = ['professionalism', 'technicalSkills', 'communicationSkills', 'teamwork', 'attendanceCommitment', 'overallPerformance'];
    const data = {};
    for (const field of scoreFields) {
      const value = parseInt(req.body[field]);
      if (Number.isNaN(value) || value < 1 || value > 5) return res.status(400).json({ error: `${field} must be between 1 and 5` });
      data[field] = value;
    }
    if (!req.body.grade?.trim()) return res.status(400).json({ error: 'Grade is required' });
    if (req.body.wouldRecommend === undefined || req.body.wouldRecommend === null) return res.status(400).json({ error: 'Recommendation is required' });

    const evaluation = await prisma.$transaction(async (tx) => {
      const created = await tx.evaluationSubmission.create({
        data: { ...data, grade: req.body.grade.trim(), comments: req.body.comments?.trim() || null, wouldRecommend: req.body.wouldRecommend === true || req.body.wouldRecommend === 'true', internshipId, supervisorId },
      });
      await tx.internship.update({ where: { id: internshipId }, data: { evaluationStatus: 'COMPLETED' } });
      return created;
    });
    res.status(201).json({ message: 'Evaluation and grade submitted successfully', evaluation });
  } catch (err) { next(err); }
};

module.exports = { getMySupervisor, createMySupervisor, updateMySupervisor, getSupervisorByInternship, getAssignedInternships, submitAuthenticatedEvaluation, getProfileSetup, completeProfileSetup };
