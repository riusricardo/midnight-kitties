import path from 'node:path';

// This file is only used in ESM context
export function getDirPath(): string {
  return path.resolve(new URL(import.meta.url).pathname, '..');
}
