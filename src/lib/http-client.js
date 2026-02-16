import { request } from 'undici';
import { CookieJar } from 'tough-cookie';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { getCookieJarPath } from './config.js';

export class HttpClient {
  constructor(options = {}) {
    this.followRedirects = options.followRedirects !== false;
    this.verifySsl = options.verifySsl !== false;
    this.timeout = options.timeout || 30000;
    this.cookieJar = new CookieJar();
    
    // Load persisted cookies
    this.loadCookies();
  }

  loadCookies() {
    const cookiePath = getCookieJarPath();
    if (existsSync(cookiePath)) {
      try {
        const data = JSON.parse(readFileSync(cookiePath, 'utf8'));
        this.cookieJar = CookieJar.fromJSON(data);
      } catch (err) {
        // Ignore errors, start fresh
      }
    }
  }

  saveCookies() {
    const cookiePath = getCookieJarPath();
    try {
      writeFileSync(cookiePath, JSON.stringify(this.cookieJar.toJSON()));
    } catch (err) {
      // Ignore errors
    }
  }

  async request(method, url, options = {}) {
    const startTime = Date.now();
    
    const requestOptions = {
      method: method.toUpperCase(),
      headers: options.headers || {},
      body: options.body,
    };
    
    // Note: undici follows redirects by default, maxRedirections removed in newer versions

    // Add cookies to request
    const cookies = await this.cookieJar.getCookies(url);
    if (cookies.length > 0) {
      requestOptions.headers.cookie = cookies.map(c => c.cookieString()).join('; ');
    }

    // Set content-type for JSON bodies
    if (options.json) {
      requestOptions.headers['content-type'] = 'application/json';
      requestOptions.body = JSON.stringify(options.json);
    }

    // SSL verification
    if (!this.verifySsl) {
      requestOptions.connect = { rejectUnauthorized: false };
    }

    try {
      const response = await request(url, requestOptions);
      
      // Store cookies from response
      const setCookieHeaders = response.headers['set-cookie'];
      if (setCookieHeaders) {
        const cookieArray = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
        for (const cookie of cookieArray) {
          await this.cookieJar.setCookie(cookie, url);
        }
        this.saveCookies();
      }

      // Read response body
      let body;
      const contentType = response.headers['content-type'] || '';
      const buffer = await response.body.arrayBuffer();
      
      // Try to parse as text
      const decoder = new TextDecoder('utf-8');
      const text = decoder.decode(buffer);
      
      // Parse JSON if applicable
      if (contentType.includes('application/json') || contentType.includes('application/vnd.api+json')) {
        try {
          body = JSON.parse(text);
        } catch (err) {
          body = text;
        }
      } else {
        body = text;
      }

      const endTime = Date.now();
      
      return {
        status: response.statusCode,
        statusText: getStatusText(response.statusCode),
        headers: response.headers,
        body,
        rawBody: text,
        size: buffer.byteLength,
        responseTime: endTime - startTime,
        url,
        method: method.toUpperCase(),
      };
    } catch (err) {
      // Handle network errors gracefully
      if (err.code === 'ENOTFOUND') {
        throw new Error(`DNS lookup failed for ${url}`);
      } else if (err.code === 'ECONNREFUSED') {
        throw new Error(`Connection refused to ${url}`);
      } else if (err.code === 'ETIMEDOUT' || err.name === 'TimeoutError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      } else if (err.code === 'CERT_HAS_EXPIRED' || err.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
        throw new Error(`SSL certificate error: ${err.message}. Use --no-verify to bypass.`);
      } else {
        throw err;
      }
    }
  }

  async get(url, options) {
    return this.request('GET', url, options);
  }

  async post(url, options) {
    return this.request('POST', url, options);
  }

  async put(url, options) {
    return this.request('PUT', url, options);
  }

  async patch(url, options) {
    return this.request('PATCH', url, options);
  }

  async delete(url, options) {
    return this.request('DELETE', url, options);
  }

  async head(url, options) {
    return this.request('HEAD', url, options);
  }

  async options(url, options) {
    return this.request('OPTIONS', url, options);
  }
}

function getStatusText(code) {
  const statusTexts = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    301: 'Moved Permanently',
    302: 'Found',
    304: 'Not Modified',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
  };
  return statusTexts[code] || 'Unknown';
}
