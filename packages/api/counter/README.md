# Counter API Documentation Index

This document provides an overview of all the documentation files and commented code in the counter-api package to help developers understand the architecture and implementation.

## Documentation Files

### 📁 Core Architecture

- **[WEBSOCKET_SHIM.md](./WEBSOCKET_SHIM.md)** - WebSocket compatibility shim for browser builds
- **[ENVIRONMENT_ABSTRACTION.md](./ENVIRONMENT_ABSTRACTION.md)** - Environment abstraction layer architecture

### 📄 Source Code with Documentation

#### Environment Abstraction Layer

- **[src/env.ts](./src/env.ts)** - Main abstraction layer with runtime detection
- **[src/env-node.ts](./src/env-node.ts)** - Node.js-specific implementations
- **[src/env-browser.ts](./src/env-browser.ts)** - Browser-compatible stubs and fallbacks
- **[src/path-resolver.ts](./src/path-resolver.ts)** - Universal path resolution for CJS/ESM

#### Configuration Files

- **[apps/web/vite.config.ts](../../apps/web/vite.config.ts)** - Vite configuration with aliases and comments

## Key Concepts Documented

### 🌐 Cross-Platform Compatibility

**Problem**: The counter-api needs to work in both Node.js and browser environments with different capabilities.

**Solutions Documented**:

- Environment abstraction layer (`env.ts`, `env-node.ts`, `env-browser.ts`)
- Universal path resolution (`path-resolver.ts`)
- Vite alias configuration for browser builds

### 🔧 Build System Integration

**Configuration Points**:

- **Vite Aliases**: Route browser imports to browser-compatible implementations
- **TypeScript**: Maintain type safety across environments
- **Module Systems**: Handle both CommonJS and ESM contexts

### 📋 Documentation Standards

Each documented file includes:

- **Purpose**: What problem it solves
- **Usage**: How to use it correctly
- **Configuration**: Where it's configured
- **Benefits**: Why this approach was chosen
- **Technical Details**: Implementation specifics

## Quick Reference

| Need            | File               | Key Function                |
| --------------- | ------------------ | --------------------------- |
| File operations | `env.ts`           | `readFile()`, `writeFile()` |
| Path detection  | `path-resolver.ts` | `getDirPath()`              |
| Browser config  | `vite.config.ts`   | Aliases section             |

## For New Developers

1. **Start with**: [ENVIRONMENT_ABSTRACTION.md](./ENVIRONMENT_ABSTRACTION.md) for architecture overview
2. **Browser issues**: Check [WEBSOCKET_SHIM.md](./WEBSOCKET_SHIM.md) for WebSocket problems
3. **Adding features**: Follow patterns in `env.ts` for cross-platform compatibility
4. **Build problems**: Check Vite aliases in `apps/web/vite.config.ts`

## Maintenance Notes

- Environment abstraction files should stay in sync (add to all three: `env.ts`, `env-node.ts`, `env-browser.ts`)
- WebSocket shim may need updates if `isomorphic-ws` changes
- Path resolver handles both CJS and ESM - test both when modifying
- Vite aliases are critical for browser builds - document any changes

This documentation ensures the counter-api remains maintainable and understandable as the project evolves.
