// src/controllers/internship.controller.js
// FIX: removed `endDate: new Date()` from internship.update() in updateInternshipStatus
//      The Internship model has no endDate field — dates live on InternshipRequest

const { PrismaClient } = require('@prisma/client');
const { sendApprovalEmail, sendRejectionEmail } = require('../services/email.service');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

function removeUploadedEvidence(file) {
  if (file?.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
}

async function generateRequestCode() {
  const year  = new Date().getFullYear();
  const count = await prisma.internshipRequest.count();
  const seq   = String(count + 1).padStart(5, '0');
  return `REQ-${year}-${seq}`;
}

// ── STUDENT ──────────────────────────────────────────────────

// POST /api/internships/requests
const submitRequest = async (req, res, next) => {
  try {
    const studentId = req.user.student?.studentId;
    if (!studentId) {
      removeUploadedEvidence(req.file);
      return res.status(400).json({ error: 'Student profile not found' });
    }

    const setting = await prisma.systemSetting.findUnique({ where: { key: 'REQUESTS_OPEN' } });
    if (setting?.value === 'false') {
      removeUploadedEvidence(req.file);
      return res.status(423).json({ error: 'Internship requests are currently closed by the administrator' });
    }

    const { companyName, role, skills, tasks, startDate, endDate } = req.body;

    if (!companyName || !role || !tasks?.trim() || !startDate || !endDate) {
      removeUploadedEvidence(req.file);
      return res.status(400).json({
        error: 'Company name, role, tasks, start date, and end date are required',
      });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'A task letter or email screenshot is required' });
    }

    const start = new Date(startDate);
    const end   = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      removeUploadedEvidence(req.file);
      return res.status(400).json({ error: 'Invalid date format' });
    }
    if (end <= start) {
      removeUploadedEvidence(req.file);
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    const msPerWeek     = 7 * 24 * 60 * 60 * 1000;
    const durationWeeks = Math.round((end - start) / msPerWeek);

    const activeRequest = await prisma.internshipRequest.findFirst({
      where: { studentId, status: { in: ['PENDING', 'APPROVED'] } },
    });
    if (activeRequest) {
      removeUploadedEvidence(req.file);
      return res.status(409).json({
        error: 'You already have an active internship request.',
        existingRequest: { requestCode: activeRequest.requestCode, status: activeRequest.status },
      });
    }

    const requestCode = await generateRequestCode();

    const request = await prisma.$transaction(async (tx) => {
      const created = await tx.internshipRequest.create({
        data: {
          requestCode,
          companyName: companyName.trim(),
          role: role.trim(),
          skills: skills ? skills.trim() : '',
          tasks: tasks.trim(),
          evidenceFileName: req.file.originalname,
          evidenceFilePath: path.relative(path.join(__dirname, '../../uploads'), req.file.path).split(path.sep).join('/'),
          evidenceFileSize: req.file.size,
          startDate: start,
          endDate: end,
          durationWeeks,
          studentId,
        },
      });
      await tx.student.update({ where: { studentId }, data: { internshipStatus: 'IN_PROGRESS' } });
      return created;
    });

    res.status(201).json({ message: 'Internship request submitted successfully', request });
  } catch (err) {
    removeUploadedEvidence(req.file);
    next(err);
  }
};

