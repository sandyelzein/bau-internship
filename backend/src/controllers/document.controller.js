// src/controllers/document.controller.js
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

const VALID_TYPES = ['COMPLETION_CERTIFICATE', 'RECOMMENDATION_LETTER'];

// POST /api/documents/upload
// Student uploads a document
const uploadDocument = async (req, res, next) => {
  try {
    const studentId = req.user.student?.studentId;
    if (!studentId) {
      return res.status(400).json({ error: 'Student profile not found' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'File is required' });
    }

    const { documentType, internshipId } = req.body;
    if (!VALID_TYPES.includes(documentType)) {
      return res.status(400).json({
        error: `Invalid document type. Must be one of: ${VALID_TYPES.join(', ')}`,
      });
    }

    const parsedInternshipId = parseInt(internshipId);
    const internship = await prisma.internship.findFirst({
      where: { id: parsedInternshipId, request: { studentId } },
    });
    if (!internship) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Internship not found' });
    }
    const certificateCanBeSubmitted = documentType === 'COMPLETION_CERTIFICATE'
      && internship.status === 'IN_PROGRESS';
    if (internship.status !== 'COMPLETED' && !certificateCanBeSubmitted) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: documentType === 'COMPLETION_CERTIFICATE'
        ? 'A completion certificate can be uploaded while the internship is in progress or completed'
        : 'This document can only be uploaded after the internship is completed' });
    }

    // Build a relative path to store in DB (relative to /uploads)
    const relativePath = path.relative(
      path.join(__dirname, '../../uploads'),
      req.file.path
    ).split(path.sep).join('/');

    const document = await prisma.document.create({
      data: {
        documentType,
        fileName: req.file.originalname,
        filePath: relativePath,
        fileSize: req.file.size,
        studentId,
        internshipId: parsedInternshipId,
      },
    });

    res.status(201).json({
      message: 'Document uploaded successfully',
      document,
    });
  } catch (err) {
    // Clean up uploaded file on DB error
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(err);
  }
};

// GET /api/documents/my-internships
// The student-facing document area is organized by internship, not student.
const getMyInternships = async (req, res, next) => {
  try {
    const studentId = req.user.student?.studentId;
    const internships = await prisma.internship.findMany({
      where: { request: { studentId, status: 'APPROVED' } },
      include: {
        request: { select: { requestCode: true, companyName: true, role: true, startDate: true, endDate: true } },
        documents: { orderBy: { uploadedAt: 'desc' } },
        supervisor: { select: { id: true, position: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(internships);
  } catch (err) {
    next(err);
  }
};

// GET /api/documents/my
// Student views their own documents
const getMyDocuments = async (req, res, next) => {
  try {
    const studentId = req.user.student?.studentId;
    const documents = await prisma.document.findMany({
      where: { studentId },
      orderBy: { uploadedAt: 'desc' },
    });
    res.json(documents);
  } catch (err) {
    next(err);
  }
};

// GET /api/documents/student/:studentId — Committee only
const getStudentDocuments = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const documents = await prisma.document.findMany({
      where: { studentId },
      orderBy: { uploadedAt: 'desc' },
    });
    res.json(documents);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/documents/:id — Student deletes own document
const deleteDocument = async (req, res, next) => {
  try {
    const studentId = req.user.student?.studentId;
    const docId = parseInt(req.params.id);

    const doc = await prisma.document.findUnique({ where: { id: docId } });
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Students can only delete their own documents
    if (req.user.role === 'STUDENT' && doc.studentId !== studentId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete from filesystem
    const fullPath = path.join(__dirname, '../../uploads', doc.filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    await prisma.document.delete({ where: { id: docId } });

    res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  uploadDocument,
  getMyDocuments,
  getMyInternships,
  getStudentDocuments,
  deleteDocument,
};
