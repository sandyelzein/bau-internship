const assert = require('node:assert/strict');
const Module = require('node:module');
const { test } = require('node:test');

const originalLoad = Module._load;
let sentMessage;
let emailLog;

process.env.EMAIL_MODE = 'REAL';
process.env.SMTP_USER = 'test-user';
process.env.SMTP_PASS = 'test-pass';
process.env.SMTP_FROM = 'BAU Test <test@example.com>';

Module._load = function (request, parent, isMain) {
  if (request === 'nodemailer') {
    return {
      createTransport: () => ({
        sendMail: async (message) => {
          sentMessage = message;
          return { messageId: 'test-message' };
        },
      }),
    };
  }
  if (request === '@prisma/client') {
    return {
      PrismaClient: class {
        constructor() {
          this.emailLog = {
            create: async ({ data }) => {
              emailLog = data;
              return data;
            },
          };
        }
      },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const { sendManualEmail } = require('../src/services/email.service');
Module._load = originalLoad;

let committeeSend;
let committeeSendResult = true;
Module._load = function (request, parent, isMain) {
  if (request === '../services/email.service') {
    return {
      sendManualEmail: async (email) => {
        committeeSend = email;
        return committeeSendResult;
      },
    };
  }
  if (request === '../services/import.service') {
    return { processStudentImport: async () => ({}), processSupervisorImport: async () => ({}) };
  }
  if (request === 'bcryptjs') return {};
  return originalLoad.call(this, request, parent, isMain);
};
const { sendTestEmail } = require('../src/controllers/committee.controller');
Module._load = originalLoad;

test('sendManualEmail sends and logs a safely escaped email', async () => {
  const sent = await sendManualEmail({
    to: 'recipient@example.com',
    subject: 'Test message',
    message: '<script>alert("unsafe")</script>\nSecond line',
  });

  assert.equal(sent, true);
  assert.equal(sentMessage.to, 'recipient@example.com');
  assert.equal(sentMessage.subject, 'Test message');
  assert.match(sentMessage.html, /&lt;script&gt;/);
  assert.doesNotMatch(sentMessage.html, /<script>/);
  assert.equal(emailLog.recipient, 'recipient@example.com');
  assert.equal(emailLog.status, 'SENT');
  assert.equal(emailLog.triggerType, 'MANUAL');
});

test('sendTestEmail rejects invalid recipients', async () => {
  const response = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };

  await sendTestEmail({ body: { to: 'not-an-email', subject: 'Test', message: 'Hello' } }, response, assert.fail);

  assert.equal(response.statusCode, 400);
  assert.equal(committeeSend, undefined);
});

test('sendTestEmail sends valid messages and returns success', async () => {
  committeeSendResult = true;
  const response = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };

  await sendTestEmail({
    body: { to: 'recipient@example.com', subject: 'Test', message: 'Hello' },
  }, response, assert.fail);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.sent, true);
  assert.equal(committeeSend.to, 'recipient@example.com');
});

test('sendTestEmail reports delivery failures instead of success', async () => {
  committeeSendResult = false;
  const response = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };

  await sendTestEmail({
    body: { to: 'recipient@example.com', subject: 'Test', message: 'Hello' },
  }, response, assert.fail);

  assert.equal(response.statusCode, 502);
  assert.match(response.body.error, /Email delivery failed/);
});