// GET /api/internships/requests/my
const getMyRequests = async (req, res, next) => {
  try {
    const studentId = req.user.student?.studentId;
    const requests  = await prisma.internshipRequest.findMany({
      where: { studentId },
      include: {
        internship: { include: { supervisor: true, documents: true } },
        reviewedBy: { select: { fullName: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });
    res.json(requests);
  } catch (err) {
    next(err);
  }
};

// ── COMMITTEE ────────────────────────────────────────────────

// GET /api/internships/requests
const getAllRequests = async (req, res, next) => {
  try {
    const { status, studentId, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status)    where.status    = status;
    if (studentId) where.studentId = { contains: studentId, mode: 'insensitive' };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [requests, total] = await Promise.all([
      prisma.internshipRequest.findMany({
        where,
        include: {
          student:    { select: { studentId: true, fullName: true, universityEmail: true, campus: true, gpa: true, completedCredits: true, academicYear: true, internshipStatus: true } },
          reviewedBy: { select: { fullName: true } },
          internship: { include: { supervisor: true, documents: true, evaluation: true } },
        },
        orderBy: { submittedAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.internshipRequest.count({ where }),
    ]);

    res.json({
      requests,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/internships/requests/:id
const getRequestById = async (req, res, next) => {
  try {
    const request = await prisma.internshipRequest.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        student:    true,
        reviewedBy: { select: { fullName: true } },
        internship: { include: { supervisor: true, documents: true, evaluation: true } },
      },
    });
    if (!request) return res.status(404).json({ error: 'Request not found' });

    if (req.user.role === 'STUDENT' && request.studentId !== req.user.student?.studentId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json(request);
  } catch (err) {
    next(err);
  }
};

const getRequestSettings = async (req, res, next) => {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'REQUESTS_OPEN' } });
    res.json({ requestsOpen: setting?.value !== 'false' });
  } catch (err) {
    next(err);
  }
};

const updateRequestSettings = async (req, res, next) => {
  try {
    const requestsOpen = req.body.requestsOpen === true || req.body.requestsOpen === 'true';
    await prisma.systemSetting.upsert({
      where: { key: 'REQUESTS_OPEN' },
      update: { value: String(requestsOpen) },
      create: { key: 'REQUESTS_OPEN', value: String(requestsOpen) },
    });
    res.json({ message: `Internship requests ${requestsOpen ? 'opened' : 'closed'}`, requestsOpen });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/internships/requests/:id/review
const reviewRequest = async (req, res, next) => {
  try {
    const { status, rejectionReason } = req.body;
    const requestId   = parseInt(req.params.id);
    const committeeId = req.user.committeeMember?.id;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Status must be APPROVED or REJECTED' });
    }
    if (status === 'REJECTED' && !rejectionReason?.trim()) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const request = await prisma.internshipRequest.findUnique({
      where: { id: requestId },
      include: { student: true },
    });
    if (!request)                     return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'PENDING') return res.status(400).json({ error: 'Only pending requests can be reviewed' });

    const updated = await prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.internshipRequest.update({
        where: { id: requestId },
        data: {
          status,
          rejectionReason: status === 'REJECTED' ? rejectionReason.trim() : null,
          reviewedAt:      new Date(),
          reviewedById:    committeeId,
        },
      });

      if (status === 'APPROVED') {
        await tx.internship.create({ data: { requestId, status: 'IN_PROGRESS' } });
        await tx.student.update({ where: { studentId: request.studentId }, data: { internshipStatus: 'IN_PROGRESS' } });
      } else {
        await tx.student.update({ where: { studentId: request.studentId }, data: { internshipStatus: 'NOT_STARTED' } });
      }
      return updatedRequest;
    });

    if (status === 'APPROVED') {
      sendApprovalEmail({ studentName: request.student.fullName, studentEmail: request.student.universityEmail, request }).catch(console.error);
    } else {
      sendRejectionEmail({ studentName: request.student.fullName, studentEmail: request.student.universityEmail, request, reason: rejectionReason }).catch(console.error);
    }

    res.json({ message: `Request ${status.toLowerCase()} successfully`, request: updated });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/internships/:id/status
const updateInternshipStatus = async (req, res, next) => {
  try {
    const { status }   = req.body;
    const internshipId = parseInt(req.params.id);

    if (!['IN_PROGRESS', 'COMPLETED', 'NOT_COMPLETED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid internship status' });
    }

    const internship = await prisma.internship.findUnique({
      where: { id: internshipId },
      include: { request: { include: { student: true } } },
    });
    if (!internship) return res.status(404).json({ error: 'Internship not found' });

    const studentId = internship.request.student.studentId;

    await prisma.$transaction(async (tx) => {
      // FIX: removed `endDate: new Date()` — Internship model has no endDate field.
      // endDate lives on InternshipRequest and is set at submission time by the student.
      await tx.internship.update({
        where: { id: internshipId },
        data:  { status },
      });
      await tx.student.update({
        where: { studentId },
        data:  { internshipStatus: status },
      });
    });

    res.json({ message: 'Internship status updated' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  submitRequest,
  getMyRequests,
  getAllRequests,
  getRequestById,
  reviewRequest,
  updateInternshipStatus,
  getRequestSettings,
  updateRequestSettings,
};
