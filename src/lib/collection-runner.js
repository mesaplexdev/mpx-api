import { HttpClient } from './http-client.js';
import { interpolateObject } from './template.js';
import { runAssertions } from './assertion.js';

export async function runCollection(collection, options = {}) {
  const { env = {}, baseUrl = '' } = options;
  const client = new HttpClient();
  const results = [];
  const context = { env };

  for (const request of collection.requests || []) {
    const result = {
      name: request.name,
      passed: false,
      assertions: [],
      error: null,
      response: null,
    };

    try {
      // Interpolate request with current context
      const interpolated = interpolateObject(request, context);
      
      // Build URL
      let url = interpolated.url;
      if (baseUrl && !url.startsWith('http')) {
        url = baseUrl + url;
      }
      url = interpolateObject(url, context);

      // Build request options
      const requestOptions = {
        headers: interpolated.headers || {},
      };

      if (interpolated.json) {
        requestOptions.json = interpolated.json;
      } else if (interpolated.body) {
        requestOptions.body = interpolated.body;
      }

      // Make request
      const response = await client.request(interpolated.method || 'GET', url, requestOptions);
      result.response = response;

      // Store response in context for chaining
      context[request.name] = { response };

      // Run assertions if present
      if (interpolated.assert) {
        result.assertions = runAssertions(response, interpolated.assert);
        result.passed = result.assertions.every(a => a.passed);
      } else {
        // No assertions, just check if request succeeded
        result.passed = response.status >= 200 && response.status < 400;
      }
    } catch (err) {
      result.error = err.message;
      result.passed = false;
    }

    results.push(result);
  }

  return results;
}
