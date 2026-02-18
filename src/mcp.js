/**
 * MCP (Model Context Protocol) Server
 * 
 * Exposes mpx-api capabilities as MCP tools for AI agent integration.
 * Runs over stdio transport.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

import { HttpClient } from './lib/http-client.js';
import { getSchema } from './schema.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));

export async function startMCPServer() {
  const server = new Server(
    { name: 'mpx-api', version: pkg.version },
    { capabilities: { tools: {} } }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'http_request',
          description: 'Send an HTTP request (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS). Returns structured response with status, headers, body, and timing.',
          inputSchema: {
            type: 'object',
            properties: {
              method: {
                type: 'string',
                enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
                description: 'HTTP method'
              },
              url: {
                type: 'string',
                description: 'Target URL'
              },
              headers: {
                type: 'object',
                description: 'Request headers as key-value pairs',
                additionalProperties: { type: 'string' }
              },
              json: {
                type: 'object',
                description: 'JSON body (automatically sets Content-Type: application/json)'
              },
              body: {
                type: 'string',
                description: 'Raw request body (use either json or body, not both)'
              },
              followRedirects: {
                type: 'boolean',
                default: true,
                description: 'Follow HTTP redirects'
              },
              verifySsl: {
                type: 'boolean',
                default: true,
                description: 'Verify SSL certificates'
              },
              timeout: {
                type: 'number',
                default: 30000,
                description: 'Request timeout in milliseconds'
              }
            },
            required: ['method', 'url']
          }
        },
        {
          name: 'get_schema',
          description: 'Get the full JSON schema describing all mpx-api commands, flags, and output formats.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        }
      ]
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'http_request': {
          const client = new HttpClient({
            followRedirects: args.followRedirects !== false,
            verifySsl: args.verifySsl !== false,
            timeout: args.timeout || 30000,
          });

          const requestOptions = {
            headers: args.headers || {},
          };

          // Handle JSON or raw body
          if (args.json) {
            requestOptions.json = args.json;
          } else if (args.body) {
            requestOptions.body = args.body;
          }

          const method = (args.method || 'GET').toLowerCase();
          const response = await client.request(method, args.url, requestOptions);

          // Return structured response
          const result = {
            request: {
              method: method.toUpperCase(),
              url: args.url,
              headers: requestOptions.headers,
              body: args.json || args.body || null
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
          };

          return {
            content: [{
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }]
          };
        }

        case 'get_schema': {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(getSchema(), null, 2)
            }]
          };
        }

        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true
          };
      }
    } catch (err) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ 
            error: err.message,
            code: err.code || 'ERR_REQUEST'
          }, null, 2)
        }],
        isError: true
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
