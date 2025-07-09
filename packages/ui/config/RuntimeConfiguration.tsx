/**
 * @file RuntimeConfiguration.tsx
 * @license GPL-3.0
 *
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

import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadBrowserConfiguration, type RuntimeConfiguration as BrowserRuntimeConfiguration } from '@repo/kitties-api';

export interface RuntimeConfiguration extends BrowserRuntimeConfiguration {
  // UI-specific configuration can be added here if needed
}

const RuntimeConfigurationContext = createContext<RuntimeConfiguration | null>(null);

export const useRuntimeConfiguration = (): RuntimeConfiguration => {
  const configuration = useContext(RuntimeConfigurationContext);
  if (!configuration) {
    throw new Error('Configuration not loaded');
  }
  return configuration;
};

interface RuntimeConfigurationProviderProps {
  children: React.ReactNode;
}

/**
 * Loads runtime configuration using the unified configuration system.
 */
export const loadRuntimeConfiguration = (): RuntimeConfiguration => {
  // Use default testnet-remote configuration for now
  // TODO: Add environment detection in a separate component with proper DOM types
  return loadBrowserConfiguration('testnet-remote');
};

export const RuntimeConfigurationProvider: React.FC<RuntimeConfigurationProviderProps> = ({ children }) => {
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfiguration | null>(null);

  useEffect(() => {
    const loadConfig = (): void => {
      const loadedConfig = loadRuntimeConfiguration();
      setRuntimeConfig(loadedConfig);
    };
    loadConfig();
  }, []);

  return (
    <RuntimeConfigurationContext.Provider value={runtimeConfig}>
      {runtimeConfig ? children : <div>Loading configuration...</div>}
    </RuntimeConfigurationContext.Provider>
  );
};

export default RuntimeConfigurationProvider;
