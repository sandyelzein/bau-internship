// src/middleware/auth.middleware.js
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Verify JWT token and attach user to request
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.userAccount.findUnique({
      where: { id: decoded.userId },
      include: {
        student: true,
        committeeMember: true,
        supervisor: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid or inactive account' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Only allow COMMITTEE_MEMBER role
const requireCommittee = (req, res, next) => {
  if (req.user.role !== 'COMMITTEE_MEMBER') {
    return res.status(403).json({ error: 'Committee members only' });
  }
  next();
};

// Only allow STUDENT role
const requireStudent = (req, res, next) => {
  if (req.user.role !== 'STUDENT') {
    return res.status(403).json({ error: 'Students only' });
  }
  next();
};

const requireSupervisor = (req, res, next) => {
  if (req.user.role !== 'SUPERVISOR') {
    return res.status(403).json({ error: 'Supervisors only' });
  }
  next();
};

// Only allow admin committee members
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'COMMITTEE_MEMBER') {
    return res.status(403).json({ error: 'Committee members only' });
  }
  if (!req.user.committeeMember?.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = { authenticate, requireCommittee, requireStudent, requireSupervisor, requireAdmin };
