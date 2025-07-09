/**
 * @file config.ts
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
 *
 * DISCLAIMER: This software is provided "as is" without any warranty.
 * Use at your own risk. The author assumes no responsibility for any
 * damages or losses arising from the use of this software.
 */

/**
 * Browser Configuration Provider
 *
 * PURPOSE:
 * This file provides browser-compatible configuration management that integrates
 * with the unified configuration system used by the CLI and other components.
 *
 * FEATURES:
 * - Environment-based configuration selection
 * - Type-safe configuration with the same interface as Node.js configs
 * - Automatic network ID setting based on environment
 */

import { NetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import {
  createBrowserConfig,
  getDefaultBrowserConfig,
  type BrowserConfig,
  type ConfigEnvironment,
} from '../common/config.js';

export interface RuntimeConfiguration {
  LOGGING_LEVEL: string;
  NETWORK_ID: string;
  INDEXER_URI: string;
  INDEXER_WS_URI: string;
  PROOF_SERVER_URI?: string;
}

/**
 * Convert BrowserConfig to RuntimeConfiguration for backward compatibility
 */
function browserConfigToRuntimeConfig(config: BrowserConfig): RuntimeConfiguration {
  return {
    LOGGING_LEVEL: config.loggingLevel,
    NETWORK_ID: NetworkId[config.networkId],
    INDEXER_URI: config.indexer,
    INDEXER_WS_URI: config.indexerWS,
    PROOF_SERVER_URI: config.proofServer,
  };
}

/**
 * Load configuration in browser environment
 * This replaces the static config.json loading approach
 */
export const loadBrowserConfiguration = (environment?: ConfigEnvironment): RuntimeConfiguration => {
  try {
    const configEnv = environment || 'testnet-remote';
    const config = createBrowserConfig(configEnv);

    console.log(`🌙 Midnight App: Using ${configEnv} configuration`);
    console.log(`🔗 Indexer: ${config.indexer}`);
    console.log(`🌐 Network: ${NetworkId[config.networkId]}`);

    return browserConfigToRuntimeConfig(config);
  } catch (error) {
    console.warn('Failed to load browser configuration, using defaults:', error);
    const defaultConfig = getDefaultBrowserConfig();
    return browserConfigToRuntimeConfig(defaultConfig);
  }
};

/**
 * Get the current browser configuration
 */
export const getBrowserConfig = (environment?: ConfigEnvironment): BrowserConfig => {
  const configEnv = environment || 'testnet-remote';
  return createBrowserConfig(configEnv);
};

/**
 * Get available environments for UI selection
 */
export const getAvailableEnvironments = (): { value: ConfigEnvironment; label: string }[] => [
  { value: 'standalone', label: 'Standalone (Local Development)' },
  { value: 'testnet-local', label: 'TestNet Local' },
  { value: 'testnet-remote', label: 'TestNet Remote' },
];

// Re-export types for convenience
export type { BrowserConfig, ConfigEnvironment };
