/**
 * Environment Abstraction Layer
 *
 * PROBLEM:
 * The counter-api needs to work in both Node.js and browser environments, but:
 * - Node.js has full file system access (fs module, streams, etc.)
 * - Browsers don't have file system access and need different implementations
 * - Some APIs need platform-specific implementations (storage, networking, etc.)
 *
 * SOLUTION:
 * This file provides a unified interface that:
 * 1. **Environment Detection**: Detects Node.js vs browser at runtime
 * 2. **Conditional Imports**: Dynamically imports platform-specific implementations
 * 3. **Fallback Behavior**: Provides safe fallbacks for unsupported operations
 * 4. **Vite Alias Support**: Works with Vite's alias system for browser builds
 *
 * CONFIGURATION:
 * - Browser builds: Vite aliases this to env-browser.ts (see apps/web/vite.config.ts)
 * - Node.js builds: Uses this file directly, which imports from env-node.ts
 * - This provides seamless platform abstraction without build-time complexity
 *
 * USAGE:
 * Import from this file everywhere in the codebase:
 * ```typescript
 * import { readFile, writeFile, isNodeEnvironment } from './env.js';
 * ```
 *
 * The implementation will automatically choose the right platform-specific code.
 */

// Runtime environment detection
// This checks for Node.js-specific globals to determine the environment
export const isNodeEnvironment =
  typeof process !== 'undefined' && process.versions != null && process.versions.node != null;
export const isBrowserEnvironment = !isNodeEnvironment;

// File System API Abstractions
// These functions provide a unified interface for file operations
// In Node.js: Uses real fs module functions
// In Browser: Throws appropriate errors or provides fallbacks

export const readFile = async (_path: string): Promise<string> => {
  try {
    // Dynamically import Node.js implementation
    const { readFile } = await import('../node/env-node.js');
    return await readFile(_path);
  } catch (e) {
    throw new Error('File system access is not available in this context');
  }
};

export const writeFile = async (_path: string, _content: string): Promise<void> => {
  try {
    const { writeFile } = await import('../node/env-node.js');
    return await writeFile(_path, _content);
  } catch (e) {
    throw new Error('File system access is not available in this context');
  }
};

export const fileExists = async (_path: string): Promise<boolean> => {
  if (isNodeEnvironment) {
    const { fileExists } = await import('../node/env-node.js');
    return fileExists(_path);
  }
  return false;
};

// Synchronous file operations need to be available immediately
// without async imports to work properly in config.ts
export const readFileSync = (function (): (
  path: string,
  encoding: BufferEncoding | { encoding: BufferEncoding } | string,
) => string {
  // For ESM compatibility, we need to handle both module environments
  if (isNodeEnvironment) {
    try {
      // Dynamic import() for ESM compatibility
      const fsModule = (() => {
        try {
          // Try CommonJS require first (works in CJS)
          return require('node:fs');
        } catch (requireErr) {
          try {
            // For pure ESM environments, use a workaround
            // This is a synchronous operation that works in Node.js
            const { readFileSync, existsSync } = (globalThis as any).process?.binding('fs');
            if (readFileSync && typeof readFileSync === 'function') {
              return { readFileSync, existsSync };
            }
          } catch (bindingErr) {
            // Last resort: use Node.js built-in module
            const nodeModule = (globalThis as any).process?.moduleLoadList?.find((m: string) =>
              m.includes('NativeModule fs'),
            );
            if (nodeModule) {
              return (globalThis as any).require('fs');
            }
          }
        }
        return null;
      })();

      if (!fsModule) {
        console.error('[ERROR] Could not load fs module in any way');
        return function (): string {
          return '';
        };
      }

      return function (
        path: string,
        encoding: BufferEncoding | { encoding: BufferEncoding } | string = 'utf8',
      ): string {
        try {
          const encodingOption = typeof encoding === 'string' ? encoding : (encoding as any)?.encoding || 'utf8';
          return fsModule.readFileSync(path, encodingOption);
        } catch (e) {
          console.error('[ERROR] Failed to read file synchronously:', e);
          return '';
        }
      };
    } catch (e) {
      console.error('[ERROR] Failed to load fs module:', e);
      return function (): string {
        return '';
      };
    }
  }

  // Browser environment
  return function (): string {
    return '';
  };
})();

export const existsSync = (function (): (path: string) => boolean {
  if (isNodeEnvironment) {
    try {
      // Use same approach as readFileSync for module compatibility
      const fsModule = (() => {
        try {
          // Try CommonJS require first
          return require('node:fs');
        } catch (requireErr) {
          try {
            // For pure ESM environments
            const { existsSync } = (globalThis as any).process?.binding('fs');
            if (existsSync && typeof existsSync === 'function') {
              return { existsSync };
            }
          } catch (bindingErr) {
            // Last resort: use Node.js built-in module
            const nodeModule = (globalThis as any).process?.moduleLoadList?.find((m: string) =>
              m.includes('NativeModule fs'),
            );
            if (nodeModule) {
              return (globalThis as any).require('fs');
            }
          }
        }
        return null;
      })();

      if (!fsModule) {
        console.error('[ERROR] Could not load fs module in any way');
        return function (): boolean {
          return false;
        };
      }

      return function (path: string): boolean {
        try {
          return fsModule.existsSync(path);
        } catch (e) {
          console.error('[ERROR] Failed to check file existence:', e);
          return false;
        }
      };
    } catch (e) {
      console.error('[ERROR] Failed to load fs module:', e);
      return function (): boolean {
        return false;
      };
    }
  }

  // Browser environment
  return function (): boolean {
    return false;
  };
})();

