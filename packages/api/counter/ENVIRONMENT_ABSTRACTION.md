# Environment Abstraction Layer

## Overview

The counter-api package needs to work in both Node.js and browser environments, but these environments have very different capabilities. This documentation explains how we handle platform differences through an environment abstraction layer.

## Problem

Different environments have different capabilities:

| Capability         | Node.js                  | Browser                   |
| ------------------ | ------------------------ | ------------------------- |
| File System Access | ✅ Full access           | ❌ Not available          |
| Node.js Modules    | ✅ Available             | ❌ Need polyfills         |
| Streams            | ✅ Real streams          | ❌ Need mocks             |
| Path Resolution    | ✅ `__dirname` available | ❌ Uses `import.meta.url` |

## Solution Architecture

We use a **layered abstraction** approach:

```
Application Code
       ↓
   env.ts (Abstraction Layer)
       ↓
┌─────────────┬─────────────┐
│ env-node.ts │env-browser.ts│
│ (Node.js)   │ (Browser)   │
└─────────────┴─────────────┘
```

## File Structure

### Core Files

- **`src/env.ts`** - Main abstraction layer with runtime detection
- **`src/env-node.ts`** - Node.js-specific implementations
- **`src/env-browser.ts`** - Browser-compatible stubs and fallbacks
- **`src/path-resolver.ts`** - Universal path resolution (see [PATH_RESOLUTION.md](./PATH_RESOLUTION.md))

### Configuration

- **`apps/web/vite.config.ts`** - Vite aliases for browser builds
- **`tsconfig.json`** - TypeScript module resolution

## How It Works

### 1. Runtime Detection (`env.ts`)

```typescript
// Detects environment at runtime
export const isNodeEnvironment =
  typeof process !== 'undefined' && process.versions != null && process.versions.node != null;

// Conditionally imports the right implementation
export const readFile = async (path: string): Promise<string> => {
  try {
    const { readFile } = await import('./env-node.js');
    return await readFile(path);
  } catch (e) {
    throw new Error('File system access is not available in this context');
  }
};
```

### 2. Node.js Implementation (`env-node.ts`)

```typescript
// Real file system operations
export const readFile = async (path: string): Promise<string> => {
  return fsAsync.readFile(path, 'utf-8');
};

// Real streams
export const { createReadStream, createWriteStream } = fs;
```

### 3. Browser Implementation (`env-browser.ts`)

```typescript
// Safe fallbacks that throw descriptive errors
export const readFile = async (): Promise<string> => {
  throw new Error('File system operations are not supported in the browser');
};

// Mock streams that emit errors
export const createReadStream = (): ReadStream => {
  // Returns mock stream that emits errors
};
```

### 4. Build-Time Aliases (Vite)

```typescript
// apps/web/vite.config.ts
resolve: {
  alias: {
    // Force browser builds to use browser implementations
    '@repo/counter-api/src/env': '@repo/counter-api/src/env-browser.ts',
    '@repo/counter-api/dist/env': '@repo/counter-api/src/env-browser.ts',
  }
}
```

## Usage Patterns

### Basic File Operations

```typescript
import { readFile, writeFile, fileExists } from './env.js';

// Works in both Node.js and browser (with appropriate behavior)
const content = await readFile('/path/to/file'); // Node.js: reads file, Browser: throws error
```

### Environment Detection

```typescript
import { isNodeEnvironment, isBrowserEnvironment } from './env.js';

if (isNodeEnvironment) {
  // Node.js-specific code
} else {
  // Browser-specific code
}
```

### Stream Operations

```typescript
import { createReadStream, createWriteStream } from './env.js';

const stream = createReadStream('/path/to/file');
stream.on('error', (err) => {
  // Node.js: actual file errors
  // Browser: "not supported" error
});
```

## Files Reference

| File             | Purpose                | Used In          |
| ---------------- | ---------------------- | ---------------- |
| `env.ts`         | Main abstraction       | All environments |
| `env-node.ts`    | Node.js implementation | Node.js only     |
| `env-browser.ts` | Browser fallbacks      | Browser only     |

This architecture ensures the counter-api works seamlessly across different JavaScript environments while maintaining type safety and clear error handling.
