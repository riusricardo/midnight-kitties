/**
 * @file WalletWidget.tsx
 * @license GPL-3.0
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

import React from 'react';
import type { Address } from '@midnight-ntwrk/wallet-api';
import { Alert, Button, CircularProgress, Typography } from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import { type Logger } from 'pino';

export enum MidnightWalletErrorType {
  WALLET_NOT_FOUND = 'WALLET_NOT_FOUND',
  INCOMPATIBLE_API_VERSION = 'INCOMPATIBLE_API_VERSION',
  TIMEOUT_FINDING_API = 'TIMEOUT_FINDING_API',
  TIMEOUT_API_RESPONSE = 'TIMEOUT_API_RESPONSE',
  ENABLE_API_FAILED = 'ENABLE_API_FAILED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export const WalletWidget = (
  connect: () => Promise<void>,
  shake: boolean,
  walletIsOpen: boolean,
  isChromeBrowser: boolean,
  proofServerIsOnline: boolean,
  isConnecting: boolean,
  _logger: Logger,
  isFloatingOpen: boolean,
  address?: Address,
  walletError?: MidnightWalletErrorType,
): React.ReactNode => {
  const box = (content: React.ReactNode): React.ReactNode => {
    return (
      <div
        style={{
          paddingBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          borderRadius: '8px',
          borderColor: '#ccc',
        }}
      >
        {content}
      </div>
    );
  };

  let error: React.ReactNode;

  if (!isChromeBrowser) {
    error = <Alert severity="warning">This application only works on Chrome browsers. Please switch to Chrome.</Alert>;
  }

  if (walletError) {
    if (walletError === MidnightWalletErrorType.UNAUTHORIZED) {
      error = (
        <Alert severity="error">
          Connection Failed: You did not authorize the DApp to connect to your Midnight wallet. Please try again if you
          wish to proceed.
        </Alert>
      );
    } else if (walletError === MidnightWalletErrorType.WALLET_NOT_FOUND) {
      error = (
        <Alert severity="error">
          Connection Failed: Could not find Midnight Lace wallet
          <br />
          <a
            href={'https://docs.midnight.network/develop/tutorial/using/chrome-ext'}
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn how to install the wallet to use this application.
          </a>
        </Alert>
      );
    } else
      error = (
        <Alert severity="error">
          {`Error: ${walletError.replace(/_/g, ' ')}.`}
          <br />
          <a
            href={'https://docs.midnight.network/develop/tutorial/using/chrome-ext'}
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn how to resolve this issue.
          </a>
        </Alert>
      );
  }

  const connectOrShowWallet: () => Promise<void> = async () => {
    if (!error && !address) {
      await connect();
    }
  };

  const icon = isConnecting ? <CircularProgress size={10} /> : error ? <ErrorIcon /> : <CheckBoxIcon />;

  return box(
    <div>
      <Typography align="right" variant="body2" color="cornsilk">
        <div
          style={{
            position: 'relative',
            display: 'inline-block',
          }}
        >
          <Button startIcon={icon} onClick={connectOrShowWallet} size="small" variant={'outlined'}>
            {address
              ? 'Connected: ' +
                address.substring(0, 6) +
                '...' +
                address.substring(22, 26) +
                '...' +
                address.substring(124, 132)
              : 'Connect Wallet'}
          </Button>
        </div>
      </Typography>
    </div>,
  );
};
