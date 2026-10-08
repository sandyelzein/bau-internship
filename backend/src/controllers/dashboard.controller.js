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
      prisma.internship.count({ where: { status: 'COMPLETED' } }),
      prisma.internship.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.internshipRequest.count({ where: { status: 'PENDING' } }),
      prisma.internshipRequest.count({ where: { status: 'APPROVED' } }),
      prisma.internshipRequest.count({ where: { status: 'REJECTED' } }),
    ]);

    // This metric intentionally counts only registered students. Imported students
    // without accounts are already represented by studentsWithoutAccounts.
    const studentsWithoutRequests = await prisma.student.count({
      where: {
        userId: { not: null },
        internshipRequests: { none: {} },
      },
    });

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
