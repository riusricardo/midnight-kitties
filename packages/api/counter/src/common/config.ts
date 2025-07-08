// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { NetworkId, setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { getDirPath } from './path-resolver.js';
import { existsSync, readFileSync, isNodeEnvironment, pathUtils } from './env.js';

// Get current directory in a way that works in both ESM and CJS
export const currentDir = getDirPath();

// Find the workspace root by looking for package.json or node_modules
/**
 * Find the workspace root directory by searching for specific markers.
 * This function is designed to be robust across different environments:
 * - Works in both ESM and CommonJS modules
 * - Handles monorepos (yarn/pnpm/npm workspaces, nx, turbo)
 * - Falls back gracefully if root can't be determined
 * - Supports browser environments with sensible defaults
 */
function findWorkspaceRoot(startDir: string): string {
  // In browser environments, we can't access the file system
  // so we return a sensible default path
  if (!isNodeEnvironment) {
    // Return a default path that would work in most configurations
    // This will be used for path construction but won't actually access files
    return '/workspace';
  }

  // Use cache for performance if we've already computed this
  const cachedRoot = (globalThis as any).__workspaceRootCache;
  if (cachedRoot) {
    console.log(`[DEBUG] Using cached workspace root: ${cachedRoot}`);
    return cachedRoot;
  }

  // We'll search upwards from multiple starting points to be robust
  // This covers cases where the package is installed in node_modules or linked in a workspace
  const searchDirs = [
    startDir,
    process.cwd(),
    // Add additional common starting points if necessary
    pathUtils.resolve(process.cwd(), '..'),
    pathUtils.resolve(startDir, '..'),
  ];
  const visited = new Set<string>();

  // Common workspace root indicator files
  const rootMarkers = [
    // Monorepo tools
    'turbo.json', // Turborepo
    'nx.json', // Nx
    'lerna.json', // Lerna
    'pnpm-workspace.yaml', // PNPM workspace
    'rush.json', // Rush
    // Version control
    '.git', // Git repository
    // Config files often at root
    '.eslintrc.js', // ESLint
    '.eslintrc.json',
    'tsconfig.base.json', // TypeScript project references
    'jest.config.js', // Jest
    'babel.config.js', // Babel
    // Package managers
    'yarn.lock', // Yarn
    'package-lock.json', // NPM
    'pnpm-lock.yaml', // PNPM
  ];

  for (const dir of searchDirs) {
    let currentDir = pathUtils.resolve(dir);

    // Walk upwards through directory hierarchy
    while (currentDir && !visited.has(currentDir)) {
      visited.add(currentDir);

      // Check for workspace root markers
      for (const marker of rootMarkers) {
        const markerPath = pathUtils.join(currentDir, marker);
        if (existsSync(markerPath)) {
          console.log(`[DEBUG] Found workspace root with ${marker} at: ${currentDir}`);
          // Cache the result for future calls
          (globalThis as any).__workspaceRootCache = currentDir;
          return currentDir;
        }
      }

      // Check for package.json with workspaces field (yarn/npm workspaces)
      const packageJsonPath = pathUtils.join(currentDir, 'package.json');
      if (existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
          if (packageJson.workspaces) {
            console.log(`[DEBUG] Found workspace root with package.json workspaces at: ${currentDir}`);
            // Cache the result for future calls
            (globalThis as any).__workspaceRootCache = currentDir;
            return currentDir;
          }
        } catch (e) {
          // Ignore JSON parsing errors, continue searching
          console.warn(`[WARN] Could not parse package.json at ${packageJsonPath}: ${e}`);
        }
      }

      // Check for monorepo structure patterns
      const packagesDir = pathUtils.join(currentDir, 'packages');
      const appsDir = pathUtils.join(currentDir, 'apps');
      if (existsSync(packagesDir) && existsSync(appsDir)) {
        console.log(`[DEBUG] Found workspace root with packages/ and apps/ at: ${currentDir}`);
        // Cache the result for future calls
        (globalThis as any).__workspaceRootCache = currentDir;
        return currentDir;
      }

      // Move up one directory
      const parentDir = pathUtils.dirname(currentDir);
      if (parentDir === currentDir) {
        break; // Reached root of file system
      }
      currentDir = parentDir;
    }
  }

  console.log('[DEBUG] Workspace root not found, falling back to startDir.');
  return startDir; // Absolute final fallback
}

