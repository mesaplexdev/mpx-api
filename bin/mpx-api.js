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

// Handle --no-color early
if (process.argv.includes('--no-color') || !process.stdout.isTTY) {
  process.env.FORCE_COLOR = '0';
}

// Handle --json as alias for --output json
if (process.argv.includes('--json') && !process.argv.includes('--output')) {
  const idx = process.argv.indexOf('--json');
  process.argv.splice(idx, 1, '--output', 'json');
}

program
  .name('mpx-api')
  .description('Developer-first API testing, mocking, and documentation CLI')
  .version(pkg.version)
  .enablePositionalOptions()
  .passThroughOptions()
  .option('--json', 'Output as JSON (machine-readable)')
  .option('-o, --output <format>', 'Output format: json for structured JSON (machine-readable)')
  .option('-q, --quiet', 'Suppress non-essential output')
  .option('--no-color', 'Disable colored output')
  .option('--schema', 'Output JSON schema describing all commands and flags');

// Error handling — must be set BEFORE .command() so subcommands inherit exitOverride
program.exitOverride();
program.configureOutput({
  writeErr: () => {} // Suppress Commander's own error output; we handle it in the catch below
});

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

// Update subcommand
program
  .command('update')
  .description('Check for updates and optionally install the latest version')
  .option('--check', 'Only check for updates (do not install)')
  .action(async (options, cmd) => {
    const { checkForUpdate, performUpdate } = await import('../src/update.js');
    const chalk = (await import('chalk')).default;
    const jsonMode = cmd.parent?.opts()?.output === 'json';

    try {
      const info = checkForUpdate();

      if (jsonMode) {
        const output = {
          current: info.current,
          latest: info.latest,
          updateAvailable: info.updateAvailable,
          isGlobal: info.isGlobal
        };

        if (!options.check && info.updateAvailable) {
          try {
            const result = performUpdate(info.isGlobal);
            output.updated = true;
            output.newVersion = result.version;
          } catch (err) {
            output.updated = false;
            output.error = err.message;
          }
        }

        console.log(JSON.stringify(output, null, 2));
        process.exit(0);
        return;
      }

      // Human-readable output
      if (!info.updateAvailable) {
        console.log('');
        console.log(chalk.green.bold(`✓ mpx-api v${info.current} is up to date`));
        console.log('');
        process.exit(0);
        return;
      }

      console.log('');
      console.log(chalk.yellow.bold(`⬆ Update available: v${info.current} → v${info.latest}`));

      if (options.check) {
        console.log(chalk.gray(`Run ${chalk.cyan('mpx-api update')} to install`));
        console.log('');
        process.exit(0);
        return;
      }

      console.log(chalk.gray(`Installing v${info.latest}${info.isGlobal ? ' (global)' : ''}...`));

      const result = performUpdate(info.isGlobal);
      console.log(chalk.green.bold(`✓ Updated to v${result.version}`));
      console.log('');
      process.exit(0);
    } catch (err) {
      if (jsonMode) {
        console.log(JSON.stringify({ error: err.message, code: 'ERR_UPDATE' }, null, 2));
      } else {
        console.error(chalk.red('Error:'), err.message);
        console.error('');
      }
      process.exit(1);
    }
  });

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

// Error handling
program.exitOverride();
program.configureOutput({
  writeErr: () => {} // Suppress Commander's own error output; we handle it below
});

try {
  await program.parseAsync(process.argv);
} catch (err) {
  if (err.code === 'commander.version') {
    process.exit(0);
  }
  if (err.code !== 'commander.help' && err.code !== 'commander.helpDisplayed') {
    const chalk = (await import('chalk')).default;
    const msg = err.message.startsWith('error:') ? `Error: ${err.message.slice(7)}` : `Error: ${err.message}`;
    console.error(chalk.red(msg));
    process.exit(1);
  }
}
