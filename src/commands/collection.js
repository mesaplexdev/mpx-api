import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { parse, stringify } from 'yaml';
import { ensureLocalDir } from '../lib/config.js';
import { formatSuccess, formatError, formatInfo } from '../lib/output.js';
import { runCollection } from '../lib/collection-runner.js';
import { formatTestResults } from '../lib/output.js';
import { join } from 'path';

export function registerCollectionCommands(program) {
  const collection = program
    .command('collection')
    .description('Manage request collections');

  collection
    .command('init')
    .description('Initialize a new collection in current directory')
    .option('-n, --name <name>', 'Collection name', 'API Collection')
    .action((options) => {
      try {
        ensureLocalDir();
        
        const collectionData = {
          name: options.name,
          baseUrl: '',
          requests: [],
        };
        
        const yamlPath = join('.mpx-api', 'collection.yaml');
        writeFileSync(yamlPath, stringify(collectionData));
        
        formatSuccess(`Collection initialized at ${yamlPath}`);
        formatInfo('Add requests with: mpx-api collection add <name> <method> <url>');
      } catch (err) {
        formatError(err);
        process.exit(1);
      }
    });

  collection
    .command('add <name> <method> <url>')
    .description('Add a request to the collection')
    .option('-H, --header <header...>', 'Add request headers')
    .option('-j, --json <data>', 'JSON body')
    .option('-d, --data <data>', 'Request body')
    .action((name, method, url, options) => {
      try {
        const yamlPath = join('.mpx-api', 'collection.yaml');
        
        if (!existsSync(yamlPath)) {
          formatError(new Error('No collection found. Run "mpx-api collection init" first.'));
          process.exit(1);
        }
        
        const content = readFileSync(yamlPath, 'utf8');
        const data = parse(content);
        
        const request = {
          name,
          method: method.toUpperCase(),
          url,
        };
        
        if (options.header && options.header.length > 0) {
          request.headers = {};
          for (const header of options.header) {
            const [key, ...valueParts] = header.split(':');
            request.headers[key.trim()] = valueParts.join(':').trim();
          }
        }
        
        if (options.json) {
          try {
            request.json = JSON.parse(options.json);
          } catch (err) {
            formatError(new Error(`Invalid JSON: ${err.message}`));
            process.exit(1);
          }
        } else if (options.data) {
          request.body = options.data;
        }
        
        data.requests = data.requests || [];
        data.requests.push(request);
        
        writeFileSync(yamlPath, stringify(data));
        formatSuccess(`Added request "${name}" to collection`);
      } catch (err) {
        formatError(err);
        process.exit(1);
      }
    });

  collection
    .command('run [file]')
    .description('Run a collection')
    .option('-e, --env <name>', 'Environment to use')
    .option('--base-url <url>', 'Override base URL')
    .action(async (file, options) => {
      try {
        const collectionPath = file || join('.mpx-api', 'collection.yaml');
        
        if (!existsSync(collectionPath)) {
          formatError(new Error(`Collection not found: ${collectionPath}`));
          process.exit(1);
        }
        
        const content = readFileSync(collectionPath, 'utf8');
        const collection = parse(content);
        
        // Load environment if specified
        let env = {};
        if (options.env) {
          const envPath = join('.mpx-api', 'environments', `${options.env}.yaml`);
          if (existsSync(envPath)) {
            const envContent = readFileSync(envPath, 'utf8');
            env = parse(envContent);
          } else {
            formatWarning(`Environment "${options.env}" not found, continuing without it`);
          }
        }
        
        const baseUrl = options.baseUrl || collection.baseUrl || '';
        
        const results = await runCollection(collection, { env, baseUrl });
        
        const allPassed = formatTestResults(results);
        
        process.exit(allPassed ? 0 : 1);
      } catch (err) {
        formatError(err);
        process.exit(1);
      }
    });

  collection
    .command('list')
    .description('List all requests in collection')
    .action(() => {
      try {
        const yamlPath = join('.mpx-api', 'collection.yaml');
        
        if (!existsSync(yamlPath)) {
          formatError(new Error('No collection found.'));
          process.exit(1);
        }
        
        const content = readFileSync(yamlPath, 'utf8');
        const data = parse(content);
        
        console.log('');
        console.log(`Collection: ${data.name || 'Unnamed'}`);
        if (data.baseUrl) {
          console.log(`Base URL: ${data.baseUrl}`);
        }
        console.log('');
        console.log('Requests:');
        
        if (!data.requests || data.requests.length === 0) {
          console.log('  (none)');
        } else {
          for (const req of data.requests) {
            console.log(`  ${req.name}: ${req.method} ${req.url}`);
          }
        }
        console.log('');
      } catch (err) {
        formatError(err);
        process.exit(1);
      }
    });
}

function formatWarning(message) {
  console.log(chalk.yellow('⚠'), message);
}
