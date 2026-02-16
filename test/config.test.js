import { test } from 'node:test';
import assert from 'node:assert';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';
import {
  ensureGlobalDir,
  ensureLocalDir,
  getGlobalConfigPath,
  getLocalConfigPath,
  saveLocalConfig,
  loadLocalConfig,
} from '../src/lib/config.js';

test('config - ensureLocalDir creates directory', () => {
  const testDir = ensureLocalDir();
  assert.strictEqual(existsSync(testDir), true);
});

test('config - save and load local config', () => {
  const config = { test: 'value', nested: { key: 'data' } };
  saveLocalConfig(config);
  
  const loaded = loadLocalConfig();
  assert.deepStrictEqual(loaded, config);
  
  // Cleanup
  if (existsSync('.mpx-api')) {
    rmSync('.mpx-api', { recursive: true });
  }
});

test('config - load missing config returns empty object', () => {
  if (existsSync('.mpx-api')) {
    rmSync('.mpx-api', { recursive: true });
  }
  
  const loaded = loadLocalConfig();
  assert.deepStrictEqual(loaded, {});
});
