import { existsSync, readFileSync, writeFileSync } from 'fs';
import { parse } from 'yaml';
import { formatError, formatSuccess } from '../lib/output.js';
import { requireProLicense } from '../lib/license.js';

export function registerDocsCommand(program) {
  program
    .command('docs <collection>')
    .description('Generate API documentation from collection (Pro)')
    .option('-o, --output <file>', 'Output file', 'API.md')
    .option('--format <format>', 'Output format (markdown, html)', 'markdown')
    .action((collection, options) => {
      try {
        requireProLicense('Documentation generation');
        
        if (!existsSync(collection)) {
          formatError(new Error(`Collection not found: ${collection}`));
          process.exit(1);
        }
        
        const content = readFileSync(collection, 'utf8');
        const data = parse(content);
        
        const markdown = generateMarkdownDocs(data);
        
        writeFileSync(options.output, markdown);
        formatSuccess(`Documentation generated: ${options.output}`);
        
      } catch (err) {
        formatError(err);
        process.exit(1);
      }
    });
}

function generateMarkdownDocs(collection) {
  const lines = [];
  
  // Header
  lines.push(`# ${collection.name || 'API Documentation'}`);
  lines.push('');
  
  if (collection.description) {
    lines.push(collection.description);
    lines.push('');
  }
  
  if (collection.baseUrl) {
    lines.push(`**Base URL:** \`${collection.baseUrl}\``);
    lines.push('');
  }
  
  lines.push('---');
  lines.push('');
  
  // Table of Contents
  lines.push('## Table of Contents');
  lines.push('');
  
  for (const request of collection.requests || []) {
    const anchor = request.name.toLowerCase().replace(/\s+/g, '-');
    lines.push(`- [${request.name}](#${anchor})`);
  }
  
  lines.push('');
  lines.push('---');
  lines.push('');
  
  // Requests
  for (const request of collection.requests || []) {
    lines.push(`## ${request.name}`);
    lines.push('');
    
    if (request.description) {
      lines.push(request.description);
      lines.push('');
    }
    
    // Request details
    lines.push('```');
    lines.push(`${request.method} ${request.url}`);
    lines.push('```');
    lines.push('');
    
    // Headers
    if (request.headers && Object.keys(request.headers).length > 0) {
      lines.push('**Headers:**');
      lines.push('');
      lines.push('```');
      for (const [key, value] of Object.entries(request.headers)) {
        lines.push(`${key}: ${value}`);
      }
      lines.push('```');
      lines.push('');
    }
    
    // Body
    if (request.json) {
      lines.push('**Request Body:**');
      lines.push('');
      lines.push('```json');
      lines.push(JSON.stringify(request.json, null, 2));
      lines.push('```');
      lines.push('');
    } else if (request.body) {
      lines.push('**Request Body:**');
      lines.push('');
      lines.push('```');
      lines.push(request.body);
      lines.push('```');
      lines.push('');
    }
    
    // Assertions
    if (request.assert) {
      lines.push('**Expected Response:**');
      lines.push('');
      
      for (const [key, value] of Object.entries(request.assert)) {
        if (key === 'status') {
          lines.push(`- Status Code: ${value}`);
        } else {
          lines.push(`- ${key}: ${JSON.stringify(value)}`);
        }
      }
      lines.push('');
    }
    
    lines.push('---');
    lines.push('');
  }
  
  // Footer
  lines.push('---');
  lines.push('');
  lines.push('*Generated with [mpx-api](https://mpx-api.dev)*');
  lines.push('');
  
  return lines.join('\n');
}
