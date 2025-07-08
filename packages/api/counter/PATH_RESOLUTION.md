# Path Resolution in CJS/ESM Environments

## Overview

The counter-api package needs to determine its own directory path to locate configuration files and resources. However, Node.js CommonJS (CJS) and ECMAScript Modules (ESM) handle path resolution very differently. This documentation explains our universal path resolution strategy.

## The Problem

Different module systems have different path resolution capabilities:

| Feature           | CommonJS (CJS)                  | ECMAScript Modules (ESM)        |
| ----------------- | ------------------------------- | ------------------------------- |
| `__dirname`       | ✅ Available                    | ❌ Not available                |
| `__filename`      | ✅ Available                    | ❌ Not available                |
| `import.meta.url` | ❌ Not available                | ✅ Available                    |
| Module Detection  | `typeof module !== 'undefined'` | `typeof module === 'undefined'` |

### Real-World Scenarios

```typescript
// CommonJS - Works
const configPath = path.join(__dirname, 'config.json');

// ESM - __dirname is undefined!
const configPath = path.join(__dirname, 'config.json'); // ❌ ReferenceError
```

## Solution Architecture

We implement a **multi-strategy approach** with graceful fallbacks:

```
Application Code
       ↓
path-resolver.ts (Universal Resolver)
       ↓
┌─────────────┬─────────────┬─────────────┐
│ Strategy 1  │ Strategy 2  │ Strategy 3  │
│ CJS Detection│Stack Parsing│ Fallback   │
│ (__dirname) │ (ESM)       │(process.cwd)│
└─────────────┴─────────────┴─────────────┘
```

## File Structure

### Core Files

- **`src/path-resolver.ts`** - Universal path resolver with multi-strategy detection
- **`src/path-cjs.ts`** - CommonJS-specific implementation (legacy)
- **`src/path-esm.ts`** - ESM-specific implementation (legacy)

## Implementation Details

### 1. Universal Resolver (`path-resolver.ts`)

The main resolver uses three strategies in order:

```typescript
export function getDirPath(): string {
  // Strategy 1: CommonJS __dirname detection
  try {
    if (typeof __dirname === 'string') {
      return __dirname;
    }
  } catch (e) {
    // __dirname not available - likely ESM
  }

  // Strategy 2: Stack trace parsing for ESM
  try {
    const err = new Error();
    const stackLines = err.stack?.split('\n') || [];
    const fileLine = stackLines.find((line) => line.includes('path-resolver.ts'));

    if (fileLine) {
      const match = fileLine.match(/\((.*)path-resolver\.ts/);
      if (match && match[1]) {
        return match[1];
      }
    }
  } catch (e) {
    // Stack parsing failed
  }

  // Strategy 3: Fallback to process.cwd()
  return process.cwd();
}
```

### 2. CommonJS Implementation (`path-cjs.ts`)

Simple and direct for pure CJS environments:

```typescript
export function getDirPath(): string {
  return path.dirname(__filename);
}
```

**Benefits:**

- ✅ Simple and reliable
- ✅ Uses native CJS APIs
- ✅ Zero overhead

**Limitations:**

- ❌ Only works in CommonJS
- ❌ Throws `ReferenceError` in ESM

### 3. ESM Implementation (`path-esm.ts`)

Uses `import.meta.url` for ESM environments:

```typescript
export function getDirPath(): string {
  return path.resolve(new URL(import.meta.url).pathname, '..');
}
```

**Benefits:**

- ✅ Native ESM support
- ✅ Accurate path resolution
- ✅ Standard-compliant

**Limitations:**

- ❌ Only works in ESM
- ❌ `import.meta` not available in CJS

## Strategy Details

### Strategy 1: CommonJS Detection

**How it works:**

- Checks if `__dirname` is available and is a string
- Uses it directly if present

**When it's used:**

- Node.js running in CommonJS mode
- TypeScript compiled to CommonJS target
- Legacy Node.js applications

**Example scenarios:**

```typescript
// package.json with "type": "commonjs" (or no type field)
// tsconfig.json with "module": "commonjs"
```

