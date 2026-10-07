// src/controllers/committee.controller.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// GET /api/committee/members — Admin only
const getAllMembers = async (req, res, next) => {
  try {
    const members = await prisma.committeeMember.findMany({
      include: {
        user: {
          select: { id: true, email: true, isActive: true, createdAt: true },
        },
        _count: { select: { reviewedRequests: true } },
      },
      orderBy: { fullName: 'asc' },
    });
    res.json(members);
  } catch (err) {
    next(err);
  }
};

// POST /api/committee/members — Admin only
const addMember = async (req, res, next) => {
  try {
    const { fullName, email, password, isAdmin } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'Full name, email, and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = await prisma.userAccount.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const userAccount = await tx.userAccount.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          role: 'COMMITTEE_MEMBER',
        },
      });

      const member = await tx.committeeMember.create({
        data: {
          fullName: fullName.trim(),
          isAdmin: isAdmin === true || isAdmin === 'true',
          userId: userAccount.id,
        },
      });

      return { userAccount, member };
    });

    res.status(201).json({
      message: 'Committee member added successfully',
      member: {
        id: result.member.id,
        fullName: result.member.fullName,
        email: result.userAccount.email,
        isAdmin: result.member.isAdmin,
      },
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/committee/members/:id — Admin only
const updateMember = async (req, res, next) => {
  try {
    const memberId = parseInt(req.params.id);
    const { fullName, isAdmin, isActive, password } = req.body;

    // Prevent admin from removing their own admin status
    if (
      req.user.committeeMember?.id === memberId &&
      isAdmin === false
    ) {
      return res.status(400).json({ error: 'You cannot remove your own admin status' });
    }

    const member = await prisma.committeeMember.findUnique({
      where: { id: memberId },
      include: { user: true },
    });

    if (!member) {
      return res.status(404).json({ error: 'Committee member not found' });
    }

    await prisma.$transaction(async (tx) => {
      if (fullName !== undefined || isAdmin !== undefined) {
        await tx.committeeMember.update({
          where: { id: memberId },
          data: {
            ...(fullName !== undefined ? { fullName: fullName.trim() } : {}),
            ...(isAdmin !== undefined ? { isAdmin } : {}),
          },
        });
      }

      if (isActive !== undefined || password !== undefined) {
        const userUpdate = {};
        if (isActive !== undefined) userUpdate.isActive = isActive;
        if (password !== undefined && password.length >= 8) {
          userUpdate.passwordHash = await bcrypt.hash(password, 10);
        }
        await tx.userAccount.update({
          where: { id: member.userId },
          data: userUpdate,
        });
      }
    });

    res.json({ message: 'Committee member updated successfully' });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/committee/members/:id — Admin only
const deleteMember = async (req, res, next) => {
  try {
    const memberId = parseInt(req.params.id);

    // Prevent self-deletion
    if (req.user.committeeMember?.id === memberId) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    const member = await prisma.committeeMember.findUnique({
      where: { id: memberId },
    });
    if (!member) {
      return res.status(404).json({ error: 'Committee member not found' });
    }

    // Deactivate instead of hard delete (preserve review history)
    await prisma.userAccount.update({
      where: { id: member.userId },
      data: { isActive: false },
    });

    res.json({ message: 'Committee member deactivated successfully' });
  } catch (err) {
    next(err);
  }
};

// POST /api/committee/import — Admin only: Excel student import
const { processStudentImport } = require('../services/import.service');

const importStudents = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Excel file is required' });
    }

    const results = await processStudentImport(req.file.path);

    res.json({
      message: 'Import completed',
      results,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/committee/email-logs — Committee only
const getEmailLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      prisma.emailLog.findMany({
        orderBy: { sentAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.emailLog.count(),
    ]);

    res.json({
      logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllMembers,
  addMember,
  updateMember,
  deleteMember,
  importStudents,
  getEmailLogs,
};
