const assert = require('node:assert/strict');
const Module = require('node:module');
const { test } = require('node:test');

let certificate = {
  id: 7,
  documentType: 'COMPLETION_CERTIFICATE',
  studentId: 'S123',
  internshipId: 12,
  reviewedAt: null,
  reviewedById: null,
};
let internshipStatus = 'IN_PROGRESS';
let persistedReview;

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === '@prisma/client') {
    return {
      PrismaClient: class {
        constructor() {
          this.document = {
            findUnique: async () => certificate,
            update: async ({ data }) => {
              persistedReview = data;
              certificate = { ...certificate, ...data };
              return certificate;
            },
            findFirst: async ({ where }) =>
              where.reviewedAt?.not === null && certificate.reviewedAt
                ? certificate
                : null,
          };
          this.internship = {
            findUnique: async () => ({
              id: 12,
              status: internshipStatus,
              request: { studentId: 'S123', student: { studentId: 'S123' } },
            }),
            update: async ({ data }) => {
              internshipStatus = data.status;
              return { id: 12, ...data };
            },
          };
          this.student = { update: async () => ({}) };
          this.$transaction = async callback => callback(this);
        }
      },
    };
  }
  if (request === '../services/email.service') {
    return { sendApprovalEmail: async () => true, sendRejectionEmail: async () => true };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const { markCertificateReviewed } = require('../src/controllers/document.controller');
const { updateInternshipStatus } = require('../src/controllers/internship.controller');
Module._load = originalLoad;

function responseRecorder() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test('admin review records reviewer and review time on certificate', async () => {
  certificate = { ...certificate, documentType: 'COMPLETION_CERTIFICATE', reviewedAt: null };
  persistedReview = null;
  const response = responseRecorder();

  await markCertificateReviewed({
    params: { id: '7' },
    user: { committeeMember: { id: 4 } },
  }, response, assert.fail);

  assert.equal(response.statusCode, 200);
  assert.equal(persistedReview.reviewedById, 4);
  assert.ok(persistedReview.reviewedAt instanceof Date);
});

test('admin cannot complete internship until certificate has been reviewed', async () => {
  certificate = { ...certificate, reviewedAt: null };
  internshipStatus = 'IN_PROGRESS';
  const response = responseRecorder();
  let forwardedError;

  await updateInternshipStatus({
    params: { id: '12' },
    body: { status: 'COMPLETED' },
    user: { committeeMember: { isAdmin: true } },
  }, response, error => { forwardedError = error; });

  assert.equal(response.statusCode, 400);
  assert.match(response.body.error, /review/);
  assert.equal(forwardedError, undefined);
  assert.equal(internshipStatus, 'IN_PROGRESS');
});

test('reviewed certificate allows admin to complete internship', async () => {
  certificate = { ...certificate, reviewedAt: new Date(), reviewedById: 4 };
  internshipStatus = 'IN_PROGRESS';
  const response = responseRecorder();

  await updateInternshipStatus({
    params: { id: '12' },
    body: { status: 'COMPLETED' },
    user: { committeeMember: { isAdmin: true } },
  }, response, assert.fail);

  assert.equal(response.statusCode, 200);
  assert.equal(internshipStatus, 'COMPLETED');
});
