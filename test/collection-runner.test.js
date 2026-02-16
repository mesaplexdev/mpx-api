import { test } from 'node:test';
import assert from 'node:assert';
import { runCollection } from '../src/lib/collection-runner.js';

test('collection-runner - simple GET request', async () => {
  const collection = {
    name: 'Test',
    requests: [
      {
        name: 'test-request',
        method: 'GET',
        url: 'https://httpbin.org/get',
      },
    ],
  };
  
  const results = await runCollection(collection);
  
  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].name, 'test-request');
  assert.strictEqual(results[0].passed, true);
  assert.strictEqual(results[0].response.status, 200);
});

test('collection-runner - request with assertions', async () => {
  const collection = {
    name: 'Test',
    requests: [
      {
        name: 'test-with-assert',
        method: 'GET',
        url: 'https://httpbin.org/get',
        assert: {
          status: 200,
          'headers.content-type': 'application/json',
        },
      },
    ],
  };
  
  const results = await runCollection(collection);
  
  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].passed, true);
  assert.ok(results[0].assertions.length > 0);
  assert.strictEqual(results[0].assertions.every(a => a.passed), true);
});

test('collection-runner - failed assertion', async () => {
  const collection = {
    name: 'Test',
    requests: [
      {
        name: 'should-fail',
        method: 'GET',
        url: 'https://httpbin.org/get',
        assert: {
          status: 404, // Should be 200
        },
      },
    ],
  };
  
  const results = await runCollection(collection);
  
  assert.strictEqual(results[0].passed, false);
  assert.strictEqual(results[0].assertions[0].passed, false);
});

test('collection-runner - request chaining', async () => {
  const collection = {
    name: 'Chaining Test',
    requests: [
      {
        name: 'first',
        method: 'GET',
        url: 'https://httpbin.org/json',
      },
      {
        name: 'second',
        method: 'GET',
        url: 'https://httpbin.org/get',
        headers: {
          'X-Test': '{{first.response.body.slideshow.title}}',
        },
      },
    ],
  };
  
  const results = await runCollection(collection);
  
  assert.strictEqual(results.length, 2);
  assert.strictEqual(results[0].passed, true);
  assert.strictEqual(results[1].passed, true);
  
  // Verify the chained header was interpolated
  const sentHeaders = results[1].response.body.headers;
  assert.ok(sentHeaders['X-Test']);
  assert.notStrictEqual(sentHeaders['X-Test'], '{{first.response.body.slideshow.title}}');
});