export const mkdir = async (_path: string, options?: { recursive?: boolean }): Promise<void> => {
  if (isNodeEnvironment) {
    const { mkdir } = await import('../node/env-node.js');
    await mkdir(_path, options);
    return;
  }
  throw new Error('File system operations are not supported in the browser');
};

// Stream Type Definitions
// These types provide compatibility with Node.js streams in a platform-agnostic way
export interface ReadStream {
  on(event: string, callback: (...args: any[]) => void): ReadStream;
  close(): void;
}

export interface WriteStream {
  write(chunk: string): boolean;
  on(event: string, callback: (...args: any[]) => void): WriteStream;
  end(): void;
}

// Stream Factory Functions
// Create file streams with platform-appropriate implementations
// Node.js: Uses real fs streams
// Browser: Returns mock streams that emit errors

export const createReadStream = (_path: string): ReadStream => {
  if (isNodeEnvironment) {
    try {
      // Support both ESM and CJS
      const fsModule = (() => {
        try {
          // Try CommonJS require first
          return require('node:fs');
        } catch (requireErr) {
          try {
            // For ESM, try to use dynamic import
            // Note: this is an async operation in a sync function,
            // but stream creation is lazy, so it should work in most cases
            // Use a type assertion to prevent TypeScript errors
            const fs = (globalThis as any).fs || (globalThis as any).process?.binding('fs');
            if (fs && typeof fs.createReadStream === 'function') {
              return fs;
            }
            // If we can't get fs directly, return null and fall back to mock
            return null;
          } catch (importErr) {
            return null;
          }
        }
      })();

      if (fsModule) {
        return fsModule.createReadStream(_path, { encoding: 'utf8' });
      }

      // Fall back to mock if we couldn't get fs
      const stream: ReadStream = {
        on: function (event: string, callback: (...args: any[]) => void): ReadStream {
          if (event === 'error') {
            callback(new Error('Failed to create read stream'));
          }
          return stream;
        },
        close: function (): void {},
      };
      return stream;
    } catch (e) {
      // Return mock stream that signals failure
      const stream: ReadStream = {
        on: function (event: string, callback: (...args: any[]) => void): ReadStream {
          if (event === 'error') {
            callback(new Error('Failed to create read stream: ' + (e as Error).message));
          }
          return stream;
        },
        close: function (): void {},
      };
      return stream;
    }
  }

  // Mock stream for browser environment
  const stream: ReadStream = {
    on: function (event: string, callback: (...args: any[]) => void): ReadStream {
      if (event === 'error') {
        callback(new Error('File system operations are not supported in the browser'));
      }
      return stream;
    },
    close: function (): void {},
  };
  return stream;
};

export const createWriteStream = (_path: string): WriteStream => {
  if (isNodeEnvironment) {
    try {
      // Similar approach as createReadStream for module compatibility
      let fs: any = null;
      try {
        fs = require('node:fs');
      } catch (requireErr) {
        console.warn('[WARN] Could not load fs via require for createWriteStream');
      }

      if (fs && typeof fs.createWriteStream === 'function') {
        return fs.createWriteStream(_path);
      }

      // Return mock stream if fs module not available
      const stream: WriteStream = {
        write: function (): boolean {
          return false;
        },
        on: function (event: string, callback: (...args: any[]) => void): WriteStream {
          if (event === 'error') {
            callback(new Error('Failed to create write stream - fs module not available'));
          }
          return stream;
        },
        end: function (): void {},
      };
      return stream;
    } catch (e) {
      // Return mock stream that signals failure
      const stream: WriteStream = {
        write: function (): boolean {
          return false;
        },
        on: function (event: string, callback: (...args: any[]) => void): WriteStream {
          if (event === 'error') {
            callback(new Error('Failed to create write stream: ' + String(e)));
          }
          return stream;
        },
        end: function (): void {},
      };
      return stream;
    }
  }

  // Mock stream for browser environment
  const stream: WriteStream = {
    write: function (): boolean {
      return false;
    },
    on: function (event: string, callback: (...args: any[]) => void): WriteStream {
      if (event === 'error') {
        callback(new Error('File system operations are not supported in the browser'));
      }
      return stream;
    },
    end: function (): void {},
  };
  return stream;
};

// File System Constants
// Node.js fs.constants values for compatibility
export const constants = {
  F_OK: 0, // File exists
  R_OK: 4, // File is readable
  W_OK: 2, // File is writable
  X_OK: 1, // File is executable
};

