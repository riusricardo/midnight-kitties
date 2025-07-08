/**
 * Node.js Environment Implementation
 *
 * PURPOSE:
 * This file provides Node.js-specific implementations for file system operations,
 * streams, and other Node.js APIs that are not available in browsers.
 *
 * USAGE:
 * - Used directly in Node.js environments
 * - Imported conditionally by env.ts for dynamic platform detection
 * - Never used in browser builds (browser builds are aliased to env-browser.ts)
 *
 * FEATURES:
 * - Full file system access using Node.js fs module
 * - Real stream implementations for reading/writing files
 * - Async/await support for modern Node.js patterns
 * - Type-safe interfaces that match browser fallbacks
 *
 * CONFIGURATION:
 * No special configuration needed - this file is used automatically when
 * running in Node.js environments (CLI, tests, build scripts, etc.)
 */

import * as fsAsync from 'node:fs/promises';
import * as fs from 'node:fs';

// Environment Detection Constants
// These are always true in Node.js implementation
export const isNodeEnvironment = true;
export const isBrowserEnvironment = false;

// File System Operations
// These functions provide async file operations using Node.js fs/promises
export const readFile = async (path: string): Promise<string> => {
  return fsAsync.readFile(path, 'utf-8');
};

export const writeFile = async (path: string, content: string): Promise<void> => {
  return fsAsync.writeFile(path, content, 'utf-8');
};

export const fileExists = async (path: string): Promise<boolean> => {
  try {
    await fsAsync.access(path, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

// Direct Re-exports from Node.js fs module
// These provide access to synchronous operations, streams, and constants
export const { existsSync, readFileSync, createReadStream, createWriteStream, constants } = fs;
export const { mkdir } = fsAsync;

// Node.js path utilities - direct re-export from path module
import * as nodePath from 'node:path';
export const pathUtils = {
  join: nodePath.join,
  resolve: nodePath.resolve,
  dirname: nodePath.dirname,
  basename: nodePath.basename,
};

// TypeScript Interface Definitions
// These extend Node.js stream types to match the browser interface definitions
export interface ReadStream extends fs.ReadStream {}
export interface WriteStream extends fs.WriteStream {}

// Node.js storage implementation
export class NodeStorage {
  constructor(private namespace: string) {}

  async get<T>(key: string): Promise<T | null> {
    // Implement if needed
    return null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    // Implement if needed
  }

  async delete(key: string): Promise<void> {
    // Implement if needed
  }
}
