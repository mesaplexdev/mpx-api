/**
 * Get a nested value from an object using dot notation.
 * Supports array indexing: users[0].name
 */
export function getNestedValue(obj, path) {
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    
    // Handle array indexing
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
