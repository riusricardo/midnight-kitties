/**
 * @file path-resolver.ts
 * @author Ricardo Rius
 * @license GPL-3.0
 *
 * Copyright (C) 2025 Ricardo Rius
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * Universal Path Resolver for CJS/ESM Compatibility
 *
 * PROBLEM:
 * Node.js modules need to determine their own directory path, but:
 * - CommonJS has __dirname available
 * - ESM doesn't have __dirname (uses import.meta.url instead)
 * - TypeScript compilation can switch between these module systems
 * - We need a solution that works in both contexts without build-time complexity
 *
 * SOLUTION:
 * This resolver uses multiple techniques to find the current directory:
 * 1. **CJS Detection**: Uses __dirname if available (CommonJS)
 * 2. **Stack Trace Analysis**: Parses error stack to find file location
 * 3. **Fallback**: Uses process.cwd() as last resort
 *
 * USAGE:
 * Import and call getDirPath() to get the directory containing this module:
 * ```typescript
 * import { getDirPath } from './path-resolver.js';
 * export const currentDir = getDirPath();
 * ```
 *
 * BENEFITS:
 * - Works in both CJS and ESM without modification
 * - No build-time configuration needed
 * - Safe fallbacks prevent runtime errors
 * - Used by config.ts to establish base paths for the application
 */

// Universal Directory Path Detection
// This function works in both CommonJS and ESM environments
export function getDirPath(): string {
  // Fallback: current working directory (safe default)
  let result = process.cwd();

  try {
    // Technique 1: CommonJS __dirname detection
    // In CJS environments, __dirname is available and points to current file's directory
    if (typeof __dirname === 'string') {
      return __dirname;
    }
  } catch (e) {
    // __dirname not available - likely in ESM context
  }

  try {
    // Technique 2: Stack trace parsing for ESM
    // Create an error to capture the call stack
    const err = new Error();
    const stackLines = err.stack?.split('\n') || [];

    // Look for our own filename in the stack trace
    const fileLine = stackLines.find((line) => line.includes('path-resolver.ts'));
    if (fileLine) {
      // Extract file path from stack line format: "at ... (/path/to/path-resolver.ts:line:col)"
      const match = fileLine.match(/\((.*)path-resolver\.ts/);
      if (match && match[1]) {
        return match[1];
      }
    }
  } catch (e) {
    // Stack trace parsing failed - continue to fallback
  }

  // Technique 3: Fallback to current working directory
  // This is safe but may not be the exact module directory
  return result;
}
