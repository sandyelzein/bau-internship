const assert = require('node:assert/strict');
const Module = require('node:module');
const { test } = require('node:test');

const originalLoad = Module._load;
let existingRequestStatus = 'APPROVED';
let existingInternshipStatus = 'IN_PROGRESS';
let activeRequestQuery;
let reviewRequestRecord;
Module._load = function (request, parent, isMain) {
  if (request === '@prisma/client') {
    return {
      PrismaClient: class {
        constructor() {
          this.systemSetting = { findUnique: async () => null };
          this.internshipRequest = {
            findUnique: async () => reviewRequestRecord,
            findFirst: async ({ where }) => {
              activeRequestQuery = where;
              const branches = where.OR || [];
              const includesPending = branches.some(branch => branch.status === 'PENDING');
              const excludesCompleted = branches.some(branch =>
                branch.status === 'APPROVED' &&
                branch.internship?.isNot?.status === 'COMPLETED'
              );
              const canMatchPending = includesPending && existingRequestStatus === 'PENDING';
              const canMatchActiveApproved = excludesCompleted &&
                existingRequestStatus === 'APPROVED' &&
                existingInternshipStatus !== 'COMPLETED';
              const legacyApprovedFilter = where.status?.in?.includes('APPROVED') &&
                existingRequestStatus === 'APPROVED';
              return canMatchPending || canMatchActiveApproved || legacyApprovedFilter
                ? { requestCode: 'REQ-2026-00001', status: existingRequestStatus }
                : null;
            },
            count: async () => 0,
            create: async ({ data }) => ({ id: 100, ...data }),
          };
          this.$transaction = async callback => callback({
            internshipRequest: {
              create: async ({ data }) => ({ id: 100, ...data }),
              update: async ({ data }) => data,
            },
            internship: { create: async () => ({}) },
            student: { update: async () => ({}) },
          });
        }
      },
    };
  }
  if (request === '../services/email.service') {
    return { sendApprovalEmail: async () => true, sendRejectionEmail: async () => true };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const { submitRequest, reviewRequest } = require('../src/controllers/internship.controller');
Module._load = originalLoad;

function createRequestHarness(body = {}) {
  const response = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  let forwardedError;

  const request = submitRequest({
    user: { student: { studentId: 'S123' } },
    body: {
      companyName: 'Example Co',
      role: 'Intern',
      tasks: 'Development work',
      startDate: '2026-01-01',
      endDate: '2026-04-01',
      ...body,
    },
    files: {
      acceptanceLetter: [{ path: 'missing-acceptance.pdf' }],
      taskDocuments: [{ path: 'missing-tasks.pdf' }],
    },
  }, response, error => { forwardedError = error; });

  return { request, response, getForwardedError: () => forwardedError };
}

test('duplicate active request returns conflict without throwing during uploaded-file cleanup', async () => {
  existingRequestStatus = 'APPROVED';
  existingInternshipStatus = 'IN_PROGRESS';
  const { request, response, getForwardedError } = createRequestHarness();
  await request;

  assert.equal(response.statusCode, 409);
  assert.match(response.body.error, /active internship request/);
  assert.equal(getForwardedError(), undefined);
});

test('completed internship no longer blocks a new request', async () => {
  existingRequestStatus = 'APPROVED';
  existingInternshipStatus = 'COMPLETED';
  const { request, response, getForwardedError } = createRequestHarness();
  await request;

  assert.equal(response.statusCode, 201);
  assert.equal(response.body.message, 'Internship request submitted successfully');
  assert.equal(getForwardedError(), undefined);
  assert.ok(activeRequestQuery.OR.some(branch =>
    branch.status === 'APPROVED' &&
    branch.internship?.isNot?.status === 'COMPLETED'
  ));
});

test('internship request shorter than 14 days is rejected', async () => {
  existingRequestStatus = 'APPROVED';
  existingInternshipStatus = 'COMPLETED';
  const { request, response, getForwardedError } = createRequestHarness({
    startDate: '2026-01-01',
    endDate: '2026-01-14',
  });
  await request;

  assert.equal(response.statusCode, 400);
  assert.match(response.body.error, /at least 2 weeks \(14 days\)/);
  assert.equal(getForwardedError(), undefined);
});

test('a request of exactly 14 days is accepted', async () => {
  existingRequestStatus = 'APPROVED';
  existingInternshipStatus = 'COMPLETED';
  const { request, response, getForwardedError } = createRequestHarness({
    startDate: '2026-01-01',
    endDate: '2026-01-15',
  });
  await request;

  assert.equal(response.statusCode, 201);
  assert.equal(getForwardedError(), undefined);
});

test('committee cannot approve an internship shorter than 14 days', async () => {
  reviewRequestRecord = {
    id: 12,
    status: 'PENDING',
    startDate: new Date('2026-01-01T00:00:00Z'),
    endDate: new Date('2026-01-14T00:00:00Z'),
  };
  const response = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  let forwardedError;

  await reviewRequest({
    params: { id: '12' },
    body: { status: 'APPROVED' },
    user: { committeeMember: { id: 1 } },
  }, response, error => { forwardedError = error; });

  assert.equal(response.statusCode, 400);
  assert.match(response.body.error, /at least 2 weeks \(14 days\)/);
  assert.equal(forwardedError, undefined);
});
