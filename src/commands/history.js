import chalk from 'chalk';
import { loadHistory } from '../lib/history.js';
import { formatError } from '../lib/output.js';

export function registerHistoryCommand(program) {
  program
    .command('history')
    .description('Show request history')
    .option('-n, --limit <number>', 'Number of entries to show', '20')
    .action((options) => {
      try {
        const limit = parseInt(options.limit);
        const history = loadHistory(limit);
        
        if (history.length === 0) {
          console.log('');
          console.log(chalk.gray('No history found.'));
          console.log('');
          return;
        }
        
        console.log('');
        console.log(chalk.bold('Request History:'));
        console.log('');
        
        for (const entry of history) {
          const timestamp = new Date(entry.timestamp).toLocaleString();
          const statusColor = entry.status >= 200 && entry.status < 300 ? 'green' :
                             entry.status >= 400 ? 'yellow' : 'white';
          
          console.log(
            chalk.gray(timestamp) + ' ' +
            chalk.bold(entry.method.padEnd(6)) +
            chalk[statusColor](entry.status.toString().padEnd(4)) +
            chalk.gray(`${entry.responseTime}ms`.padEnd(8)) +
            entry.url
          );
        }
        
        console.log('');
      } catch (err) {
        formatError(err);
        process.exit(1);
      }
    });
}
