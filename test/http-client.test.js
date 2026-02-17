import { test, after } from 'node:test';
import assert from 'node:assert';
import { getGlobalDispatcher } from 'undici';
import { HttpClient } from '../src/lib/http-client.js';

// Close undici connection pool after all tests to prevent hang
after(async () => {
  await getGlobalDispatcher().close();
});

test('HttpClient - GET request to httpbin', async () => {
  const client = new HttpClient();
  const response = await client.get('https://httpbin.org/get');
  
  assert.strictEqual(response.status, 200);
  assert.ok(response.body);
  assert.ok(response.responseTime > 0);
  assert.ok(response.size > 0);
});

test('HttpClient - POST request with JSON', async () => {
  const client = new HttpClient();
  const response = await client.post('https://httpbin.org/post', {
    json: { name: 'Test', value: 123 },
  });
  
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.json.name, 'Test');
  assert.strictEqual(response.body.json.value, 123);
});

test('HttpClient - Custom headers', async () => {
  const client = new HttpClient();
  const response = await client.get('https://httpbin.org/headers', {
    headers: {
      'X-Custom-Header': 'test-value',
    },
  });
  
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.headers['X-Custom-Header'], 'test-value');
});

test('HttpClient - 404 error', async () => {
  const client = new HttpClient();
  const response = await client.get('https://httpbin.org/status/404');
  
  assert.strictEqual(response.status, 404);
});

test('HttpClient - DNS error handling', async () => {
  const client = new HttpClient();
  
  await assert.rejects(
    async () => await client.get('https://this-domain-does-not-exist-12345.com'),
    /DNS lookup failed/
  );
});

test('HttpClient - Timeout error handling', async () => {
  const client = new HttpClient({ timeout: 100 });
  
  try {
    await client.get('https://httpbin.org/delay/5');
    assert.fail('Should have thrown timeout error');
  } catch (err) {
    // Accept either timeout or connection reset errors
    assert.ok(
      err.message.includes('timeout') || 
      err.message.includes('timed out') ||
      err.code === 'UND_ERR_HEADERS_TIMEOUT' ||
      err.code === 'UND_ERR_BODY_TIMEOUT',
      `Expected timeout error but got: ${err.message}`
    );
  }
});
