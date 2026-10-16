// src/controllers/auth.controller.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
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
        supervisor: true,
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
    const profile = user.role === 'STUDENT'
        ? {
            studentId: user.student?.studentId,
            fullName: user.student?.fullName,
            email: user.email,
          }
        : user.role === 'SUPERVISOR'
        ? {
            supervisorId: user.supervisor?.id,
            fullName: user.supervisor?.name,
            position: user.supervisor?.position,
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

// POST /api/auth/register-supervisor
// A supervisor can claim an account only after a student has submitted that email.
const registerSupervisor = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const supervisor = await prisma.supervisor.findUnique({ where: { email: normalizedEmail } });
    if (!supervisor) {
      return res.status(404).json({ error: 'No supervisor invitation was found for this email' });
    }
    if (supervisor.userId) {
      return res.status(409).json({ error: 'An account already exists for this supervisor' });
    }
    const existingUser = await prisma.userAccount.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await prisma.$transaction(async (tx) => {
      const userAccount = await tx.userAccount.create({
        data: { email: normalizedEmail, passwordHash, role: 'SUPERVISOR' },
      });
      const updatedSupervisor = await tx.supervisor.update({
        where: { id: supervisor.id },
        data: { userId: userAccount.id },
      });
      return { userAccount, supervisor: updatedSupervisor };
    });

    res.status(201).json({
      message: 'Supervisor account created',
      token: generateToken(result.userAccount.id),
      role: 'SUPERVISOR',
      profile: {
        supervisorId: result.supervisor.id,
        fullName: result.supervisor.name,
        position: result.supervisor.position,
        email: result.userAccount.email,
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { studentId, fullName, email, password, gpa } = req.body;
    const publicStudentSignup = process.env.ALLOW_PUBLIC_STUDENT_SIGNUP === 'true';

    if ((!studentId && !publicStudentSignup) || !email || !password) {
      return res.status(400).json({ error: 'Student ID, email, and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await prisma.userAccount.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    let student = null;
    if (studentId) {
      student = await prisma.student.findUnique({ where: { studentId } });
      if (!student && !publicStudentSignup) {
        return res.status(404).json({ error: 'Student ID not found. Please contact the department if you believe this is an error.' });
      }
      if (student && student.universityEmail.toLowerCase() !== normalizedEmail) {
        return res.status(400).json({ error: 'Email does not match our records for this Student ID' });
      }
    }

    if (student?.userId !== null && student) {
      return res.status(409).json({ error: 'An account already exists for this Student ID' });
    }

    if (publicStudentSignup && !studentId) {
      if (!fullName?.trim()) {
        return res.status(400).json({ error: 'Full name is required for test registration' });
      }
      student = await prisma.student.findUnique({ where: { universityEmail: normalizedEmail } });
      if (student?.userId) {
        return res.status(409).json({ error: 'An account already exists for this student' });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await prisma.$transaction(async (tx) => {
      const userAccount = await tx.userAccount.create({
        data: { email: normalizedEmail, passwordHash, role: 'STUDENT' },
      });

      const studentData = {
        userId: userAccount.id,
        ...(gpa !== undefined && gpa !== '' ? { gpa: parseFloat(gpa) } : {}),
      };
      const updatedStudent = student
        ? await tx.student.update({ where: { studentId: student.studentId }, data: studentData })
        : await tx.student.create({
          data: {
            studentId: `TEST-${crypto.randomBytes(8).toString('hex').toUpperCase()}`,
            fullName: fullName.trim(),
            universityEmail: normalizedEmail,
            ...studentData,
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

const getRegistrationSettings = (req, res) => {
  res.json({ publicStudentSignup: process.env.ALLOW_PUBLIC_STUDENT_SIGNUP === 'true' });
};

// GET /api/auth/me
const getMe = async (req, res) => {
  const user = req.user;

  const profile = user.role === 'STUDENT'
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
      : user.role === 'SUPERVISOR'
      ? {
          supervisorId: user.supervisor?.id,
          fullName: user.supervisor?.name,
          position: user.supervisor?.position,
          email: user.email,
        }
      : {
          memberId: user.committeeMember?.id,
          fullName: user.committeeMember?.fullName,
          isAdmin: user.committeeMember?.isAdmin,
          email: user.email,
        };

  res.json({ role: user.role, profile });
};

module.exports = { login, register, registerSupervisor, getMe, getRegistrationSettings };