### Strategy 2: Stack Trace Parsing

**How it works:**

1. Creates a new `Error` object to capture call stack
2. Parses `error.stack` to find current file location
3. Extracts directory path from the stack trace line

**Stack trace format:**

```
Error
    at getDirPath (/home/user/project/src/path-resolver.ts:45:15)
    at Object.<anonymous> (/home/user/project/src/config.ts:10:20)
```

**Parsing logic:**

```typescript
const fileLine = stackLines.find((line) => line.includes('path-resolver.ts'));
const match = fileLine.match(/\((.*)path-resolver\.ts/);
// Extracts: '/home/user/project/src/'
```

**When it's used:**

- Node.js running in ESM mode
- TypeScript compiled to ES modules
- Modern Node.js applications

### Strategy 3: Fallback (`process.cwd()`)

**How it works:**

- Returns the current working directory
- Always available in Node.js environments

**When it's used:**

- Both previous strategies failed
- Unknown or unusual execution contexts
- Testing environments

**Trade-offs:**

- ✅ Always works
- ⚠️ May not be the actual module directory
- ⚠️ Can be different from module location

## Usage Patterns

### Basic Usage

```typescript
import { getDirPath } from './path-resolver.js';

// Get the directory containing the current module
const moduleDir = getDirPath();

// Build paths relative to module
const configPath = path.join(moduleDir, 'config.json');
const dataDir = path.join(moduleDir, '..', 'data');
```

### In Configuration Files

```typescript
// src/config.ts
import { getDirPath } from './path-resolver.js';

export const currentDir = getDirPath();
export const configPath = path.join(currentDir, 'midnight.config.js');
export const dataPath = path.join(currentDir, '..', 'data');
```

### Error Handling

```typescript
import { getDirPath } from './path-resolver.js';

try {
  const dir = getDirPath();
  console.log('Module directory:', dir);

  // Verify the path exists
  if (!fs.existsSync(dir)) {
    console.warn('Warning: Resolved path may be incorrect');
  }
} catch (error) {
  console.error('Path resolution failed:', error);
  // Use a safe default
  const fallbackDir = process.cwd();
}
```

## Environment Detection

### Module System Detection

You can detect the current module system:

```typescript
function getModuleSystem(): 'cjs' | 'esm' | 'unknown' {
  try {
    // Try to access __dirname (CJS)
    if (typeof __dirname === 'string') {
      return 'cjs';
    }
  } catch (e) {
    // __dirname not available
  }

  try {
    // Try to access import.meta (ESM)
    if (typeof import.meta !== 'undefined') {
      return 'esm';
    }
  } catch (e) {
    // import.meta not available
  }

  return 'unknown';
}
```

### Package.json Type Field

The `type` field in `package.json` determines the default module system:

```json
{
  "type": "module"    // ESM by default
  // or
  "type": "commonjs"  // CJS by default (also the default when omitted)
}
```

### File Extensions

- `.js` - Uses package.json type field
- `.mjs` - Always ESM
- `.cjs` - Always CommonJS

## Testing Strategies

### Unit Tests

```typescript
// Test all strategies
describe('Path Resolution', () => {
  it('should work in CommonJS', () => {
    // Mock __dirname
    global.__dirname = '/test/path';
    expect(getDirPath()).toBe('/test/path');
  });

  it('should parse stack traces in ESM', () => {
    // Mock Error.stack
    const originalError = Error;
    Error = class extends originalError {
      stack = 'at getDirPath (/test/path/path-resolver.ts:45:15)';
    };

    expect(getDirPath()).toBe('/test/path/');
  });

  it('should fallback to process.cwd()', () => {
    // When all else fails
    expect(getDirPath()).toBe(process.cwd());
  });
});
```

### Integration Tests

```typescript
// Test in real environments
describe('Real Environment Tests', () => {
  it('should resolve correct path in current project', () => {
    const resolved = getDirPath();
    const configExists = fs.existsSync(path.join(resolved, '../package.json'));
    expect(configExists).toBe(true);
  });
});
```

