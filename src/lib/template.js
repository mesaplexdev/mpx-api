import { getNestedValue } from './utils.js';

// Template variable interpolation
// Supports: {{varName}}, {{env.VAR}}, {{request-name.response.body.field}}

export function interpolate(text, context = {}) {
  if (typeof text !== 'string') return text;
  
  return text.replace(/\{\{(.+?)\}\}/g, (match, path) => {
    path = path.trim();
    
    // Handle environment variables
    if (path.startsWith('env.')) {
      const envVar = path.slice(4);
      return process.env[envVar] || match;
    }
    
    // Handle nested object paths (e.g., response.body.users[0].id)
    const value = getNestedValue(context, path);
    return value !== undefined ? value : match;
  });
}

export function interpolateObject(obj, context = {}) {
  if (typeof obj === 'string') {
    return interpolate(obj, context);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => interpolateObject(item, context));
  }
  
  if (obj && typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = interpolateObject(value, context);
    }
    return result;
  }
  
  return obj;
}

// getNestedValue imported from utils.js
