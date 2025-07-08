// Browser-only API for Midnight Counter App
// This file contains browser-specific provider setup for the Counter App

import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import {
  PublicDataProvider,
  WalletProvider,
  MidnightProvider,
  PrivateStateProvider,
} from '@midnight-ntwrk/midnight-js-types';
import { proofClient, noopProofClient } from './proof-client';
import { CachedFetchZkConfigProvider } from './zk-config-provider';
import { CounterPrivateState } from '@midnight-ntwrk/counter-contract';
import { ImpureCounterCircuits, CounterProviders } from '../common/types';
import { contractConfig } from '../common/config';
import { WalletAPI, ProviderCallbackAction } from './types';

export { proofClient, noopProofClient } from './proof-client';
export { CachedFetchZkConfigProvider } from './zk-config-provider';

export const createCounterProviders = (
  publicDataProvider: PublicDataProvider,
  walletProvider: WalletProvider,
  midnightProvider: MidnightProvider,
  walletAPI: WalletAPI,
  callback: (action: ProviderCallbackAction) => void,
): CounterProviders => {
  const privateStateProvider: PrivateStateProvider<'counterPrivateState', CounterPrivateState> =
    levelPrivateStateProvider({
      privateStateStoreName: contractConfig.privateStateStoreName,
    });
  const proofProvider = proofClient(walletAPI.uris.proverServerUri);
  return {
    privateStateProvider,
    publicDataProvider,
    zkConfigProvider: new CachedFetchZkConfigProvider<ImpureCounterCircuits>(
      window.location.origin,
      fetch.bind(window),
      callback,
    ),
    proofProvider,
    walletProvider,
    midnightProvider,
  };
};
