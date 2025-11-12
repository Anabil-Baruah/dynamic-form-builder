/**
 * Input sanitization utilities to prevent injection attacks
 */

// Remove HTML tags and dangerous characters
exports.sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/[<>]/g, '') // Remove remaining angle brackets
    .trim();
};

// Sanitize object recursively
exports.sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => exports.sanitizeObject(item));
  }

  const sanitized = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      if (typeof value === 'string') {
        sanitized[key] = exports.sanitizeString(value);
      } else if (typeof value === 'object') {
        sanitized[key] = exports.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
  }
  return sanitized;
};

// Sanitize MongoDB query to prevent injection
exports.sanitizeMongoQuery = (query) => {
  if (typeof query !== 'object' || query === null) {
    return query;
  }

  const sanitized = {};
  for (const key in query) {
    if (query.hasOwnProperty(key)) {
      // Remove keys starting with $ (MongoDB operators)
      if (key.startsWith('$')) {
        continue;
      }
      const value = query[key];
      if (typeof value === 'object' && value !== null) {
        sanitized[key] = exports.sanitizeMongoQuery(value);
      } else {
        sanitized[key] = value;
      }
    }
  }
  return sanitized;
};
