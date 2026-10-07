// src/controllers/supervisor.controller.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/supervisor/my
// Returns the supervisor linked to the student's active approved internship
const getMySupervisor = async (req, res, next) => {
  try {
    const studentId = req.user.student?.studentId;

    const internship = await prisma.internship.findFirst({
      where: { request: { studentId, status: 'APPROVED' } },
      include: { supervisor: true, request: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!internship) {
      return res.status(404).json({ error: 'No approved internship found' });
    }

    res.json({
      internshipId:     internship.id,
      evaluationStatus: internship.evaluationStatus,
      supervisor:       internship.supervisor || null,
      startDate:        internship.request.startDate,
      endDate:          internship.request.endDate,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/supervisor/my
// Student submits supervisor info for the first time
const createMySupervisor = async (req, res, next) => {
  try {
    const studentId = req.user.student?.studentId;
    const { name, email, phone } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Supervisor name and email are required' });
    }

    // Find the active approved internship
    const internship = await prisma.internship.findFirst({
      where: { request: { studentId, status: 'APPROVED' } },
      include: { supervisor: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!internship) {
      return res.status(404).json({ error: 'No approved internship found' });
    }

    if (internship.supervisor) {
      return res.status(409).json({
        error: 'Supervisor already exists. Use the update endpoint.',
      });
    }

    const supervisor = await prisma.supervisor.create({
      data: {
        name:        name.trim(),
        email:       email.trim().toLowerCase(),
        phone:       phone ? phone.trim() : null,
        internshipId: internship.id,
      },
    });

    res.status(201).json({ message: 'Supervisor information saved', supervisor });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/supervisor/my
// Student updates existing supervisor info
const updateMySupervisor = async (req, res, next) => {
  try {
    const studentId = req.user.student?.studentId;
    const { name, email, phone } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Supervisor name and email are required' });
    }

    const internship = await prisma.internship.findFirst({
      where: { request: { studentId, status: 'APPROVED' } },
      include: { supervisor: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!internship || !internship.supervisor) {
      return res.status(404).json({ error: 'No supervisor found to update' });
    }

    const updated = await prisma.supervisor.update({
      where: { id: internship.supervisor.id },
      data: {
        name:  name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : null,
      },
    });

    res.json({ message: 'Supervisor information updated', supervisor: updated });
  } catch (err) {
    next(err);
  }
};

// GET /api/supervisor/internship/:internshipId  — Committee only
const getSupervisorByInternship = async (req, res, next) => {
  try {
    const internshipId = parseInt(req.params.internshipId);
    const supervisor = await prisma.supervisor.findUnique({
      where: { internshipId },
    });
    res.json(supervisor || null);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMySupervisor,
  createMySupervisor,
  updateMySupervisor,
  getSupervisorByInternship,
};
