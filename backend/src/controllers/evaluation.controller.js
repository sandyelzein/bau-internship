// src/controllers/evaluation.controller.js

const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Validate incoming raw token and return internship context (no auth required)
// GET /api/evaluation/:token
const getEvaluationContext = async (req, res, next) => {
  try {
    const { token } = req.params;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const tokenRecord = await prisma.evaluationToken.findUnique({
      where: { tokenHash },
      include: {
        internship: {
          include: {
            supervisor: true,
            request: { include: { student: true } },
          },
        },
        evaluation: true,
      },
    });

    // Token not found
    if (!tokenRecord) {
      return res.status(404).json({ error: 'Invalid evaluation link' });
    }

    // Already used
    if (tokenRecord.usedAt) {
      return res.status(410).json({ error: 'This evaluation link has already been used' });
    }

    // Expired
    if (new Date() > new Date(tokenRecord.expiresAt)) {
      return res.status(410).json({ error: 'This evaluation link has expired' });
    }

    const { internship } = tokenRecord;

    res.json({
      tokenId:      tokenRecord.id,
      supervisorName: internship.supervisor.name,
      studentName:  internship.request.student.fullName,
      companyName:  internship.request.companyName,
      role:         internship.request.role,
      expiresAt:    tokenRecord.expiresAt,
    });
  } catch (err) {
    next(err);
  }
};

// Submit evaluation (no auth required — public endpoint)
// POST /api/evaluation/:token/submit
const submitEvaluation = async (req, res, next) => {
  try {
    const { token } = req.params;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const {
      professionalism,
      technicalSkills,
      communicationSkills,
      teamwork,
      attendanceCommitment,
      overallPerformance,
      comments,
      wouldRecommend,
    } = req.body;

    // Validate all scores
    const scores = {
      professionalism,
      technicalSkills,
      communicationSkills,
      teamwork,
      attendanceCommitment,
      overallPerformance,
    };

    for (const [field, val] of Object.entries(scores)) {
      const n = parseInt(val);
      if (isNaN(n) || n < 1 || n > 5) {
        return res.status(400).json({ error: `${field} must be between 1 and 5` });
      }
    }

    if (wouldRecommend === undefined || wouldRecommend === null) {
      return res.status(400).json({ error: 'wouldRecommend is required' });
    }

    // Re-validate token (atomic check before write)
    const tokenRecord = await prisma.evaluationToken.findUnique({
      where: { tokenHash },
      include: { internship: true },
    });

    if (!tokenRecord)         return res.status(404).json({ error: 'Invalid evaluation link' });
    if (tokenRecord.usedAt)   return res.status(410).json({ error: 'This link has already been used' });
    if (new Date() > new Date(tokenRecord.expiresAt)) {
      return res.status(410).json({ error: 'This evaluation link has expired' });
    }

    // Write submission + mark token used + update internship status — all in one transaction
    await prisma.$transaction(async (tx) => {
      await tx.evaluationSubmission.create({
        data: {
          professionalism:      parseInt(professionalism),
          technicalSkills:      parseInt(technicalSkills),
          communicationSkills:  parseInt(communicationSkills),
          teamwork:             parseInt(teamwork),
          attendanceCommitment: parseInt(attendanceCommitment),
          overallPerformance:   parseInt(overallPerformance),
          comments:             comments || null,
          wouldRecommend:       wouldRecommend === true || wouldRecommend === 'true',
          tokenId:              tokenRecord.id,
          internshipId:         tokenRecord.internshipId,
        },
      });

      // Mark token as used (makes it single-use)
      await tx.evaluationToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      });

      // Update internship evaluation status
      await tx.internship.update({
        where: { id: tokenRecord.internshipId },
        data: { evaluationStatus: 'COMPLETED' },
      });
    });

    res.json({ message: 'Evaluation submitted successfully. Thank you!' });
  } catch (err) {
    next(err);
  }
};

// GET /api/evaluation/results — Committee only
// Returns all internships with evaluation context for the dashboard table
const getEvaluationResults = async (req, res, next) => {
  try {
    const { evaluationStatus, page = 1, limit = 20 } = req.query;

    const where = {};
    if (evaluationStatus) where.evaluationStatus = evaluationStatus;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [internships, total] = await Promise.all([
      prisma.internship.findMany({
        where: {
          ...where,
          request: { status: 'APPROVED' },
        },
        include: {
          supervisor: true,
          request: {
            include: {
              student: { select: { studentId: true, fullName: true, universityEmail: true } },
            },
          },
          evaluationTokens: {
            include: { evaluation: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          evaluation: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.internship.count({
        where: { ...where, request: { status: 'APPROVED' } },
      }),
    ]);

    const rows = internships.map((i) => ({
      internshipId:     i.id,
      studentName:      i.request.student.fullName,
      studentId:        i.request.student.studentId,
      companyName:      i.request.companyName,
      role:             i.request.role,
      startDate:        i.request.startDate,
      endDate:          i.request.endDate,
      evaluationStatus: i.evaluationStatus,
      supervisorName:   i.supervisor?.name || null,
      supervisorEmail:  i.supervisor?.email || null,
      evaluation:       i.evaluation || i.evaluationTokens[0]?.evaluation || null,
    }));

    res.json({
      rows,
      pagination: {
        total,
        page:       parseInt(page),
        limit:      parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getEvaluationContext, submitEvaluation, getEvaluationResults };