// Cross-platform path utilities
// These provide path operations that work in both Node.js and browser environments
// Define the interface outside to make it publicly accessible
export interface PathUtils {
  join: (...segments: string[]) => string;
  resolve: (...segments: string[]) => string;
  dirname: (filepath: string) => string;
  basename: (filepath: string) => string;
}

export const pathUtils = (() => {
  // Node.js implementation using the path module
  if (isNodeEnvironment) {
    try {
      // Support both ESM and CommonJS environments
      const pathModule = (() => {
        try {
          // Try CommonJS require first
          return require('node:path');
        } catch (requireErr) {
          try {
            // For ESM environments, try to use URL and path segments
            // by creating a minimal path-like API
            return {
              join: (...parts: string[]): string => parts.join('/').replace(/\/+/g, '/'),
              resolve: (...parts: string[]): string => {
                // Simple resolve implementation
                const resolved = parts.join('/').replace(/\/+/g, '/');
                if (resolved.startsWith('/')) return resolved;
                return `${(globalThis as any).process?.cwd?.() || '/'}/${resolved}`;
              },
              dirname: (filepath: string): string => {
                const lastSlash = filepath.lastIndexOf('/');
                if (lastSlash === -1) return '.';
                if (lastSlash === 0) return '/';
                return filepath.substring(0, lastSlash);
              },
              basename: (filepath: string): string => {
                const lastSlash = filepath.lastIndexOf('/');
                return lastSlash === -1 ? filepath : filepath.substring(lastSlash + 1);
              },
            };
          } catch (esmErr) {
            console.error('[ERROR] Failed to create path utilities for ESM:', esmErr);
            return null;
          }
        }
      })();

      if (
        !pathModule ||
        typeof pathModule.join !== 'function' ||
        typeof pathModule.resolve !== 'function' ||
        typeof pathModule.dirname !== 'function' ||
        typeof pathModule.basename !== 'function'
      ) {
        throw new Error('Invalid path module');
      }

      // Create a wrapper that ensures consistent path separators
      const nodePathUtils: PathUtils = {
        join: (...segments: string[]): string => {
          // Normalize path separators for consistency
          return pathModule.join(...segments).replace(/\\/g, '/');
        },
        resolve: (...segments: string[]): string => {
          // Normalize path separators for consistency
          return pathModule.resolve(...segments).replace(/\\/g, '/');
        },
        dirname: (filepath: string): string => {
          return pathModule.dirname(filepath).replace(/\\/g, '/');
        },
        basename: (filepath: string): string => {
          return pathModule.basename(filepath);
        },
      };

      console.log('[DEBUG] Using Node.js path utilities');
      return nodePathUtils;
    } catch (e) {
      console.error('[ERROR] Failed to load Node.js path module:', e);
      // Continue to fallback implementation
    }
  }

  // Browser-compatible path utilities
  // These are pure JS implementations that work without Node.js
  console.log('[DEBUG] Using browser-compatible path utilities');

  const browserPathUtils: PathUtils = {
    join: (...segments: string[]): string => {
      // Filter out empty segments and join with forward slash
      return segments
        .filter(Boolean)
        .join('/')
        .replace(/\/+/g, '/') // Replace multiple slashes with a single one
        .replace(/\/$/, ''); // Remove trailing slash
    },

    resolve: (...segments: string[]): string => {
      // Start with empty path
      let resolvedPath = '';
      let isAbsolute = false;

      for (const segment of segments) {
        // Skip empty segments
        if (!segment) continue;

        // Handle absolute paths (they reset the result)
        if (segment.startsWith('/')) {
          resolvedPath = segment;
          isAbsolute = true;
          continue;
        }

        // Handle relative paths
        if (resolvedPath) {
          resolvedPath = `${resolvedPath}/${segment}`;
        } else {
          resolvedPath = segment;
        }
      }

      // Clean up the path
      resolvedPath = resolvedPath
        .replace(/\/\.\//g, '/') // Remove /./ sequences
        .replace(/\/+/g, '/'); // Replace multiple slashes

      // Ensure absolute paths start with /
      return isAbsolute ? resolvedPath : resolvedPath;
    },

    dirname: (filepath: string): string => {
      // Handle empty or root paths
      if (!filepath || filepath === '/') return '/';

      // Remove trailing slash if present
      const path = filepath.endsWith('/') ? filepath.slice(0, -1) : filepath;

      const lastSlash = path.lastIndexOf('/');
      // No slashes found
      if (lastSlash === -1) return '.';
      // Return everything before the last slash
      // Special case for root path
      return lastSlash === 0 ? '/' : path.substring(0, lastSlash);
    },

    basename: (filepath: string): string => {
      // Handle empty paths
      if (!filepath) return '';

      // Remove trailing slash if present
      const path = filepath.endsWith('/') ? filepath.slice(0, -1) : filepath;

      const lastSlash = path.lastIndexOf('/');
      return lastSlash === -1 ? path : path.substring(lastSlash + 1);
    },
  };

  return browserPathUtils;
})();
