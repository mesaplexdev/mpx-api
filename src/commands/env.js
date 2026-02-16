import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { parse, stringify } from 'yaml';
import { join } from 'path';
import { ensureLocalDir } from '../lib/config.js';
import { formatSuccess, formatError, formatInfo } from '../lib/output.js';
import chalk from 'chalk';

export function registerEnvCommands(program) {
  const env = program
    .command('env')
    .description('Manage environments');

  env
    .command('init')
    .description('Initialize environments directory')
    .action(() => {
      try {
        ensureLocalDir();
        const envDir = join('.mpx-api', 'environments');
        
        if (!existsSync(envDir)) {
          mkdirSync(envDir, { recursive: true });
        }
        
        // Create default environments
        const environments = ['dev', 'staging', 'production'];
        
        for (const envName of environments) {
          const envPath = join(envDir, `${envName}.yaml`);
          if (!existsSync(envPath)) {
            const envData = {
              name: envName,
              variables: {},
            };
            writeFileSync(envPath, stringify(envData));
          }
        }
        
        formatSuccess('Environments initialized');
        formatInfo(`Created: ${environments.join(', ')}`);
        formatInfo('Set variables with: mpx-api env set <env> <key>=<value>');
      } catch (err) {
        formatError(err);
        process.exit(1);
      }
    });

  env
    .command('set <environment> <variable>')
    .description('Set an environment variable (KEY=value)')
    .action((environment, variable) => {
      try {
        ensureLocalDir();
        const envDir = join('.mpx-api', 'environments');
        
        if (!existsSync(envDir)) {
          formatError(new Error('Environments not initialized. Run "mpx-api env init" first.'));
          process.exit(1);
        }
        
        const envPath = join(envDir, `${environment}.yaml`);
        
        // Parse variable
        const [key, ...valueParts] = variable.split('=');
        const value = valueParts.join('=');
        
        if (!key || !value) {
          formatError(new Error('Invalid format. Use: KEY=value'));
          process.exit(1);
        }
        
        let envData = { name: environment, variables: {} };
        
        if (existsSync(envPath)) {
          const content = readFileSync(envPath, 'utf8');
          envData = parse(content) || envData;
        }
        
        envData.variables = envData.variables || {};
        envData.variables[key] = value;
        
        writeFileSync(envPath, stringify(envData));
        formatSuccess(`Set ${key}=${value} in ${environment} environment`);
      } catch (err) {
        formatError(err);
        process.exit(1);
      }
    });

  env
    .command('list [environment]')
    .description('List all environments or variables in an environment')
    .action((environment) => {
      try {
        const envDir = join('.mpx-api', 'environments');
        
        if (!existsSync(envDir)) {
          formatError(new Error('Environments not initialized.'));
          process.exit(1);
        }
        
        if (environment) {
          // List variables in specific environment
          const envPath = join(envDir, `${environment}.yaml`);
          
          if (!existsSync(envPath)) {
            formatError(new Error(`Environment "${environment}" not found.`));
            process.exit(1);
          }
          
          const content = readFileSync(envPath, 'utf8');
          const data = parse(content);
          
          console.log('');
          console.log(chalk.bold(`Environment: ${environment}`));
          console.log('');
          
          if (!data.variables || Object.keys(data.variables).length === 0) {
            console.log('  (no variables)');
          } else {
            for (const [key, value] of Object.entries(data.variables)) {
              console.log(`  ${chalk.cyan(key)}: ${value}`);
            }
          }
          console.log('');
        } else {
          // List all environments
          const files = readdirSync(envDir).filter(f => f.endsWith('.yaml'));
          
          console.log('');
          console.log(chalk.bold('Environments:'));
          console.log('');
          
          if (files.length === 0) {
            console.log('  (none)');
          } else {
            for (const file of files) {
              const envName = file.replace('.yaml', '');
              const content = readFileSync(join(envDir, file), 'utf8');
              const data = parse(content);
              const varCount = Object.keys(data.variables || {}).length;
              console.log(`  ${chalk.cyan(envName)} (${varCount} variable${varCount !== 1 ? 's' : ''})`);
            }
          }
          console.log('');
        }
      } catch (err) {
        formatError(err);
        process.exit(1);
      }
    });
}
