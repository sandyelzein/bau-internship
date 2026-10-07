// src/controllers/auth.controller.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// POST /api/auth/login
// Used by both students and committee members
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.userAccount.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        student: true,
        committeeMember: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user.id);

    // Build profile based on role
    const profile =
      user.role === 'STUDENT'
        ? {
            studentId: user.student?.studentId,
            fullName: user.student?.fullName,
            email: user.email,
          }
        : {
            memberId: user.committeeMember?.id,
            fullName: user.committeeMember?.fullName,
            isAdmin: user.committeeMember?.isAdmin,
            email: user.email,
          };

    res.json({
      token,
      role: user.role,
      profile,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/register
// Students only — student must already exist in DB (imported via Excel)
const register = async (req, res, next) => {
  try {
    const { studentId, email, password, gpa } = req.body;

    // Validation
    if (!studentId || !email || !password) {
      return res.status(400).json({ error: 'Student ID, email, and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Find student by ID
    const student = await prisma.student.findUnique({
      where: { studentId },
    });

    if (!student) {
      return res.status(404).json({
        error: 'Student ID not found. Please contact the department if you believe this is an error.',
      });
    }

    // Verify email matches stored university email
    if (student.universityEmail.toLowerCase() !== email.toLowerCase()) {
      return res.status(400).json({
        error: 'Email does not match our records for this Student ID',
      });
    }

    // Check if student already has an account
    if (student.userId !== null) {
      return res.status(409).json({ error: 'An account already exists for this Student ID' });
    }

    // Check if email is already used in UserAccount
    const existingUser = await prisma.userAccount.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user account and link to student in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const userAccount = await tx.userAccount.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          role: 'STUDENT',
        },
      });

      // Update student: link userId and optionally update GPA
      const updatedStudent = await tx.student.update({
        where: { studentId },
        data: {
          userId: userAccount.id,
          ...(gpa !== undefined && gpa !== '' ? { gpa: parseFloat(gpa) } : {}),
        },
      });

      return { userAccount, student: updatedStudent };
    });

    const token = generateToken(result.userAccount.id);

    res.status(201).json({
      message: 'Registration successful',
      token,
      role: 'STUDENT',
      profile: {
        studentId: result.student.studentId,
        fullName: result.student.fullName,
        email: result.userAccount.email,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  const user = req.user;

  const profile =
    user.role === 'STUDENT'
      ? {
          studentId: user.student?.studentId,
          fullName: user.student?.fullName,
          email: user.email,
          gpa: user.student?.gpa,
          completedCredits: user.student?.completedCredits,
          academicYear: user.student?.academicYear,
          campus: user.student?.campus,
          phone: user.student?.phone,
          internshipStatus: user.student?.internshipStatus,
          graduationStatus: user.student?.graduationStatus,
        }
      : {
          memberId: user.committeeMember?.id,
          fullName: user.committeeMember?.fullName,
          isAdmin: user.committeeMember?.isAdmin,
          email: user.email,
        };

  res.json({ role: user.role, profile });
};

module.exports = { login, register, getMe };
