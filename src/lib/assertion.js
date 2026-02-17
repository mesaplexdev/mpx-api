import { getNestedValue } from './utils.js';

// Assertion engine for testing

export function runAssertions(response, assertions) {
  const results = [];
  
  for (const [path, expected] of Object.entries(assertions)) {
    const result = {
      path,
      expected,
      actual: undefined,
      passed: false,
      description: '',
    };
    
    // Special case: status code
    if (path === 'status') {
      result.actual = response.status;
      result.passed = response.status === expected;
      result.description = `Status code is ${expected}`;
      results.push(result);
      continue;
    }
    
    // Special case: responseTime
    if (path === 'responseTime') {
      result.actual = response.responseTime;
      if (typeof expected === 'object') {
        // Handle operators: { lt: 500, gt: 100 }
        result.passed = evaluateOperators(response.responseTime, expected);
        result.description = `Response time ${formatOperators(expected)}`;
      } else {
        result.passed = response.responseTime === expected;
        result.description = `Response time is ${expected}ms`;
      }
      results.push(result);
      continue;
    }
    
    // Handle headers.* paths
    if (path.startsWith('headers.')) {
      const headerName = path.slice(8).toLowerCase();
      const actualValue = response.headers[headerName];
      result.actual = actualValue;
      
      if (typeof expected === 'string') {
        result.passed = actualValue === expected || (actualValue && actualValue.includes(expected));
        result.description = `Header ${headerName} contains "${expected}"`;
      } else if (typeof expected === 'object') {
        result.passed = evaluateOperators(actualValue, expected);
        result.description = `Header ${headerName} ${formatOperators(expected)}`;
      }
      results.push(result);
      continue;
    }
    
    // Handle body.* paths
    if (path.startsWith('body.')) {
      const bodyPath = path.slice(5);
      const actualValue = getNestedValue(response.body, bodyPath);
      result.actual = actualValue;
      
      if (typeof expected === 'object' && !Array.isArray(expected)) {
        // Handle operators
        result.passed = evaluateOperators(actualValue, expected);
        result.description = `${path} ${formatOperators(expected)}`;
      } else {
        result.passed = deepEqual(actualValue, expected);
        result.description = `${path} equals ${JSON.stringify(expected)}`;
      }
      results.push(result);
      continue;
    }
  }
  
  return results;
}

// getNestedValue imported from utils.js

function evaluateOperators(actual, expected) {
  for (const [op, value] of Object.entries(expected)) {
    switch (op) {
      case 'eq':
        if (actual !== value) return false;
        break;
      case 'ne':
        if (actual === value) return false;
        break;
      case 'gt':
        if (!(actual > value)) return false;
        break;
      case 'gte':
        if (!(actual >= value)) return false;
        break;
      case 'lt':
        if (!(actual < value)) return false;
        break;
      case 'lte':
        if (!(actual <= value)) return false;
        break;
      case 'contains':
        if (!actual || !actual.includes(value)) return false;
        break;
      case 'exists':
        if (value && actual === undefined) return false;
        if (!value && actual !== undefined) return false;
        break;
      default:
        return false;
    }
  }
  return true;
}

function formatOperators(expected) {
  const parts = [];
  for (const [op, value] of Object.entries(expected)) {
    switch (op) {
      case 'eq': parts.push(`equals ${value}`); break;
      case 'ne': parts.push(`does not equal ${value}`); break;
      case 'gt': parts.push(`greater than ${value}`); break;
      case 'gte': parts.push(`greater than or equal to ${value}`); break;
      case 'lt': parts.push(`less than ${value}`); break;
      case 'lte': parts.push(`less than or equal to ${value}`); break;
      case 'contains': parts.push(`contains "${value}"`); break;
      case 'exists': parts.push(value ? 'exists' : 'does not exist'); break;
    }
  }
  return parts.join(' and ');
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }
  
  if (typeof a === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(key => deepEqual(a[key], b[key]));
  }
  
  return false;
}
