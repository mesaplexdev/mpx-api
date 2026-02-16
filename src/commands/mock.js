import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import { formatError, formatInfo, formatSuccess } from '../lib/output.js';
import { requireProLicense } from '../lib/license.js';
import chalk from 'chalk';

export function registerMockCommands(program) {
  const mock = program
    .command('mock')
    .description('Mock server commands');

  mock
    .command('start [spec]')
    .description('Start mock server from OpenAPI spec (Pro)')
    .option('-p, --port <port>', 'Server port', '3000')
    .option('-d, --delay <ms>', 'Response delay in milliseconds', '0')
    .option('--cors', 'Enable CORS headers')
    .action((spec, options) => {
      try {
        requireProLicense('Mock server');
        
        if (!spec) {
          formatError(new Error('OpenAPI spec file required'));
          process.exit(1);
        }
        
        if (!existsSync(spec)) {
          formatError(new Error(`Spec file not found: ${spec}`));
          process.exit(1);
        }
        
        const content = readFileSync(spec, 'utf8');
        let openApiSpec;
        
        try {
          if (spec.endsWith('.yaml') || spec.endsWith('.yml')) {
            openApiSpec = parseYaml(content);
          } else {
            openApiSpec = JSON.parse(content);
          }
        } catch (err) {
          formatError(new Error(`Failed to parse spec: ${err.message}`));
          process.exit(1);
        }
        
        const port = parseInt(options.port);
        const delay = parseInt(options.delay);
        
        const server = createMockServer(openApiSpec, {
          delay,
          cors: options.cors,
        });
        
        server.listen(port, () => {
          formatSuccess(`Mock server started on http://localhost:${port}`);
          formatInfo(`Serving from: ${spec}`);
          if (delay > 0) {
            formatInfo(`Response delay: ${delay}ms`);
          }
          console.log('');
          console.log(chalk.gray('Press Ctrl+C to stop'));
          console.log('');
        });
        
      } catch (err) {
        formatError(err);
        process.exit(1);
      }
    });
}

function createMockServer(spec, options = {}) {
  const { delay = 0, cors = false } = options;
  const paths = spec.paths || {};
  
  return createServer((req, res) => {
    const start = Date.now();
    
    // CORS headers
    if (cors) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }
    }
    
    // Find matching path
    let matchedPath = null;
    let matchedOperation = null;
    
    for (const [path, operations] of Object.entries(paths)) {
      // Simple path matching (no parameters for now)
      const pattern = path.replace(/\{[^}]+\}/g, '[^/]+');
      const regex = new RegExp(`^${pattern}$`);
      
      if (regex.test(req.url)) {
        const method = req.method.toLowerCase();
        if (operations[method]) {
          matchedPath = path;
          matchedOperation = operations[method];
          break;
        }
      }
    }
    
    // Apply delay
    setTimeout(() => {
      if (!matchedOperation) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
        logRequest(req, 404, Date.now() - start);
        return;
      }
      
      // Get first success response
      const responses = matchedOperation.responses || {};
      const successCode = Object.keys(responses).find(code => code.startsWith('2')) || '200';
      const response = responses[successCode];
      
      // Generate mock response
      const mockData = generateMockFromSchema(response.content?.['application/json']?.schema || {});
      
      res.writeHead(parseInt(successCode), { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(mockData, null, 2));
      
      logRequest(req, successCode, Date.now() - start);
    }, delay);
  });
}

function generateMockFromSchema(schema) {
  if (!schema) return {};
  
  if (schema.type === 'object') {
    const obj = {};
    for (const [key, propSchema] of Object.entries(schema.properties || {})) {
      obj[key] = generateMockFromSchema(propSchema);
    }
    return obj;
  }
  
  if (schema.type === 'array') {
    return [generateMockFromSchema(schema.items || {})];
  }
  
  if (schema.example !== undefined) {
    return schema.example;
  }
  
  // Default values by type
  const defaults = {
    string: 'example',
    number: 42,
    integer: 42,
    boolean: true,
    null: null,
  };
  
  return defaults[schema.type] || null;
}

function logRequest(req, status, duration) {
  const statusColor = status >= 200 && status < 300 ? 'green' :
                     status >= 400 ? 'yellow' : 'white';
  
  console.log(
    chalk[statusColor](status.toString().padEnd(4)) +
    chalk.bold(req.method.padEnd(7)) +
    chalk.gray(`${duration}ms`.padEnd(8)) +
    req.url
  );
}
