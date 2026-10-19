// src/controllers/student.controller.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// GET /api/students/profile
// Student views own profile
const getMyProfile = async (req, res, next) => {
  try {
    const studentId = req.user.student?.studentId;
    const student = await prisma.student.findUnique({
      where: { studentId },
      include: {
        internshipRequests: {
          orderBy: { submittedAt: 'desc' },
          take: 1,
        },
        documents: true,
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    res.json(student);
  } catch (err) {
    next(err);
  }
};

// GET /api/students — Committee only
// List all students with filters
const getAllStudents = async (req, res, next) => {
  try {
    const {
      academicYear,
      internshipStatus,
      graduationStatus,
      hasAccount,
      hasRequest,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const where = {};

    if (academicYear) where.academicYear = { contains: String(academicYear), mode: 'insensitive' };
    if (internshipStatus) where.internshipRequests = { some: { internship: { status: internshipStatus } } };
    if (graduationStatus) where.graduationStatus = graduationStatus;

    if (hasAccount === 'false') where.userId = null;
    if (hasAccount === 'true') where.userId = { not: null };
    if (hasRequest === 'false') where.internshipRequests = { none: {} };
    if (hasRequest === 'true') where.internshipRequests = { some: {} };

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { studentId: { contains: search, mode: 'insensitive' } },
        { universityEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let students = await prisma.student.findMany({
      where,
      include: {
        internshipRequests: {
          orderBy: { submittedAt: 'desc' },
          take: 1,
          select: {
            id: true,
            requestCode: true,
            status: true,
            submittedAt: true,
            internship: { select: { id: true, status: true } },
          },
        },
        _count: { select: { internshipRequests: true } },
      },
      orderBy: { fullName: 'asc' },
      skip,
      take: parseInt(limit),
    });

    const total = await prisma.student.count({ where });

    res.json({
      students,
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

// GET /api/students/:studentId — Committee only
const getStudentById = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    const student = await prisma.student.findUnique({
      where: { studentId },
      include: {
        internshipRequests: {
          include: {
            internship: true,
            reviewedBy: { select: { fullName: true } },
          },
          orderBy: { submittedAt: 'desc' },
        },
        documents: {
          include: { internship: { include: { request: { select: { requestCode: true, companyName: true } } } } },
        },
        user: {
          select: { id: true, email: true, isActive: true, createdAt: true },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(student);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/students/:studentId — Committee only
// Update student fields (academicYear, internshipStatus, GPA, graduationStatus)
const updateStudent = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { academicYear, gpa, graduationStatus } = req.body;

    const student = await prisma.student.findUnique({ where: { studentId } });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Business rule: cannot graduate if internship not completed
    if (
      graduationStatus === 'GRADUATED' &&
      !(await prisma.internship.findFirst({
        where: { status: 'COMPLETED', request: { studentId } },
      }))
    ) {
      return res.status(400).json({
        error: 'Student cannot be marked as graduated unless internship is completed',
      });
    }

    const updateData = {};
    if (academicYear !== undefined) updateData.academicYear = academicYear ? String(academicYear).trim() : null;
    if (gpa !== undefined && gpa !== '') updateData.gpa = parseFloat(gpa);
    if (graduationStatus !== undefined) updateData.graduationStatus = graduationStatus;

    const updated = await prisma.student.update({
      where: { studentId },
      data: updateData,
    });

    res.json({ message: 'Student updated successfully', student: updated });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyProfile,
  getAllStudents,
  getStudentById,
  updateStudent,
};
