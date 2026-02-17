#!/usr/bin/env node

import { program } from 'commander';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

// Command imports
import { registerRequestCommands } from '../src/commands/request.js';
import { registerCollectionCommands } from '../src/commands/collection.js';
import { registerEnvCommands } from '../src/commands/env.js';
import { registerMockCommands } from '../src/commands/mock.js';
import { registerTestCommand } from '../src/commands/test.js';
import { registerHistoryCommand } from '../src/commands/history.js';
import { registerLoadCommand } from '../src/commands/load.js';
import { registerDocsCommand } from '../src/commands/docs.js';

// AI-native features
import { getSchema } from '../src/schema.js';
import { startMCPServer } from '../src/mcp.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pkg = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf8')
);

// Handle --schema flag early (before commander parsing)
if (process.argv.includes('--schema')) {
  console.log(JSON.stringify(getSchema(), null, 2));
  process.exit(0);
}

program
  .name('mpx-api')
  .description('Developer-first API testing, mocking, and documentation CLI')
  .version(pkg.version)
  .enablePositionalOptions()
  .passThroughOptions()
  .option('-o, --output <format>', 'Output format: json for structured JSON (machine-readable)')
  .option('-q, --quiet', 'Suppress non-essential output');

// Register HTTP method commands (get, post, put, patch, delete, head, options)
registerRequestCommands(program);

// Register collection commands
registerCollectionCommands(program);

// Register environment commands
registerEnvCommands(program);

// Register mock server commands
registerMockCommands(program);

// Register test command
registerTestCommand(program);

// Register history command
registerHistoryCommand(program);

// Register Pro commands (gracefully handle unlicensed)
registerLoadCommand(program);
registerDocsCommand(program);

// MCP subcommand
program
  .command('mcp')
  .description('Start MCP (Model Context Protocol) stdio server')
  .action(async () => {
    try {
      await startMCPServer();
    } catch (err) {
      console.error(JSON.stringify({ error: err.message, code: 'ERR_MCP_START' }));
      process.exit(1);
    }
  });

program.parse();