## Performance Considerations

### Strategy Performance

| Strategy      | Performance | Reliability | Use Case              |
| ------------- | ----------- | ----------- | --------------------- |
| CJS Detection | 🟢 Fastest  | 🟢 High     | CommonJS environments |
| Stack Parsing | 🟡 Medium   | 🟡 Medium   | ESM environments      |
| Fallback      | 🟢 Fast     | 🟠 Low      | Emergency fallback    |

### Optimization Tips

1. **Cache Results**: Store the resolved path if called frequently

```typescript
let cachedPath: string | undefined;

export function getDirPath(): string {
  if (cachedPath) return cachedPath;
  cachedPath = computeDirPath();
  return cachedPath;
}
```

2. **Early Detection**: Detect module system once at startup
3. **Avoid Stack Parsing**: Prefer CJS or explicit configuration when possible

## Common Issues & Solutions

### Issue 1: Wrong Directory in Tests

**Problem:** Test runner changes working directory

**Solution:** Use explicit path resolution

```typescript
// Instead of relying on process.cwd()
const testDir = path.join(getDirPath(), '../test');
```

### Issue 2: Bundler Complications

**Problem:** Webpack/Vite bundle changes file structure

**Solution:** Use build-time path injection

```typescript
// vite.config.ts
define: {
  __MODULE_DIR__: JSON.stringify(path.resolve(__dirname, 'src'));
}
```

### Issue 3: Stack Trace Format Changes

**Problem:** Different Node.js versions format stacks differently

**Solution:** Multiple parsing patterns

```typescript
const patterns = [
  /\((.*)path-resolver\.ts/, // Standard format
  /at (.*)path-resolver\.ts/, // Alternative format
  /file:\/\/(.*)path-resolver\.ts/, // ESM file:// URLs
];
```

## Best Practices

### 1. Use Universal Resolver

✅ **Do:**

```typescript
import { getDirPath } from './path-resolver.js';
const dir = getDirPath();
```

❌ **Don't:**

```typescript
// Don't assume module system
const dir = __dirname; // Fails in ESM
const dir = path.dirname(import.meta.url); // Fails in CJS
```

### 2. Handle Uncertainties

✅ **Do:**

```typescript
const dir = getDirPath();
if (!fs.existsSync(dir)) {
  console.warn('Path resolution may be inaccurate');
}
```

### 3. Cache When Appropriate

✅ **Do:**

```typescript
export const moduleDir = getDirPath(); // Computed once at import
```

### 4. Test Both Module Systems

✅ **Do:**

```typescript
// Test with both CJS and ESM builds
npm run test:cjs
npm run test:esm
```

## Migration Guide

### From Manual \_\_dirname Usage

**Before:**

```typescript
const configPath = path.join(__dirname, 'config.json');
```

**After:**

```typescript
import { getDirPath } from './path-resolver.js';
const configPath = path.join(getDirPath(), 'config.json');
```

### From import.meta.url Usage

**Before:**

```typescript
const configPath = path.join(path.dirname(new URL(import.meta.url).pathname), 'config.json');
```

**After:**

```typescript
import { getDirPath } from './path-resolver.js';
const configPath = path.join(getDirPath(), 'config.json');
```

## Future Considerations

### Node.js Evolution

- **Node.js 20+**: Better ESM support might change optimal strategies
- **Import Maps**: May provide new path resolution options
- **Package Exports**: Could influence module resolution

### Potential Improvements

1. **Build-time Detection**: Inject module system info at build time
2. **Package.json Parsing**: Read module type from nearest package.json
3. **Import Map Support**: Use import maps for explicit path configuration

## Files Reference

| File               | Purpose            | Module System |
| ------------------ | ------------------ | ------------- |
| `path-resolver.ts` | Universal resolver | Both CJS/ESM  |
| `path-cjs.ts`      | CommonJS-only      | CJS only      |
| `path-esm.ts`      | ESM-only           | ESM only      |

This path resolution system ensures reliable directory detection across all Node.js module systems while maintaining simplicity and performance.
