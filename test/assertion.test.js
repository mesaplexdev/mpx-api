import { test } from 'node:test';
import assert from 'node:assert';
import { runAssertions } from '../src/lib/assertion.js';

test('assertion - status code', () => {
  const response = { status: 200 };
  const assertions = { status: 200 };
  
  const results = runAssertions(response, assertions);
  
  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].passed, true);
});

test('assertion - status code failure', () => {
  const response = { status: 404 };
  const assertions = { status: 200 };
  
  const results = runAssertions(response, assertions);
  
  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].passed, false);
});

test('assertion - response time less than', () => {
  const response = { responseTime: 150 };
  const assertions = { responseTime: { lt: 200 } };
  
  const results = runAssertions(response, assertions);
  
  assert.strictEqual(results[0].passed, true);
});

test('assertion - response time failure', () => {
  const response = { responseTime: 550 };
  const assertions = { responseTime: { lt: 500 } };
  
  const results = runAssertions(response, assertions);
  
  assert.strictEqual(results[0].passed, false);
});

test('assertion - header contains', () => {
  const response = {
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
  };
  const assertions = { 'headers.content-type': 'application/json' };
  
  const results = runAssertions(response, assertions);
  
  assert.strictEqual(results[0].passed, true);
});

test('assertion - body field equality', () => {
  const response = {
    body: {
      users: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ],
    },
  };
  
  const assertions = {
    'body.users[0].name': 'Alice',
    'body.users.length': { gt: 0 },
  };
  
  const results = runAssertions(response, assertions);
  
  assert.strictEqual(results.length, 2);
  assert.strictEqual(results[0].passed, true);
  assert.strictEqual(results[1].passed, true);
});

test('assertion - operators (gt, lt, gte, lte)', () => {
  const response = { body: { count: 42 } };
  
  const results1 = runAssertions(response, { 'body.count': { gt: 40 } });
  assert.strictEqual(results1[0].passed, true);
  
  const results2 = runAssertions(response, { 'body.count': { lt: 50 } });
  assert.strictEqual(results2[0].passed, true);
  
  const results3 = runAssertions(response, { 'body.count': { gte: 42 } });
  assert.strictEqual(results3[0].passed, true);
  
  const results4 = runAssertions(response, { 'body.count': { lte: 42 } });
  assert.strictEqual(results4[0].passed, true);
});
