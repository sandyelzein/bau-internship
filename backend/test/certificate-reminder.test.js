const assert = require('node:assert/strict');
const Module = require('node:module');
const { test } = require('node:test');

let queriedWhere;
let updatedData;
let sentReminder;
let reminderResult = true;
const internship = {
  id: 21,
  request: {
    student: { fullName: 'Test Student', universityEmail: 'student@example.com' },
    companyName: 'Test Company',
  },
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'node-cron') return { schedule: () => ({}) };
  if (request === '@prisma/client') {
    return {
      PrismaClient: class {
        constructor() {
          this.internship = {
            findMany: async ({ where }) => { queriedWhere = where; return [internship]; },
            update: async ({ data }) => { updatedData = data; return {}; },
          };
        }
      },
    };
  }
  if (request === './email.service') {
    return {
      sendSupervisorReminderEmail: async () => true,
      sendSupervisorMissingEmail: async () => true,
      sendCompletionCertificateReminderEmail: async details => {
        sentReminder = details;
        return reminderResult;
      },
      sendEvaluationRequestEmail: async () => true,
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const { runCompletionCertificateReminderJob } = require('../src/services/scheduler.service');
Module._load = originalLoad;

test('certificate reminder targets ended internships without certificates', async () => {
  queriedWhere = null;
  updatedData = null;
  sentReminder = null;
  reminderResult = true;

  await runCompletionCertificateReminderJob();

  assert.equal(queriedWhere.status, 'IN_PROGRESS');
  assert.ok(queriedWhere.request.endDate.lte instanceof Date);
  assert.equal(queriedWhere.certificateReminderSentAt, null);
  assert.deepEqual(queriedWhere.documents, { none: { documentType: 'COMPLETION_CERTIFICATE' } });
  assert.equal(sentReminder.studentEmail, 'student@example.com');
  assert.ok(updatedData.certificateReminderSentAt instanceof Date);
});

test('failed certificate reminder is not marked as sent', async () => {
  updatedData = null;
  reminderResult = false;

  await runCompletionCertificateReminderJob();

  assert.equal(updatedData, null);
});
