const assert = require('node:assert/strict');
const express = require('express');
const { once } = require('node:events');
const { test } = require('node:test');
const { publicFormLimiter } = require('../src/middleware/form-security.middleware');

test('public form limiter returns 429 when request limit is exceeded', async () => {
  const app = express();
  app.use(publicFormLimiter);
  app.get('/form', (req, res) => res.sendStatus(204));

  const server = app.listen(0);
  await once(server, 'listening');
  const address = server.address();

  try {
    const statuses = [];
    for (let attempt = 0; attempt < 21; attempt++) {
      const response = await fetch(`http://127.0.0.1:${address.port}/form`);
      statuses.push(response.status);
    }

    assert.equal(statuses.filter(status => status === 204).length, 20);
    assert.equal(statuses.at(-1), 429);
  } finally {
    server.close();
    await once(server, 'close');
  }
});
