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

function getNestedValue(obj, path) {
  // Handle array indexing: users[0].name
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (!current) return undefined;
    
    // Check for array indexing
    const arrayMatch = part.match(/^(.+?)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, key, index] = arrayMatch;
      current = current[key];
      if (!Array.isArray(current)) return undefined;
      current = current[parseInt(index)];
    } else {
      current = current[part];
    }
  }
  
  return current;
}
