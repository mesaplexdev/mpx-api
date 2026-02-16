import { homedir } from 'os';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

const GLOBAL_DIR = join(homedir(), '.mpx-api');
const LOCAL_DIR = '.mpx-api';

export function ensureGlobalDir() {
  if (!existsSync(GLOBAL_DIR)) {
    mkdirSync(GLOBAL_DIR, { recursive: true });
  }
  return GLOBAL_DIR;
}

export function ensureLocalDir() {
  if (!existsSync(LOCAL_DIR)) {
    mkdirSync(LOCAL_DIR, { recursive: true });
  }
  return LOCAL_DIR;
}

export function getGlobalConfigPath() {
  return join(ensureGlobalDir(), 'config.json');
}

export function getLocalConfigPath() {
  return join(LOCAL_DIR, 'config.json');
}

export function getHistoryPath() {
  return join(ensureGlobalDir(), 'history.jsonl');
}

export function getCookieJarPath() {
  return join(ensureGlobalDir(), 'cookies.json');
}

export function loadGlobalConfig() {
  const path = getGlobalConfigPath();
  if (!existsSync(path)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    return {};
  }
}

export function saveGlobalConfig(config) {
  const path = getGlobalConfigPath();
  writeFileSync(path, JSON.stringify(config, null, 2));
}

export function loadLocalConfig() {
  const path = getLocalConfigPath();
  if (!existsSync(path)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    return {};
  }
}

export function saveLocalConfig(config) {
  ensureLocalDir();
  const path = getLocalConfigPath();
  writeFileSync(path, JSON.stringify(config, null, 2));
}
