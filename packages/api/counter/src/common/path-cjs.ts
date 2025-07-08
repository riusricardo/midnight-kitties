import path from 'node:path';

// This file is only used in CJS context
export function getDirPath(): string {
  return path.dirname(__filename);
}
