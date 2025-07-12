# Kitties API Reference

The Kitties API provides a unified interface for interacting with the CryptoKitties smart contract from both browser and Node.js environments.

## Table of Contents

### Getting Started
- [Installation](#installation)
- [Quick Start](#quick-start)
  - [Browser Environment](#browser-environment)
  - [Node.js Environment](#nodejs-environment)

### API Documentation
- [Core API](#core-api)
  - [Contract Management](#contract-management)
  - [Kitty Operations](#kitty-operations)
  - [Marketplace Operations](#marketplace-operations)
  - [Breeding System](#breeding-system)
  - [NFT Standard Operations](#nft-standard-operations)
- [Static Utility Methods](#static-utility-methods)
- [Data Types](#data-types)
- [Provider Configuration](#provider-configuration)

### Configuration & Setup
- [Package Configuration & Dependencies](#package-configuration--dependencies)
  - [Package.json Export Structure](#packagejson-export-structure)
  - [Vite Configuration for Browser Builds](#vite-configuration-for-browser-builds)
  - [Environment Abstraction Layer](#environment-abstraction-layer)
  - [Preventing Dependency Leaks](#preventing-dependency-leaks)
  - [Resolution Path Best Practices](#resolution-path-best-practices)
  - [Debugging Configuration Issues](#debugging-configuration-issues)

### Development & Troubleshooting
- [Error Handling](#error-handling)
- [State Observation](#state-observation)
- [Testing](#testing)
- [Environment Differences](#environment-differences)


### Additional Resources
- [Architecture Documentation](#architecture-documentation)

---

## Installation

```bash
yarn add @repo/kitties-api
```

## Quick Start

### Browser Environment
```typescript
import { KittiesAPI, configureBrowserProviders } from '@repo/kitties-api';

// Configure providers
const providers = await configureBrowserProviders(wallet, config, zkConfigProvider);

// Deploy new contract
const kittiesApi = await KittiesAPI.deploy(providers, {});

// Or connect to existing contract
const kittiesApi = await KittiesAPI.connect(providers, contractAddress);
```

### Node.js Environment
```typescript
import { KittiesAPI, configureProviders } from '@repo/kitties-api/node-api';

// Configure providers
const providers = await configureProviders(wallet, config, zkConfigProvider);

// Deploy or connect
const kittiesApi = await KittiesAPI.deploy(providers, {});
```

## Core API

### Contract Management

#### `KittiesAPI.deploy(providers, options)`
Deploy a new kitties contract.

**Parameters:**
- `providers: KittiesProviders` - Configured Midnight providers

**Returns:** `Promise<KittiesAPI>`

```typescript
const kittiesApi = await KittiesAPI.deploy(providers, {});
```

#### `KittiesAPI.connect(providers, contractAddress)`
Connect to an existing contract.

**Parameters:**
- `providers: KittiesProviders` - Configured Midnight providers  
- `contractAddress: ContractAddress | string` - Contract address

**Returns:** `Promise<KittiesAPI>`

```typescript
const kittiesApi = await KittiesAPI.connect(providers, "123...");
```

### Kitty Operations

#### `createKitty(): Promise<void>`
Create a new kitty with random DNA.

```typescript
await kittiesApi.createKitty();
```

#### `getKitty(kittyId): Promise<KittyData>`
Get kitty details by ID.

**Parameters:**
- `kittyId: bigint` - Kitty ID

**Returns:** `Promise<KittyData>`

```typescript
const kitty = await kittiesApi.getKitty(1n);
console.log(kitty.dna, kitty.gender, kitty.owner);
```

#### `transferKitty(params): Promise<void>`
Transfer kitty to another address.

**Parameters:**
- `params.to: { bytes: Uint8Array }` - Recipient address
- `params.kittyId: bigint` - Kitty ID

```typescript
await kittiesApi.transferKitty({
  to: { bytes: recipientBytes },
  kittyId: 1n
});
```

#### `getAllKittiesCount(): Promise<bigint>`
Get total number of kitties created.

```typescript
const count = await kittiesApi.getAllKittiesCount();
```

#### `getUserKitties(owner): Promise<KittyData[]>`
Get all kitties owned by an address.

**Parameters:**
- `owner: { bytes: Uint8Array }` - Owner address

```typescript
const kitties = await kittiesApi.getUserKitties(ownerAddress);
```

#### `getMyKitties(from): Promise<KittyData[]>`
Convenience method to get kitties for current wallet.

**Parameters:**
- `from: { bytes: Uint8Array }` - Wallet address

```typescript
const myKitties = await kittiesApi.getMyKitties(walletAddress);
```

### Marketplace Operations

#### `setPrice(params): Promise<void>`
Set sale price for a kitty.

**Parameters:**
- `params.kittyId: bigint` - Kitty ID
- `params.price: bigint` - Sale price

```typescript
await kittiesApi.setPrice({
  kittyId: 1n,
  price: 100n
});
```

#### `createBuyOffer(params): Promise<void>`
Make a purchase offer on a kitty.

**Parameters:**
- `params.kittyId: bigint` - Kitty ID
- `params.bidPrice: bigint` - Offered price

```typescript
await kittiesApi.createBuyOffer({
  kittyId: 1n,
  bidPrice: 120n
});
```

#### `approveOffer(params): Promise<void>`
Accept a purchase offer (transfers ownership).

**Parameters:**
- `params.kittyId: bigint` - Kitty ID
- `params.buyer: { bytes: Uint8Array }` - Buyer address

```typescript
await kittiesApi.approveOffer({
  kittyId: 1n,
  buyer: buyerAddress
});
```

#### `getKittiesForSale(): Promise<KittyListingData[]>`
Get all kitties currently for sale.

```typescript
const forSale = await kittiesApi.getKittiesForSale();
```

#### `getOffer(params): Promise<Offer>`
Get offer details for a specific kitty and buyer.

**Parameters:**
- `params.kittyId: bigint` - Kitty ID
- `params.buyer: { bytes: Uint8Array }` - Buyer address

```typescript
const offer = await kittiesApi.getOffer({
  kittyId: 1n,
  buyer: buyerAddress
});
```

### Breeding System

#### `breedKitty(params): Promise<void>`
Breed two kitties to create offspring.

**Parameters:**
- `params.kittyId1: bigint` - First parent ID
- `params.kittyId2: bigint` - Second parent ID

```typescript
await kittiesApi.breedKitty({
  kittyId1: 1n,
  kittyId2: 2n
});
```

### NFT Standard Operations

The API exposes standard ERC-721 operations through the external NFT module:

#### `balanceOf(owner): Promise<bigint>`
Get number of tokens owned by an address.

```typescript
const balance = await kittiesApi.balanceOf(ownerAddress);
```

#### `ownerOf(tokenId): Promise<{ bytes: Uint8Array }>`
Get owner of a specific token.

```typescript
const owner = await kittiesApi.ownerOf(1n);
```

#### `approve(params): Promise<void>`
Approve another address to transfer a token.

**Parameters:**
- `params.to: { bytes: Uint8Array }` - Approved address
- `params.tokenId: bigint` - Token ID

```typescript
await kittiesApi.approve({
  to: approvedAddress,
  tokenId: 1n
});
```

#### `getApproved(tokenId): Promise<{ bytes: Uint8Array }>`
Get approved address for a token.

```typescript
const approved = await kittiesApi.getApproved(1n);
```

#### `setApprovalForAll(params): Promise<void>`
Set approval for all tokens.

**Parameters:**
- `params.operator: { bytes: Uint8Array }` - Operator address
- `params.approved: boolean` - Approval status

```typescript
await kittiesApi.setApprovalForAll({
  operator: operatorAddress,
  approved: true
});
```

#### `isApprovedForAll(params): Promise<boolean>`
Check if operator is approved for all tokens.

**Parameters:**
- `params.owner: { bytes: Uint8Array }` - Owner address
- `params.operator: { bytes: Uint8Array }` - Operator address

```typescript
const isApproved = await kittiesApi.isApprovedForAll({
  owner: ownerAddress,
  operator: operatorAddress
});
```

## Static Utility Methods

### `KittiesAPI.createKitty(kittiesApi): Promise<TransactionResponse>`
Static wrapper for creating kitties with transaction info.

### `KittiesAPI.getKittiesCount(providers, contractAddress): Promise<bigint | null>`
Get kitty count without full API instance.

### `KittiesAPI.getContractAddress(kittiesApi): string`
Get contract address from API instance.

## Data Types

### `KittyData`
```typescript
interface KittyData {
  id: bigint;
  dna: bigint;
  gender: Gender;
  owner: { bytes: Uint8Array };
  price: bigint;
  forSale: boolean;
  generation: bigint;
}
```

### `KittyListingData`
```typescript
interface KittyListingData {
  id: bigint;
  kitty: KittyData;
}
```

### `Offer`
```typescript
interface Offer {
  kittyId: bigint;
  buyer: { bytes: Uint8Array };
  price: bigint;
}
```

### `TransactionResponse`
```typescript
interface TransactionResponse {
  txId?: string;
  txHash?: string;
  blockHeight?: bigint | number;
}
```

## Provider Configuration

### Browser Providers
```typescript
import { configureBrowserProviders } from '@repo/kitties-api';

const providers = await configureBrowserProviders(
  wallet,
  config,
  zkConfigProvider
);
```

### Node.js Providers
```typescript
import { configureProviders } from '@repo/kitties-api/node-api';

const providers = await configureProviders(
  wallet,
  config,
  zkConfigProvider
);
```

## Error Handling

The API throws descriptive errors for common issues:

```typescript
try {
  await kittiesApi.createBuyOffer({ kittyId: 1n, bidPrice: 50n });
} catch (error) {
  if (error.message.includes('Kitty is not for sale')) {
    console.log('Cannot make offer on kitty not for sale');
  }
}
```

## State Observation

The API provides an observable for real-time state updates:

```typescript
kittiesApi.state$.subscribe(state => {
  console.log('Kitties count:', state.allKittiesCount);
  console.log('Kitties data:', state.kitties);
});
```

## Testing

### Integration Tests
```bash
cd packages/api/kitties
yarn test
```

### Test Against Testnet
```bash
yarn test-against-testnet
```

## Environment Differences

### Browser vs Node.js
- Browser: Uses wallet connector for transactions
- Node.js: Direct wallet integration
- Both: Same API surface, different provider setup

#### Configuration Files

- **[apps/web/vite.config.ts](../../apps/web/vite.config.ts)** - Vite configuration with aliases and comments
## Key Concepts Documented

### 🌐 Cross-Platform Compatibility

**Problem**: The kitties-api needs to work in both Node.js and browser environments with different capabilities.

**Solutions Documented**:

- Environment abstraction layer (`env.ts`, `env-node.ts`, `env-browser.ts`)
- Universal path resolution (`path-resolver.ts`)
- Vite alias configuration for browser builds

### 🔧 Build System Integration

**Configuration Points**:

- **Vite Aliases**: Route browser imports to browser-compatible implementations
- **TypeScript**: Maintain type safety across environments
- **Module Systems**: Handle both CommonJS and ESM contexts

## Package Configuration & Dependencies

### Package.json Export Structure

The Kitties API uses a sophisticated export structure to handle different environments and prevent dependency leaks:

```json
{
  "exports": {
    ".": {
      "browser": {
        "types": "./dist/browser-index.d.ts",
        "import": "./dist/browser-index.js"
      },
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./node-api": {
      "types": "./dist/node/api.d.ts",
      "import": "./dist/node/api.js"
    },
    "./browser-api": {
      "types": "./dist/browser/api.d.ts",
      "import": "./dist/browser/api.js"
    },
    "./src/browser/env-browser.ts": "./src/browser/env-browser.ts"
  }
}
```

**Key Benefits:**
- **Environment Isolation**: Browser and Node.js environments get different entry points
- **Dependency Control**: Prevents Node.js-specific dependencies from leaking into browser builds
- **Type Safety**: Separate type definitions for each environment
- **Direct Access**: Allows importing specific modules when needed

### Vite Configuration for Browser Builds

The project's web application demonstrates how to configure Vite for proper browser builds. See [`apps/web/vite.config.ts`](../../apps/web/vite.config.ts) for the complete configuration:

**Key Configuration Highlights:**

```typescript
// From apps/web/vite.config.ts
export default defineConfig({
  plugins: [
    react(),
    viteCommonjs({
      include: ['@repo/kitties-api/**'],  // Handle CommonJS in kitties-api
    }),
    wasm(),
  ],
  resolve: {
    alias: {
      ...stdLibBrowser,  // Node.js standard library polyfills
      
      // Environment Abstraction Layer Aliases
      // These ensure browser builds use browser-compatible implementations
      '@repo/kitties-api/src/env': '@repo/kitties-api/dist/browser/env-browser',
      '@repo/kitties-api/dist/env': '@repo/kitties-api/dist/browser/env-browser',
      '@repo/kitties-api/dist/env-node': '@repo/kitties-api/dist/browser/env-browser',
      './env-node.js': '@repo/kitties-api/dist/browser/env-browser',
      './env-node': '@repo/kitties-api/dist/browser/env-browser',
      '../node/env-node.js': '@repo/kitties-api/dist/browser/env-browser',
    },
  },
  optimizeDeps: {
    include: ['@repo/kitties-api'],
    exclude: ['@midnight-ntwrk/kitties-contract', 'node-fetch', 'fetch-blob'],
  },
  build: {
    rollupOptions: {
      external: [
        '@midnight-ntwrk/midnight-js-node-zk-config-provider',
        'fetch-blob',
        'node-domexception',
        'formdata-polyfill',
      ],
    },
  },
});
```

**Critical Configuration Elements:**

1. **Environment Abstraction Aliases**: Multiple alias patterns ensure that any import path referring to Node.js environment code gets redirected to browser-compatible implementations.

2. **CommonJS Handling**: The `viteCommonjs` plugin specifically includes the kitties-api package to handle mixed module formats.

3. **Standard Library Polyfills**: Uses `node-stdlib-browser` to provide browser-compatible versions of Node.js built-ins.

4. **Dependency Optimization**: Includes the API package for pre-bundling while excluding Node.js-specific dependencies.

5. **External Dependencies**: Explicitly marks Node.js-only packages as external to prevent them from being bundled.

### Environment Abstraction Layer

The API uses an environment abstraction layer to handle differences between browser and Node.js:

**Structure:**
```
src/
├── common/           # Shared code
├── browser/          # Browser-specific implementations
│   ├── env-browser.ts    # Browser environment stubs
│   └── api.ts           # Browser API layer
├── node/             # Node.js-specific implementations
│   ├── env-node.ts      # Node.js environment functions
│   └── api.ts           # Node.js API layer
└── env.ts            # Runtime environment detection
```

**Key Features:**
- **Runtime Detection**: Automatically detects browser vs Node.js environment
- **Graceful Fallbacks**: Browser stubs for Node.js-only functions
- **Type Safety**: Consistent interfaces across environments
- **Dependency Isolation**: Prevents platform-specific dependencies from cross-contaminating

### Preventing Dependency Leaks

**1. Environment-Specific Exports**
```typescript
// Browser builds import from browser-specific entry point
import { KittiesAPI } from '@repo/kitties-api/browser-api';

// Node.js builds import from node-specific entry point  
import { KittiesAPI } from '@repo/kitties-api/node-api';
```

**2. Conditional Imports**
```typescript
// env.ts - Runtime environment detection
const isNode = typeof process !== 'undefined' && process.versions?.node;

if (isNode) {
  // Import Node.js-specific modules only in Node.js environment
  const { readFileSync } = await import('fs');
} else {
  // Use browser-compatible alternatives
  throw new Error('File operations not supported in browser');
}
```

**3. Build-Time Exclusions**
```json
// package.json - Exclude Node.js dependencies from browser builds
{
  "browser": {
    "fs": false,
    "path": false,
    "crypto": false
  }
}
```

### Resolution Path Best Practices

**For Applications Using the API:**

1. **Use Environment-Specific Imports**
   ```typescript
   // ✅ Good - Browser applications
   import { KittiesAPI } from '@repo/kitties-api/browser-api';
   
   // ✅ Good - Node.js applications
   import { KittiesAPI } from '@repo/kitties-api/node-api';
   
   // ❌ Avoid - May pull in wrong dependencies
   import { KittiesAPI } from '@repo/kitties-api';
   ```

2. **Configure Bundle Resolvers**
   ```typescript
   // webpack.config.js
   module.exports = {
     resolve: {
       alias: {
         '@repo/kitties-api$': '@repo/kitties-api/browser-api'
       },
       fallback: {
         "fs": false,
         "path": false
       }
     }
   };
   ```

3. **Handle Dynamic Imports**
   ```typescript
   // Use dynamic imports for optional Node.js functionality
   let nodeApi;
   try {
     nodeApi = await import('@repo/kitties-api/node-api');
   } catch (error) {
     // Fallback for browser environment
     console.log('Node.js API not available in browser');
   }
   ```

### Debugging Configuration Issues

**Common Issues and Solutions:**

1. **"Module not found" errors in browser**
   - Check Vite alias configuration
   - Ensure using browser-specific import paths
   - Verify nodePolyfills plugin configuration

2. **Node.js dependencies in browser bundle**
   - Review export structure in package.json
   - Check for incorrect import paths
   - Add explicit exclusions in bundler config

3. **Type resolution errors**
   - Ensure TypeScript can resolve environment-specific types
   - Check tsconfig.json path mappings
   - Verify dist/ folder structure after build

**Debug Commands:**
```bash
# Check resolved imports
yarn why @repo/kitties-api

# Analyze bundle composition
npx vite-bundle-analyzer

# Verify type resolution
tsc --noEmit --listFiles
```
## Architecture Documentation

For detailed implementation information, see:

- **[ENVIRONMENT_ABSTRACTION.md](./ENVIRONMENT_ABSTRACTION.md)** - Environment abstraction layer
- **[PATH_RESOLUTION.md](./PATH_RESOLUTION.md)** - Module resolution documentation

This documentation ensures the kitties-api remains maintainable and understandable as the project evolves.
