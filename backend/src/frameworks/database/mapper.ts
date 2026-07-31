export function mapToCamelCase(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(mapToCamelCase);

  const newObj: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    newObj[camelKey] = mapToCamelCase(value);
  }
  return newObj;
}
