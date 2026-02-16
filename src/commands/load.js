import { request } from 'undici';
import { formatError, formatSuccess, formatInfo } from '../lib/output.js';
import { requireProLicense } from '../lib/license.js';
import chalk from 'chalk';

export function registerLoadCommand(program) {
  program
    .command('load <url>')
    .description('Run load test against URL (Pro)')
    .option('--rps <number>', 'Requests per second', '10')
    .option('-d, --duration <seconds>', 'Test duration in seconds', '10')
    .option('-H, --header <header...>', 'Add request headers')
    .option('--method <method>', 'HTTP method', 'GET')
    .action(async (url, options) => {
      try {
        requireProLicense('Load testing');
        
        const rps = parseInt(options.rps);
        const duration = parseInt(options.duration);
        const method = options.method.toUpperCase();
        
        formatInfo(`Starting load test: ${rps} req/s for ${duration}s`);
        formatInfo(`Target: ${method} ${url}`);
        console.log('');
        
        const headers = {};
        if (options.header) {
          for (const header of options.header) {
            const [key, ...valueParts] = header.split(':');
            headers[key.trim()] = valueParts.join(':').trim();
          }
        }
        
        const results = await runLoadTest(url, {
          rps,
          duration,
          method,
          headers,
        });
        
        displayLoadTestResults(results);
        
      } catch (err) {
        formatError(err);
        process.exit(1);
      }
    });
}

async function runLoadTest(url, options) {
  const { rps, duration, method, headers } = options;
  const interval = 1000 / rps; // ms between requests
  const totalRequests = rps * duration;
  
  const results = {
    total: totalRequests,
    success: 0,
    failed: 0,
    responseTimes: [],
    errors: {},
    statusCodes: {},
  };
  
  const startTime = Date.now();
  const promises = [];
  
  for (let i = 0; i < totalRequests; i++) {
    const delay = i * interval;
    
    promises.push(
      new Promise((resolve) => {
        setTimeout(async () => {
          const reqStart = Date.now();
          
          try {
            const response = await request(url, { method, headers });
            const reqTime = Date.now() - reqStart;
            
            await response.body.arrayBuffer(); // Consume body
            
            results.success++;
            results.responseTimes.push(reqTime);
            results.statusCodes[response.statusCode] = (results.statusCodes[response.statusCode] || 0) + 1;
          } catch (err) {
            results.failed++;
            const errorType = err.code || err.message;
            results.errors[errorType] = (results.errors[errorType] || 0) + 1;
          }
          
          resolve();
        }, delay);
      })
    );
  }
  
  await Promise.all(promises);
  
  results.totalTime = Date.now() - startTime;
  
  // Calculate percentiles
  if (results.responseTimes.length > 0) {
    results.responseTimes.sort((a, b) => a - b);
    results.p50 = percentile(results.responseTimes, 50);
    results.p95 = percentile(results.responseTimes, 95);
    results.p99 = percentile(results.responseTimes, 99);
    results.min = results.responseTimes[0];
    results.max = results.responseTimes[results.responseTimes.length - 1];
    results.avg = results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length;
  }
  
  return results;
}

function percentile(arr, p) {
  const index = Math.ceil((arr.length * p) / 100) - 1;
  return arr[index];
}

function displayLoadTestResults(results) {
  console.log('');
  console.log(chalk.bold.cyan('Load Test Results:'));
  console.log('');
  
  console.log(chalk.bold('Summary:'));
  console.log(`  Total requests: ${results.total}`);
  console.log(`  ${chalk.green('Successful:')} ${results.success}`);
  if (results.failed > 0) {
    console.log(`  ${chalk.red('Failed:')} ${results.failed}`);
  }
  console.log(`  Duration: ${(results.totalTime / 1000).toFixed(2)}s`);
  console.log(`  Actual RPS: ${(results.total / (results.totalTime / 1000)).toFixed(2)}`);
  console.log('');
  
  if (results.responseTimes.length > 0) {
    console.log(chalk.bold('Response Times:'));
    console.log(`  Min: ${results.min}ms`);
    console.log(`  Max: ${results.max}ms`);
    console.log(`  Avg: ${results.avg.toFixed(2)}ms`);
    console.log(`  P50: ${results.p50}ms`);
    console.log(`  P95: ${results.p95}ms`);
    console.log(`  P99: ${results.p99}ms`);
    console.log('');
  }
  
  if (Object.keys(results.statusCodes).length > 0) {
    console.log(chalk.bold('Status Codes:'));
    for (const [code, count] of Object.entries(results.statusCodes)) {
      const color = code.startsWith('2') ? 'green' : code.startsWith('4') || code.startsWith('5') ? 'red' : 'white';
      console.log(`  ${chalk[color](code)}: ${count}`);
    }
    console.log('');
  }
  
  if (Object.keys(results.errors).length > 0) {
    console.log(chalk.bold.red('Errors:'));
    for (const [error, count] of Object.entries(results.errors)) {
      console.log(`  ${error}: ${count}`);
    }
    console.log('');
  }
}
