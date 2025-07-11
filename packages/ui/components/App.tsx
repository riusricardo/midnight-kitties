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

import React, { useState } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, Container, Box, Typography, Paper } from '@mui/material';
import { theme } from '../config/theme.js';
import { LocalStateProvider } from '../contexts/LocalStateProviderContext.js';
import { RuntimeConfigurationProvider, useRuntimeConfiguration } from '../config/RuntimeConfiguration.js';
import { MidnightWalletProvider, useMidnightWallet } from './MidnightWallet.js';
import * as pino from 'pino';
import { type NetworkId, setNetworkId, getZswapNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { parseCoinPublicKeyToHex } from '@midnight-ntwrk/midnight-js-utils';
import { KittiesReaderApplication } from './KittiesReader.js';
import { type Logger } from 'pino';
import { createKittiesProviders } from '@repo/kitties-api/browser-api';
import type { KittiesProviders } from '@repo/kitties-api';

const KittiesAppContent: React.FC<{ logger: Logger }> = () => {
  const walletState = useMidnightWallet();
  const [kittiesProviders, setKittiesProviders] = useState<KittiesProviders | null>(null);
  const [providersLoading, setProvidersLoading] = useState(false);

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
    <Box sx={{ minHeight: 'auto', backgroundColor: '#f5f5f5' }}>
      {/* Wallet Widget - positioned at top right */}
      <Box sx={{ position: 'fixed', top: 16, right: 16, zIndex: 1000 }}>{walletState.widget}</Box>

      {/* Header */}
      <Box sx={{ backgroundColor: 'white', borderBottom: '1px solid #e0e0e0', py: 3 }}>
        <Container maxWidth={false} sx={{ maxWidth: '95%' }}>
          <Typography variant="h3" component="h1" align="center" sx={{ color: '#333', fontWeight: 'bold' }}>
            🐱 Midnight Kitties Gallery
          </Typography>
          <Typography variant="h6" component="p" align="center" sx={{ color: '#666', mt: 1 }}>
            Discover and manage your unique crypto kitties collection
          </Typography>
        </Container>
      </Box>

      {/* Main Content */}
      <Container maxWidth={false} sx={{ maxWidth: '100%', py: 1, px: 2 }}>
        {walletState.isConnected ? (
          <Box sx={{ width: '100%' }}>
            {providersLoading ? (
              <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h6" color="textSecondary">
                  Initializing Kitties providers...
                </Typography>
              </Paper>
            ) : kittiesProviders ? (
              <KittiesReaderApplication
                providers={kittiesProviders}
                walletPublicKey={
                  walletState.walletAPI?.coinPublicKey
                    ? parseCoinPublicKeyToHex(walletState.walletAPI.coinPublicKey, getZswapNetworkId())
                    : undefined
                }
              />
            ) : (
              <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h6" color="error">
                  Failed to initialize providers. Please try reconnecting your wallet.
                </Typography>
              </Paper>
            )}
          </Box>
        ) : (
          <Paper elevation={3} sx={{ p: 4, textAlign: 'center', maxWidth: 800, mx: 'auto' }}>
            <Typography variant="h4" gutterBottom sx={{ color: '#333' }}>
              🐱 Welcome to Midnight Kitties
            </Typography>
            <Typography variant="body1" color="textSecondary" sx={{ mb: 3, fontSize: '1.1rem' }}>
              Connect your Midnight Lace wallet to start exploring your unique crypto kitties collection. Create, view,
              and manage your adorable digital companions!
            </Typography>
            <Box sx={{ mt: 3 }}>{walletState.widget}</Box>
          </Paper>
        )}
      </Container>
      {/* Debug info */}
      <Paper elevation={1} sx={{ p: 1, mb: 1, backgroundColor: '#f8f9fa' }}>
        <Typography variant="h6" gutterBottom>
          Debug Info:
        </Typography>
        <Typography variant="body2">Address: {walletState.address}</Typography>
        <Typography variant="body2">CoinPublicKey: {walletState.walletAPI?.coinPublicKey}</Typography>
        {walletState.walletAPI?.coinPublicKey && (
          <Typography variant="body2">
            CoinPublicKey (hex): {parseCoinPublicKeyToHex(walletState.walletAPI.coinPublicKey, getZswapNetworkId())}
          </Typography>
        )}
      </Paper>
    </Box>
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
