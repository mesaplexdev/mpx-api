import { existsSync, readFileSync } from 'fs';
import { parse } from 'yaml';
import { formatError, formatSuccess } from '../lib/output.js';
import { runCollection } from '../lib/collection-runner.js';
import { formatTestResults } from '../lib/output.js';
import { join } from 'path';

export function registerTestCommand(program) {
  program
    .command('test [file]')
    .description('Run tests from a collection file')
    .option('-e, --env <name>', 'Environment to use')
    .option('--base-url <url>', 'Override base URL')
    .option('--json', 'Output results as JSON')
    .option('--pdf <filename>', 'Export results as a PDF report')
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
            env = env.variables || {};
          }
        }
        
        const baseUrl = options.baseUrl || collection.baseUrl || '';
        
        const startTime = Date.now();
        const results = await runCollection(collection, { env, baseUrl });
        const totalTime = Date.now() - startTime;
        
        // Generate PDF if requested
        if (options.pdf) {
          const { generatePDFReport } = await import('../lib/pdf-report.js');
          const pdfPath = options.pdf.endsWith('.pdf') ? options.pdf : `${options.pdf}.pdf`;
          await generatePDFReport(results, {
            target: baseUrl || collection.baseUrl || 'API Tests',
            collectionName: collection.name,
            totalTime,
          }, pdfPath);
          formatSuccess(`PDF report saved to ${pdfPath}`);
        }
        
        if (options.json) {
          console.log(JSON.stringify(results, null, 2));
          const allPassed = results.every(r => r.passed);
          process.exit(allPassed ? 0 : 1);
        } else {
          const allPassed = formatTestResults(results);
          process.exit(allPassed ? 0 : 1);
        }
      } catch (err) {
        formatError(err);
        process.exit(1);
      }
    });
}
