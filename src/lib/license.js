import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { ensureGlobalDir } from './config.js';

export function checkProLicense() {
  const licenseFile = join(ensureGlobalDir(), 'license.key');
  
  if (!existsSync(licenseFile)) {
    return false;
  }
  
  try {
    const license = readFileSync(licenseFile, 'utf8').trim();
    // Simple validation for now (in production, use proper license verification)
    return license.length > 20 && license.startsWith('MPX-PRO-');
  } catch (err) {
    return false;
  }
}

export function requireProLicense(featureName) {
  if (!checkProLicense()) {
    throw new Error(
      `${featureName} is a Pro feature.\n\n` +
      'Upgrade to mpx-api Pro for $12/mo to unlock:\n' +
      '  • Mock server from OpenAPI specs\n' +
      '  • Record & replay\n' +
      '  • Load testing\n' +
      '  • API documentation generation\n' +
      '  • Request chaining\n' +
      '  • Pre/post request scripts\n\n' +
      'Visit https://mpx-api.dev/pro to upgrade.'
    );
  }
}
