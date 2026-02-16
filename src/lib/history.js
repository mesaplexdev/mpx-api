import { appendFileSync, readFileSync, existsSync } from 'fs';
import { getHistoryPath } from './config.js';

export function saveToHistory(request, response) {
  const historyPath = getHistoryPath();
  
  const entry = {
    timestamp: new Date().toISOString(),
    method: request.method,
    url: request.url,
    headers: request.headers,
    body: request.body,
    status: response.status,
    responseTime: response.responseTime,
    size: response.size,
  };

  try {
    appendFileSync(historyPath, JSON.stringify(entry) + '\n');
  } catch (err) {
    // Ignore errors, history is optional
  }
}

export function loadHistory(limit = 50) {
  const historyPath = getHistoryPath();
  
  if (!existsSync(historyPath)) {
    return [];
  }

  try {
    const content = readFileSync(historyPath, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);
    
    // Parse and return last N entries
    const entries = lines
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean);
    
    return entries.slice(-limit).reverse();
  } catch (err) {
    return [];
  }
}
