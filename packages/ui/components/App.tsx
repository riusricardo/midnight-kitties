/**
 * @file App.tsx
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

/* eslint-disable prettier/prettier */
import React, { useState } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, Container, Box, Typography, Paper, Tabs, Tab } from '@mui/material';
import { theme } from '../config/theme.js';
import { LocalStateProvider } from '../contexts/LocalStateProviderContext.js';
import { RuntimeConfigurationProvider, useRuntimeConfiguration } from '../config/RuntimeConfiguration.js';
import { MidnightWalletProvider, useMidnightWallet } from './MidnightWallet.js';
import * as pino from 'pino';
import { type NetworkId, setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { KittiesApplication } from './KittiesDeploy.js';
import { KittiesReaderApplication } from './KittiesReader.js';
import { type Logger } from 'pino';
import { createKittiesProviders } from '@repo/kitties-api/browser-api';
import type { KittiesProviders } from '@repo/kitties-api';

const KittiesAppContent: React.FC<{ logger: Logger }> = () => {
  const walletState = useMidnightWallet();
  const [tabValue, setTabValue] = useState(0);
  const [kittiesProviders, setKittiesProviders] = useState<KittiesProviders | null>(null);
  const [providersLoading, setProvidersLoading] = useState(false);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Initialize providers when wallet is connected
  React.useEffect(() => {
    if (walletState.walletAPI && walletState.isConnected) {
      setProvidersLoading(true);
      try {
        const midnightProviders = createKittiesProviders(
          walletState.publicDataProvider,
          walletState.walletProvider,
          walletState.midnightProvider,
          walletState.walletAPI!,
          walletState.callback,
        ) as KittiesProviders;
        setKittiesProviders(midnightProviders);
      } catch {
        // Failed to initialize providers - will be handled by the loading state
      } finally {
        setProvidersLoading(false);
      }
    } else {
      setKittiesProviders(null);
      setProvidersLoading(false);
    }
  }, [
    walletState.walletAPI,
    walletState.isConnected,
    walletState.publicDataProvider,
    walletState.walletProvider,
    walletState.midnightProvider,
    walletState.callback,
  ]);

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      {/* Wallet Widget - positioned at top right */}
      <Box sx={{ position: 'fixed', top: 16, right: 16, zIndex: 1000 }}>{walletState.widget}</Box>

      <Typography variant="h3" component="h1" gutterBottom align="center">
        Midnight Kitties App
      </Typography>
      <Box sx={{ my: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 600 }}>
        {walletState.isConnected ? (
          <Paper elevation={3} sx={{ p: 3, width: '100%', maxWidth: 600 }}>
            <Tabs value={tabValue} onChange={handleTabChange} centered sx={{ mb: 3 }}>
              <Tab label="Deploy & Manage" />
              <Tab label="Read Existing Contract" />
            </Tabs>

            {providersLoading ? (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Typography>Loading providers...</Typography>
              </Box>
            ) : (
              <>
                {tabValue === 0 && kittiesProviders && (
                  <KittiesApplication
                    providers={kittiesProviders}
                    walletPublicKey={walletState.walletAPI?.coinPublicKey}
                  />
                )}
                {tabValue === 1 && kittiesProviders && (
                  <KittiesReaderApplication
                    providers={kittiesProviders}
                    walletPublicKey={walletState.walletAPI?.coinPublicKey}
                  />
                )}
              </>
            )}
          </Paper>
        ) : (
          <Paper elevation={3} sx={{ p: 3, width: '100%', maxWidth: 600, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom color="textSecondary">
              Welcome to Midnight Kitties App
            </Typography>
            <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
              Please connect your Midnight Lace wallet to start using the Kitties Application
            </Typography>
            {walletState.widget}
          </Paper>
        )}
      </Box>
    </Container>
  );
};

const AppWithConfig: React.FC = () => {
  const config = useRuntimeConfiguration();
  const logger = pino.pino({
    level: config.LOGGING_LEVEL || 'info',
    timestamp: pino.stdTimeFunctions.isoTime,
  });
  setNetworkId(config.NETWORK_ID as NetworkId);

  return (
    <LocalStateProvider logger={logger}>
      <MidnightWalletProvider logger={logger}>
        <KittiesAppContent logger={logger} />
      </MidnightWalletProvider>
    </LocalStateProvider>
  );
};

const App: React.FC = () => {
  return (
    <>
      <CssBaseline />
      <RuntimeConfigurationProvider>
        <ThemeProvider theme={theme}>
          <AppWithConfig />
        </ThemeProvider>
      </RuntimeConfigurationProvider>
    </>
  );
};

export default App;
