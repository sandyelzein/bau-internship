// src/controllers/dashboard.controller.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// GET /api/dashboard/stats — Committee only
const getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalStudents,
      studentsWithoutAccounts,
      completedInternships,
      inProgressInternships,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
    ] = await Promise.all([
      prisma.student.count(),
      prisma.student.count({ where: { userId: null } }),
      prisma.student.count({ where: { internshipStatus: 'COMPLETED' } }),
      prisma.student.count({ where: { internshipStatus: 'IN_PROGRESS' } }),
      prisma.internshipRequest.count({ where: { status: 'PENDING' } }),
      prisma.internshipRequest.count({ where: { status: 'APPROVED' } }),
      prisma.internshipRequest.count({ where: { status: 'REJECTED' } }),
    ]);

    // Students without any internship requests
    const studentsWithRequests = await prisma.student.count({
      where: {
        internshipRequests: { some: {} },
      },
    });
    const studentsWithoutRequests = totalStudents - studentsWithRequests;

    res.json({
      totalStudents,
      studentsWithoutAccounts,
      studentsWithoutRequests,
      completedInternships,
      inProgressInternships,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboardStats };
