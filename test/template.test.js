import { test } from 'node:test';
import assert from 'node:assert';
import { interpolate, interpolateObject } from '../src/lib/template.js';

test('interpolate - simple variable', () => {
  const result = interpolate('Hello {{name}}', { name: 'World' });
  assert.strictEqual(result, 'Hello World');
});

test('interpolate - nested object path', () => {
  const context = {
    user: {
      profile: {
        name: 'Alice',
      },
    },
  };
  
  const result = interpolate('User: {{user.profile.name}}', context);
  assert.strictEqual(result, 'User: Alice');
});

test('interpolate - array indexing', () => {
  const context = {
    users: [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ],
  };
  
  const result = interpolate('First user: {{users[0].name}}', context);
  assert.strictEqual(result, 'First user: Alice');
});

test('interpolate - environment variable', () => {
  process.env.TEST_VAR = 'test-value';
  const result = interpolate('Value: {{env.TEST_VAR}}');
  assert.strictEqual(result, 'Value: test-value');
  delete process.env.TEST_VAR;
});

test('interpolate - missing variable keeps placeholder', () => {
  const result = interpolate('Hello {{missing}}', {});
  assert.strictEqual(result, 'Hello {{missing}}');
});

test('interpolateObject - nested object', () => {
  const obj = {
    url: 'https://api.example.com/users/{{userId}}',
    headers: {
      Authorization: 'Bearer {{token}}',
    },
  };
  
  const context = { userId: '123', token: 'abc' };
  const result = interpolateObject(obj, context);
  
  assert.strictEqual(result.url, 'https://api.example.com/users/123');
  assert.strictEqual(result.headers.Authorization, 'Bearer abc');
});

test('interpolateObject - array', () => {
  const arr = ['{{first}}', '{{second}}'];
  const context = { first: 'one', second: 'two' };
  const result = interpolateObject(arr, context);
  
  assert.deepStrictEqual(result, ['one', 'two']);
});
