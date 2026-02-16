import chalk from 'chalk';
import { highlight } from 'cli-highlight';

const MAX_BODY_SIZE = 50 * 1024; // 50KB max for terminal display

export function formatResponseJSON(response, request = {}) {
  return JSON.stringify({
    request: {
      method: request.method || response.method,
      url: request.url || response.url,
      headers: request.headers || {},
      body: request.body || null
    },
    response: {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      body: response.body,
      rawBody: response.rawBody,
      responseTime: response.responseTime,
      size: response.size
    }
  }, null, 2);
}

export function formatResponse(response, options = {}) {
  const { verbose = false, quiet = false, jsonOutput = false } = options;
  
  // Handle JSON output mode
  if (jsonOutput) {
    console.log(formatResponseJSON(response, options.request || {}));
    return;
  }
  
  if (quiet) {
    // Only output body
    if (typeof response.body === 'object') {
      console.log(JSON.stringify(response.body, null, 2));
    } else {
      console.log(response.body);
    }
    return;
  }

  const lines = [];
  
  // Status line
  const statusColor = getStatusColor(response.status);
  lines.push('');
  lines.push(chalk.bold(`${response.method} ${response.url}`));
  lines.push(
    chalk[statusColor].bold(`${response.status} ${response.statusText}`) +
    chalk.gray(` • ${response.responseTime}ms • ${formatSize(response.size)}`)
  );
  lines.push('');

  // Headers (if verbose)
  if (verbose) {
    lines.push(chalk.bold.cyan('Response Headers:'));
    for (const [key, value] of Object.entries(response.headers)) {
      const valueStr = Array.isArray(value) ? value.join(', ') : value;
      lines.push(chalk.cyan(`  ${key}: `) + chalk.gray(valueStr));
    }
    lines.push('');
  }

  // Body
  lines.push(chalk.bold.cyan('Response Body:'));
  
  if (response.size > MAX_BODY_SIZE) {
    lines.push(chalk.yellow(`  [Body too large (${formatSize(response.size)}), showing first ${formatSize(MAX_BODY_SIZE)}]`));
    const truncated = response.rawBody.slice(0, MAX_BODY_SIZE);
    lines.push(highlightBody(truncated, response.headers['content-type']));
  } else if (response.rawBody.length === 0) {
    lines.push(chalk.gray('  (empty)'));
  } else {
    lines.push(highlightBody(response.rawBody, response.headers['content-type']));
  }
  
  lines.push('');
  
  console.log(lines.join('\n'));
}

export function formatError(error) {
  console.error('');
  console.error(chalk.red.bold('✗ Error:'), error.message);
  console.error('');
}

export function formatSuccess(message) {
  console.log('');
  console.log(chalk.green.bold('✓'), message);
  console.log('');
}

export function formatInfo(message) {
  console.log('');
  console.log(chalk.blue.bold('ℹ'), message);
  console.log('');
}

export function formatWarning(message) {
  console.log('');
  console.log(chalk.yellow.bold('⚠'), message);
  console.log('');
}

function getStatusColor(status) {
  if (status >= 200 && status < 300) return 'green';
  if (status >= 300 && status < 400) return 'cyan';
  if (status >= 400 && status < 500) return 'yellow';
  if (status >= 500) return 'red';
  return 'white';
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function highlightBody(text, contentType = '') {
  try {
    // Detect language from content-type
    let language = 'text';
    if (contentType.includes('json')) {
      language = 'json';
      // Pretty-print JSON
      try {
        const parsed = JSON.parse(text);
        text = JSON.stringify(parsed, null, 2);
      } catch (e) {
        // Keep original if parse fails
      }
    } else if (contentType.includes('xml') || contentType.includes('html')) {
      language = 'xml';
    } else if (contentType.includes('javascript')) {
      language = 'javascript';
    }

    const highlighted = highlight(text, { language, ignoreIllegals: true });
    return highlighted.split('\n').map(line => '  ' + line).join('\n');
  } catch (err) {
    // Fallback to plain text with indentation
    return text.split('\n').map(line => '  ' + line).join('\n');
  }
}

export function formatTestResults(results) {
  console.log('');
  console.log(chalk.bold.cyan('Test Results:'));
  console.log('');

  let passed = 0;
  let failed = 0;

  for (const result of results) {
    if (result.passed) {
      passed++;
      console.log(chalk.green('  ✓'), result.name);
      if (result.assertions) {
        for (const assertion of result.assertions) {
          if (assertion.passed) {
            console.log(chalk.gray(`    ✓ ${assertion.description}`));
          } else {
            console.log(chalk.red(`    ✗ ${assertion.description}`));
            console.log(chalk.red(`      Expected: ${assertion.expected}, Got: ${assertion.actual}`));
          }
        }
      }
    } else {
      failed++;
      console.log(chalk.red('  ✗'), result.name);
      if (result.error) {
        console.log(chalk.red(`    ${result.error}`));
      }
      if (result.assertions) {
        for (const assertion of result.assertions) {
          if (!assertion.passed) {
            console.log(chalk.red(`    ✗ ${assertion.description}`));
            console.log(chalk.red(`      Expected: ${assertion.expected}, Got: ${assertion.actual}`));
          }
        }
      }
    }
  }

  console.log('');
  console.log(
    chalk.bold(`Total: ${results.length} tests, `) +
    chalk.green.bold(`${passed} passed, `) +
    (failed > 0 ? chalk.red.bold(`${failed} failed`) : chalk.gray(`${failed} failed`))
  );
  console.log('');

  return failed === 0;
}
