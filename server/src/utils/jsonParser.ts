/**
 * Parse JSON string fields from SQLite storage back to objects.
 * Since SQLite stores JSON as strings, we need to parse them on read.
 */
export function parseJsonFields<T extends Record<string, any>>(
  obj: T | null,
  fields: string[]
): T | null {
  if (!obj) return null;
  const result = { ...obj };
  for (const field of fields) {
    if (typeof result[field] === 'string') {
      try {
        (result as any)[field] = JSON.parse(result[field]);
      } catch {
        // Keep original string if not valid JSON
      }
    }
  }
  return result;
}

/**
 * Parse JSON fields on an array of objects
 */
export function parseJsonFieldsArray<T extends Record<string, any>>(
  arr: T[],
  fields: string[]
): T[] {
  return arr.map(obj => parseJsonFields(obj, fields)!);
}
