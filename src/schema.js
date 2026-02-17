/**
 * Schema Module
 * 
 * Returns a machine-readable JSON schema describing all commands,
 * flags, inputs, and outputs for AI agent discovery.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));

export function getSchema() {
  return {
    tool: 'mpx-api',
    version: pkg.version,
    description: pkg.description,
    homepage: pkg.homepage,
    commands: {
      'http-methods': {
        description: 'Send HTTP requests (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)',
        usage: 'mpx-api <method> <url> [options]',
        methods: ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'],
        arguments: {
          url: {
            type: 'string',
            required: true,
            description: 'Target URL for the HTTP request'
          }
        },
        flags: {
          '-H, --header': {
            type: 'array',
            description: 'Add request headers (format: "key:value" or "key: value")',
            repeatable: true
          },
          '-j, --json': {
            type: 'string',
            description: 'Send JSON data (automatically sets Content-Type: application/json)'
          },
          '-d, --data': {
            type: 'string',
            description: 'Send raw request body'
          },
          '-v, --verbose': {
            type: 'boolean',
            default: false,
            description: 'Show response headers in output'
          },
          '-q, --quiet': {
            type: 'boolean',
            default: false,
            description: 'Only output response body (no headers, no formatting)'
          },
          '--no-follow': {
            type: 'boolean',
            default: false,
            description: 'Do not follow HTTP redirects'
          },
          '--no-verify': {
            type: 'boolean',
            default: false,
            description: 'Skip SSL certificate verification'
          },
          '--timeout': {
            type: 'number',
            default: 30000,
            description: 'Request timeout in milliseconds'
          }
        },
        output: {
          json: {
            description: 'Structured response data when --output json is used',
            schema: {
              type: 'object',
              properties: {
                request: {
                  type: 'object',
                  properties: {
                    method: { type: 'string' },
                    url: { type: 'string' },
                    headers: { type: 'object' },
                    body: { type: ['string', 'object', 'null'] }
                  }
                },
                response: {
                  type: 'object',
                  properties: {
                    status: { type: 'number' },
                    statusText: { type: 'string' },
                    headers: { type: 'object' },
                    body: { type: ['string', 'object', 'null'] },
                    rawBody: { type: 'string' },
                    responseTime: { type: 'number', description: 'Response time in milliseconds' },
                    size: { type: 'number', description: 'Response size in bytes' }
                  }
                }
              }
            }
          },
          error: {
            description: 'Error response when request fails',
            schema: {
              type: 'object',
              properties: {
                error: { type: 'string' },
                message: { type: 'string' },
                code: { type: 'string' }
              }
            }
          }
        },
        exitCodes: {
          0: 'Success (2xx or 3xx status)',
          1: 'Request error or 4xx/5xx status'
        },
        examples: [
          { command: 'mpx-api get https://api.example.com/users --output json', description: 'GET request with JSON output' },
          { command: 'mpx-api post https://api.example.com/users -j \'{"name":"John"}\' --output json', description: 'POST JSON data with structured output' },
          { command: 'mpx-api get https://api.example.com/data -H "Authorization: Bearer token"', description: 'GET with custom headers' }
        ]
      },
      collection: {
        description: 'Manage and run request collections',
        subcommands: {
          init: {
            usage: 'mpx-api collection init [options]',
            description: 'Initialize a new collection in current directory',
            flags: {
              '-n, --name': {
                type: 'string',
                default: 'API Collection',
                description: 'Collection name'
              }
            }
          },
          add: {
            usage: 'mpx-api collection add <name> <method> <url> [options]',
            description: 'Add a request to the collection',
            arguments: {
              name: { type: 'string', required: true, description: 'Request name' },
              method: { type: 'string', required: true, description: 'HTTP method' },
              url: { type: 'string', required: true, description: 'Request URL' }
            },
            flags: {
              '-H, --header': { type: 'array', description: 'Request headers' },
              '-j, --json': { type: 'string', description: 'JSON body' },
              '-d, --data': { type: 'string', description: 'Request body' }
            }
          },
          run: {
            usage: 'mpx-api collection run [file] [options]',
            description: 'Run a collection',
            arguments: {
              file: { type: 'string', required: false, description: 'Collection file (default: .mpx-api/collection.yaml)' }
            },
            flags: {
              '-e, --env': { type: 'string', description: 'Environment name to use' },
              '--base-url': { type: 'string', description: 'Override base URL' },
              '--json': { type: 'boolean', description: 'Output results as JSON' }
            }
          },
          list: {
            usage: 'mpx-api collection list [file]',
            description: 'List requests in a collection'
          }
        }
      },
      env: {
        description: 'Manage environments',
        subcommands: {
          init: {
            usage: 'mpx-api env init',
            description: 'Initialize environments directory with dev, staging, production'
          },
          set: {
            usage: 'mpx-api env set <environment> <variable>',
            description: 'Set an environment variable (KEY=value format)',
            arguments: {
              environment: { type: 'string', required: true, description: 'Environment name' },
              variable: { type: 'string', required: true, description: 'Variable in KEY=value format' }
            }
          },
          list: {
            usage: 'mpx-api env list [environment]',
            description: 'List all environments or variables in a specific environment',
            arguments: {
              environment: { type: 'string', required: false, description: 'Environment name (optional)' }
            }
          }
        }
      },
      mock: {
        description: 'Start a mock API server',
        usage: 'mpx-api mock [file] [options]',
        arguments: {
          file: { type: 'string', required: false, description: 'Mock definition file' }
        },
        flags: {
          '-p, --port': { type: 'number', default: 3000, description: 'Server port' },
          '--watch': { type: 'boolean', description: 'Watch file for changes' }
        }
      },
      test: {
        description: 'Run API tests',
        usage: 'mpx-api test <file> [options]',
        arguments: {
          file: { type: 'string', required: false, description: 'Test file to run (default: .mpx-api/collection.yaml)' }
        },
        flags: {
          '-e, --env': { type: 'string', description: 'Environment name' },
          '--json': { type: 'boolean', description: 'Output results as JSON' }
        }
      },
      history: {
        description: 'View request history',
        usage: 'mpx-api history [options]',
        flags: {
          '-n, --limit': { type: 'number', default: 10, description: 'Number of entries to show' },
          '--clear': { type: 'boolean', description: 'Clear history' }
        }
      },
      load: {
        description: 'Load test API endpoint (Pro)',
        usage: 'mpx-api load <url> [options]',
        arguments: {
          url: { type: 'string', required: true, description: 'Target URL' }
        },
        flags: {
          '--rps': { type: 'number', default: 10, description: 'Requests per second' },
          '-d, --duration': { type: 'number', default: 10, description: 'Test duration in seconds' },
          '-H, --header': { type: 'array', description: 'Add request headers' },
          '--method': { type: 'string', default: 'GET', description: 'HTTP method' }
        }
      },
      docs: {
        description: 'Generate API documentation (Pro)',
        usage: 'mpx-api docs <file> [options]',
        arguments: {
          file: { type: 'string', required: true, description: 'Collection or OpenAPI file' }
        },
        flags: {
          '-o, --output': { type: 'string', description: 'Output directory' },
          '--format': { type: 'string', enum: ['html', 'markdown'], default: 'html', description: 'Output format' }
        }
      },
      mcp: {
        description: 'Start MCP (Model Context Protocol) stdio server for AI agent integration',
        usage: 'mpx-api mcp',
        examples: [
          { command: 'mpx-api mcp', description: 'Start MCP stdio server' }
        ]
      },
      update: {
        description: 'Check for updates and optionally install the latest version',
        usage: 'mpx-api update [--check] [-o json]',
        flags: {
          '--check': { description: 'Only check for updates (do not install)', default: false }
        },
        examples: [
          { command: 'mpx-api update', description: 'Check and install updates' },
          { command: 'mpx-api update --check', description: 'Just check for updates' },
          { command: 'mpx-api update --check -o json', description: 'Check for updates (JSON output)' }
        ]
      }
    },
    globalFlags: {
      '-o, --output': {
        type: 'string',
        description: 'Output format: "json" for structured JSON for machine consumption'
      },
      '-q, --quiet': {
        type: 'boolean',
        default: false,
        description: 'Suppress non-essential output'
      },
      '--schema': {
        type: 'boolean',
        default: false,
        description: 'Output this schema as JSON'
      },
      '--version': {
        type: 'boolean',
        description: 'Show version number'
      },
      '--help': {
        type: 'boolean',
        description: 'Show help information'
      }
    },
    mcpConfig: {
      description: 'Add to your MCP client configuration to use mpx-api as an AI tool',
      config: {
        mcpServers: {
          'mpx-api': {
            command: 'npx',
            args: ['mpx-api', 'mcp']
          }
        }
      }
    }
  };
}
