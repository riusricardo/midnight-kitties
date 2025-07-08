/**
 * Browser Environment Implementation
 *
 * PURPOSE:
 * This file provides browser-compatible implementations that safely handle
 * file system operations and Node.js-specific APIs in browser environments.
 *
 * USAGE:
 * - Used automatically in browser builds via Vite alias configuration
 * - Configured in apps/web/vite.config.ts as:
 *   '@repo/counter-api/src/env': '@repo/counter-api/src/env-browser.ts'
 * - Never used in Node.js environments
 *
 * APPROACH:
 * Since browsers don't have file system access, this file:
 * - Throws descriptive errors for file operations
 * - Returns safe defaults where appropriate (e.g., existsSync returns false)
 * - Provides mock stream implementations that emit errors
 * - Maintains type compatibility with Node.js implementations
 *
 * SAFETY:
 * All operations fail gracefully with clear error messages rather than
 * causing runtime crashes or undefined behavior.
 */

// Environment Detection Constants
// These are always false/true respectively in browser implementation
export const isNodeEnvironment = false;
export const isBrowserEnvironment = true;

// File System Operation Stubs
// These functions throw errors since browsers don't have file system access
export const readFile = async (): Promise<string> => {
  throw new Error('File system operations are not supported in the browser');
};

export const writeFile = async (): Promise<void> => {
  throw new Error('File system operations are not supported in the browser');
};

export const fileExists = async (): Promise<boolean> => {
  throw new Error('File system operations are not supported in the browser');
};

// Safe Fallback Implementations
// These provide safe defaults rather than throwing errors
export const existsSync = (): boolean => {
  // Always return false since no files exist in browser context
  return false;
};

export const readFileSync = (): string => {
  throw new Error('Synchronous file system operations are not supported in the browser');
};

// Browser-compatible path utilities
// These provide basic path operations without Node.js dependencies
export const pathUtils = {
  join: (...segments: string[]): string => {
    return segments.filter(Boolean).join('/').replace(/\/+/g, '/');
  },

  resolve: (...segments: string[]): string => {
    let result = '';
    for (const segment of segments) {
      if (segment.startsWith('/')) {
        result = segment;
      } else {
        result = result ? `${result}/${segment}` : segment;
      }
    }
    return result.replace(/\/+/g, '/');
  },

  dirname: (filepath: string): string => {
    const lastSlash = filepath.lastIndexOf('/');
    return lastSlash === -1 ? '.' : filepath.substring(0, lastSlash) || '/';
  },

  basename: (filepath: string): string => {
    const lastSlash = filepath.lastIndexOf('/');
    return lastSlash === -1 ? filepath : filepath.substring(lastSlash + 1);
  },
};

export const mkdir = async (): Promise<void> => {
  throw new Error('File system operations are not supported in the browser');
};

// Stream Interface Definitions
// These match the Node.js stream interfaces for type compatibility
export interface ReadStream {
  on(event: string, callback: (...args: any[]) => void): ReadStream;
  close(): void;
}

export interface WriteStream {
  write(chunk: string): boolean;
  on(event: string, callback: (...args: any[]) => void): WriteStream;
  end(): void;
}

// Mock Stream Implementations
// These provide stream-like objects that emit appropriate errors
export const createReadStream = (): ReadStream => {
  const stream = {
    on: (event: string, callback: (...args: any[]) => void): ReadStream => {
      if (event === 'error') {
        callback(new Error('File system operations are not supported in the browser'));
      }
      return stream;
    },
    close: (): void => {},
  };
  return stream;
};

export const createWriteStream = (): WriteStream => {
  const stream = {
    write: (): boolean => {
      return false;
    },
    on: (event: string, callback: (...args: any[]) => void): WriteStream => {
      if (event === 'error') {
        callback(new Error('File system operations are not supported in the browser'));
      }
      return stream;
    },
    end: (): void => {},
  };
  return stream;
};

// Constants needed by the API
export const constants = {
  F_OK: 0,
  R_OK: 4,
  W_OK: 2,
  X_OK: 1,
};

// Storage implementation based on localStorage or memory
export class BrowserStorage {
  private storage: Map<string, string>;

  constructor(private namespace: string) {
    this.storage = new Map<string, string>();
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = localStorage.getItem(`${this.namespace}:${key}`);
      if (value === null) return null;
      return JSON.parse(value) as T;
    } catch (e) {
      // Fallback to memory storage if localStorage is not available
      const value = this.storage.get(key);
      return value ? (JSON.parse(value) as T) : null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    const serialized = JSON.stringify(value);
    try {
      localStorage.setItem(`${this.namespace}:${key}`, serialized);
    } catch (e) {
      // Fallback to memory storage if localStorage is not available
      this.storage.set(key, serialized);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      localStorage.removeItem(`${this.namespace}:${key}`);
    } catch (e) {
      // Fallback to memory storage if localStorage is not available
      this.storage.delete(key);
    }
  }
}
