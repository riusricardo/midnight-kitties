/**
 * @file api.ts
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

// Browser-only API for Midnight Kitties App
// This file contains browser-specific provider setup for the Kitties App

import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import {
  PublicDataProvider,
  WalletProvider,
  MidnightProvider,
  PrivateStateProvider,
} from '@midnight-ntwrk/midnight-js-types';
import { proofClient, noopProofClient } from './proof-client';
import { CachedFetchZkConfigProvider } from './zk-config-provider';
import { KittiesPrivateState } from '@midnight-ntwrk/kitties-contract';
import { ImpureKittiesCircuits, KittiesProviders } from '../common/types';
import { contractConfig } from '../common/config';
import { WalletAPI, ProviderCallbackAction } from './types';

export { proofClient, noopProofClient } from './proof-client';
export { CachedFetchZkConfigProvider } from './zk-config-provider';

export const createKittiesProviders = (
  publicDataProvider: PublicDataProvider,
  walletProvider: WalletProvider,
  midnightProvider: MidnightProvider,
  walletAPI: WalletAPI,
  callback: (action: ProviderCallbackAction) => void,
): KittiesProviders => {
  const privateStateProvider: PrivateStateProvider<'kittiesPrivateState', KittiesPrivateState> =
    levelPrivateStateProvider({
      privateStateStoreName: contractConfig.privateStateStoreName,
    });
  const proofProvider = proofClient(walletAPI.uris.proverServerUri);
  return {
    privateStateProvider,
    publicDataProvider,
    zkConfigProvider: new CachedFetchZkConfigProvider<ImpureKittiesCircuits>(
      window.location.origin,
      fetch.bind(window),
      callback,
    ),
    proofProvider,
    walletProvider,
    midnightProvider,
  };
};
