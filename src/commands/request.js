import { HttpClient } from '../lib/http-client.js';
import { formatResponse, formatError } from '../lib/output.js';
import { saveToHistory } from '../lib/history.js';

export function registerRequestCommands(program) {
  const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

  for (const method of methods) {
    program
      .command(`${method} <url>`)
      .description(`Send a ${method.toUpperCase()} request`)
      .option('-H, --header <header...>', 'Add request headers (key:value or "key: value")')
      .option('-j, --json <data>', 'Send JSON data (automatically sets Content-Type)')
      .option('-d, --data <data>', 'Send raw request body')
      .option('-v, --verbose', 'Show response headers')
      .option('-q, --quiet', 'Only output response body')
      .option('--no-follow', 'Do not follow redirects')
      .option('--no-verify', 'Skip SSL certificate verification')
      .option('--timeout <ms>', 'Request timeout in milliseconds', '30000')
      .action(async (url, options, command) => {
        try {
          // Get global options
          const globalOpts = command.optsWithGlobals();
          const jsonOutput = globalOpts.json || false;
          const quiet = options.quiet || globalOpts.quiet || false;

          const client = new HttpClient({
            followRedirects: options.follow,
            verifySsl: options.verify,
            timeout: parseInt(options.timeout),
          });

          const requestOptions = {
            headers: parseHeaders(options.header || []),
          };

          // Handle JSON data
          if (options.json) {
            try {
              requestOptions.json = JSON.parse(options.json);
            } catch (err) {
              if (jsonOutput) {
                console.log(JSON.stringify({ error: `Invalid JSON: ${err.message}` }));
              } else {
                formatError(new Error(`Invalid JSON: ${err.message}`));
              }
              process.exit(1);
            }
          } else if (options.data) {
            requestOptions.body = options.data;
          }

          const response = await client.request(method, url, requestOptions);

          // Save to history
          saveToHistory(
            {
              method: method.toUpperCase(),
              url,
              headers: requestOptions.headers,
              body: requestOptions.json || requestOptions.body,
            },
            response
          );

          // Format and display response
          formatResponse(response, {
            verbose: options.verbose,
            quiet: quiet,
            jsonOutput: jsonOutput,
            request: {
              method: method.toUpperCase(),
              url,
              headers: requestOptions.headers,
              body: requestOptions.json || requestOptions.body,
            }
          });

          // Exit with non-zero code for 4xx/5xx errors
          if (response.status >= 400) {
            process.exit(1);
          }
        } catch (err) {
          const globalOpts = command.optsWithGlobals();
          if (globalOpts.json) {
            console.log(JSON.stringify({ error: err.message, code: err.code || 'ERR_REQUEST' }));
          } else {
            formatError(err);
          }
          process.exit(1);
        }
      });
  }
}

function parseHeaders(headerArray) {
  const headers = {};
  
  for (const header of headerArray) {
    // Support both "key:value" and "key: value" formats
    const colonIndex = header.indexOf(':');
    if (colonIndex === -1) {
      throw new Error(`Invalid header format: ${header}. Expected "key:value" or "key: value"`);
    }
    
    const key = header.slice(0, colonIndex).trim();
    const value = header.slice(colonIndex + 1).trim();
    headers[key] = value;
  }
  
  return headers;
}