const workspaceRoot = findWorkspaceRoot(currentDir);

console.log('[DEBUG] Final workspace root:', workspaceRoot);

export const contractConfig = {
  privateStateStoreName: 'counter-private-state',
  zkConfigPath: isNodeEnvironment
    ? pathUtils.resolve(workspaceRoot, 'packages', 'contracts', 'counter', 'src', 'managed', 'counter')
    : '/dist', // Browser fallback - relative path
};

export interface Config {
  logDir: string;
  indexer: string;
  indexerWS: string;
  node: string;
  proofServer: string;
}

export class TestnetLocalConfig implements Config {
  logDir = pathUtils.resolve(currentDir, '..', 'logs', 'testnet-local', `${new Date().toISOString()}.log`);
  indexer = 'http://127.0.0.1:8088/api/v1/graphql';
  indexerWS = 'ws://127.0.0.1:8088/api/v1/graphql/ws';
  node = 'http://127.0.0.1:9944';
  proofServer = 'http://127.0.0.1:6300';
  constructor() {
    setNetworkId(NetworkId.TestNet);
  }
}

export class StandaloneConfig implements Config {
  logDir = pathUtils.resolve(currentDir, '..', 'logs', 'standalone', `${new Date().toISOString()}.log`);
  indexer = 'http://127.0.0.1:8088/api/v1/graphql';
  indexerWS = 'ws://127.0.0.1:8088/api/v1/graphql/ws';
  node = 'http://127.0.0.1:9944';
  proofServer = 'http://127.0.0.1:6300';
  constructor() {
    setNetworkId(NetworkId.Undeployed);
  }
}

export class TestnetRemoteConfig implements Config {
  logDir = pathUtils.resolve(currentDir, '..', 'logs', 'testnet-remote', `${new Date().toISOString()}.log`);
  indexer = 'https://indexer.testnet-02.midnight.network/api/v1/graphql';
  indexerWS = 'wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws';
  node = 'https://rpc.testnet-02.midnight.network';
  proofServer = 'http://127.0.0.1:6300';
  constructor() {
    setNetworkId(NetworkId.TestNet);
  }
}

// Browser-compatible configuration interface
export interface BrowserConfig {
  readonly indexer: string;
  readonly indexerWS: string;
  readonly proofServer: string;
  readonly networkId: NetworkId;
  readonly loggingLevel: string;
}

// Browser-compatible configuration classes
export class BrowserTestnetLocalConfig implements BrowserConfig {
  indexer = 'http://127.0.0.1:8088/api/v1/graphql';
  indexerWS = 'ws://127.0.0.1:8088/api/v1/graphql/ws';
  proofServer = 'http://127.0.0.1:6300';
  networkId = NetworkId.TestNet;
  loggingLevel = 'info';
  constructor() {
    setNetworkId(NetworkId.TestNet);
  }
}

export class BrowserStandaloneConfig implements BrowserConfig {
  indexer = 'http://127.0.0.1:8088/api/v1/graphql';
  indexerWS = 'ws://127.0.0.1:8088/api/v1/graphql/ws';
  proofServer = 'http://127.0.0.1:6300';
  networkId = NetworkId.Undeployed;
  loggingLevel = 'info';
  constructor() {
    setNetworkId(NetworkId.Undeployed);
  }
}

export class BrowserTestnetRemoteConfig implements BrowserConfig {
  indexer = 'https://indexer.testnet-02.midnight.network/api/v1/graphql';
  indexerWS = 'wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws';
  proofServer = 'http://127.0.0.1:6300';
  networkId = NetworkId.TestNet;
  loggingLevel = 'trace';
  constructor() {
    setNetworkId(NetworkId.TestNet);
  }
}

// Configuration factory for browser environments
export type ConfigEnvironment = 'standalone' | 'testnet-local' | 'testnet-remote';

export function createBrowserConfig(environment: ConfigEnvironment = 'testnet-remote'): BrowserConfig {
  switch (environment) {
    case 'standalone':
      return new BrowserStandaloneConfig();
    case 'testnet-local':
      return new BrowserTestnetLocalConfig();
    case 'testnet-remote':
      return new BrowserTestnetRemoteConfig();
    default:
      throw new Error(`Unknown environment: ${environment}`);
  }
}

// Default browser configuration (mirrors current config.json values)
export function getDefaultBrowserConfig(): BrowserConfig {
  return createBrowserConfig('testnet-remote');
}
