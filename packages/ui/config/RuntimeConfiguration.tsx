import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadBrowserConfiguration, type RuntimeConfiguration as BrowserRuntimeConfiguration } from '@repo/counter-api';

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
