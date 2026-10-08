const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findStudentInternship(studentId) {
  return prisma.internship.findFirst({
    where: { request: { studentId, status: 'APPROVED' } },
    include: { supervisor: true, request: true },
    orderBy: { createdAt: 'desc' },
  });
}

const getMySupervisor = async (req, res, next) => {
  try {
    const internship = await findStudentInternship(req.user.student?.studentId);
    if (!internship) return res.status(404).json({ error: 'No approved internship found' });
    res.json({ internshipId: internship.id, evaluationStatus: internship.evaluationStatus, supervisor: internship.supervisor, startDate: internship.request.startDate, endDate: internship.request.endDate });
  } catch (err) { next(err); }
};

const createMySupervisor = async (req, res, next) => {
  try {
    const { title, name, email, phone } = req.body;
    if (!title?.trim() || !name?.trim() || !email?.trim()) return res.status(400).json({ error: 'Supervisor title, name, and email are required' });
    const internship = await findStudentInternship(req.user.student?.studentId);
    if (!internship) return res.status(404).json({ error: 'No approved internship found' });
    if (internship.supervisor) return res.status(409).json({ error: 'A supervisor is already assigned' });

    const normalizedEmail = email.trim().toLowerCase();
    let supervisor = await prisma.supervisor.findUnique({ where: { email: normalizedEmail } });
    if (!supervisor) {
      supervisor = await prisma.supervisor.create({ data: { title: title.trim(), name: name.trim(), email: normalizedEmail, phone: phone?.trim() || null } });
    }
    await prisma.internship.update({ where: { id: internship.id }, data: { supervisorId: supervisor.id } });
    res.status(201).json({
      message: supervisor.userId ? 'Supervisor assigned successfully' : 'Supervisor saved. They can now create an account using this email.',
      supervisor,
    });
  } catch (err) { next(err); }
};

const updateMySupervisor = async (req, res, next) => {
  try {
    const { title, name, email, phone } = req.body;
    if (!title?.trim() || !name?.trim() || !email?.trim()) return res.status(400).json({ error: 'Supervisor title, name, and email are required' });
    const internship = await findStudentInternship(req.user.student?.studentId);
    if (!internship?.supervisor) return res.status(404).json({ error: 'No supervisor found to update' });
    if (internship.supervisor.userId) return res.status(403).json({ error: 'This supervisor has activated their account; contact an administrator to change their profile' });
    const updated = await prisma.supervisor.update({
      where: { id: internship.supervisor.id },
      data: { title: title.trim(), name: name.trim(), email: email.trim().toLowerCase(), phone: phone?.trim() || null },
    });
    res.json({ message: 'Supervisor information updated', supervisor: updated });
  } catch (err) { next(err); }
};

const getSupervisorByInternship = async (req, res, next) => {
  try {
    const internship = await prisma.internship.findUnique({ where: { id: parseInt(req.params.internshipId) }, include: { supervisor: true } });
    res.json(internship?.supervisor || null);
  } catch (err) { next(err); }
};

const getAssignedInternships = async (req, res, next) => {
  try {
    const internships = await prisma.internship.findMany({
      where: { supervisorId: req.user.supervisor?.id },
      include: {
        request: { include: { student: { select: { studentId: true, fullName: true, universityEmail: true, campus: true } } } },
        documents: { where: { documentType: 'COMPLETION_CERTIFICATE' }, orderBy: { uploadedAt: 'desc' } },
        evaluation: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(internships);
  } catch (err) { next(err); }
};

const submitAuthenticatedEvaluation = async (req, res, next) => {
  try {
    const supervisorId = req.user.supervisor?.id;
    const internshipId = parseInt(req.params.internshipId);
    const internship = await prisma.internship.findFirst({ where: { id: internshipId, supervisorId } });
    if (!internship) return res.status(404).json({ error: 'Assigned internship not found' });
    if (await prisma.evaluationSubmission.findUnique({ where: { internshipId } })) return res.status(409).json({ error: 'An evaluation has already been submitted for this internship' });

    const scoreFields = ['professionalism', 'technicalSkills', 'communicationSkills', 'teamwork', 'attendanceCommitment', 'overallPerformance'];
    const data = {};
    for (const field of scoreFields) {
      const value = parseInt(req.body[field]);
      if (Number.isNaN(value) || value < 1 || value > 5) return res.status(400).json({ error: `${field} must be between 1 and 5` });
      data[field] = value;
    }
    if (!req.body.grade?.trim()) return res.status(400).json({ error: 'Grade is required' });
    if (req.body.wouldRecommend === undefined || req.body.wouldRecommend === null) return res.status(400).json({ error: 'Recommendation is required' });

    const evaluation = await prisma.$transaction(async (tx) => {
      const created = await tx.evaluationSubmission.create({
        data: { ...data, grade: req.body.grade.trim(), comments: req.body.comments?.trim() || null, wouldRecommend: req.body.wouldRecommend === true || req.body.wouldRecommend === 'true', internshipId, supervisorId },
      });
      await tx.internship.update({ where: { id: internshipId }, data: { evaluationStatus: 'COMPLETED' } });
      return created;
    });
    res.status(201).json({ message: 'Evaluation and grade submitted successfully', evaluation });
  } catch (err) { next(err); }
};

module.exports = { getMySupervisor, createMySupervisor, updateMySupervisor, getSupervisorByInternship, getAssignedInternships, submitAuthenticatedEvaluation };
