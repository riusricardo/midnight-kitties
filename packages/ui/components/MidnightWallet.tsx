/* global console */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Logger } from 'pino';
import { type Address, type CoinPublicKey } from '@midnight-ntwrk/wallet-api';
import { type ImpureCounterCircuits, contractConfig } from '@repo/counter-api';
import {
  type BalancedTransaction,
  createBalancedTx,
  type ProofProvider,
  type PublicDataProvider,
  type UnbalancedTransaction,
} from '@midnight-ntwrk/midnight-js-types';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { type CoinInfo, Transaction, type TransactionId } from '@midnight-ntwrk/ledger';
import { Transaction as ZswapTransaction } from '@midnight-ntwrk/zswap';
import { getLedgerNetworkId, getZswapNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { useRuntimeConfiguration } from '../config/RuntimeConfiguration';
import type { DAppConnectorWalletAPI, ServiceUriConfig } from '@midnight-ntwrk/dapp-connector-api';
import { useLocalState } from '../hooks/useLocalState';
import type { ZKConfigProvider, WalletProvider, MidnightProvider } from '@midnight-ntwrk/midnight-js-types';
import { MidnightWalletErrorType, WalletWidget } from './WalletWidget';
import { connectToWallet } from '@repo/counter-api/browser';
import { noopProofClient, proofClient } from '@repo/counter-api/browser-api';
import { WrappedPublicDataProvider } from '@repo/counter-api/browser';
import { WrappedPrivateStateProvider } from '@repo/counter-api/browser';
import { CachedFetchZkConfigProvider } from '@repo/counter-api/browser-api';

// Replace isChromeBrowser and window/fetch usages with safe checks for build/SSR
function isChromeBrowser(): boolean {
  if (typeof navigator !== 'undefined') {
    const userAgent = navigator.userAgent.toLowerCase();
    return userAgent.includes('chrome') && !userAgent.includes('edge') && !userAgent.includes('opr');
  }
  return false;
}

interface MidnightWalletState {
  isConnected: boolean;
  proofServerIsOnline: boolean;
  address?: Address;
  widget?: React.ReactNode;
  walletAPI?: WalletAPI;
  privateStateProvider: any;
  zkConfigProvider: ZKConfigProvider<ImpureCounterCircuits>;
  proofProvider: ProofProvider<ImpureCounterCircuits>;
  publicDataProvider: PublicDataProvider;
  walletProvider: WalletProvider;
  midnightProvider: MidnightProvider;
  providers: any;
  shake: () => void;
  callback: (action: ProviderCallbackAction) => void;
}

export interface WalletAPI {
  wallet: DAppConnectorWalletAPI;
  coinPublicKey: CoinPublicKey;
  encryptionPublicKey: string;
  uris: ServiceUriConfig;
}

export const getErrorType = (error: Error): MidnightWalletErrorType => {
  if (error.message.includes('Could not find Midnight Lace wallet')) {
    return MidnightWalletErrorType.WALLET_NOT_FOUND;
  }
  if (error.message.includes('Incompatible version of Midnight Lace wallet')) {
    return MidnightWalletErrorType.INCOMPATIBLE_API_VERSION;
  }
  if (error.message.includes('Wallet connector API has failed to respond')) {
    return MidnightWalletErrorType.TIMEOUT_API_RESPONSE;
  }
  if (error.message.includes('Could not find wallet connector API')) {
    return MidnightWalletErrorType.TIMEOUT_FINDING_API;
  }
  if (error.message.includes('Unable to enable connector API')) {
    return MidnightWalletErrorType.ENABLE_API_FAILED;
  }
  if (error.message.includes('Application is not authorized')) {
    return MidnightWalletErrorType.UNAUTHORIZED;
  }
  return MidnightWalletErrorType.UNKNOWN_ERROR;
};
const MidnightWalletContext = createContext<MidnightWalletState | null>(null);

export const useMidnightWallet = (): MidnightWalletState => {
  const walletState = useContext(MidnightWalletContext);
  if (!walletState) {
    throw new Error('MidnightWallet not loaded');
  }
  return walletState;
};

interface MidnightWalletProviderProps {
  children: React.ReactNode;
  logger: Logger;
}

export type ProviderCallbackAction =
  | 'downloadProverStarted'
  | 'downloadProverDone'
  | 'proveTxStarted'
  | 'proveTxDone'
  | 'balanceTxStarted'
  | 'balanceTxDone'
  | 'submitTxStarted'
  | 'submitTxDone'
  | 'watchForTxDataStarted'
  | 'watchForTxDataDone';

export const MidnightWalletProvider: React.FC<MidnightWalletProviderProps> = ({ logger, children }) => {
  const [isConnecting, setIsConnecting] = React.useState<boolean>(false);
  const [walletError, setWalletError] = React.useState<MidnightWalletErrorType | undefined>(undefined);
  const [address, setAddress] = React.useState<Address | undefined>(undefined);
  const [proofServerIsOnline, setProofServerIsOnline] = React.useState<boolean>(false);
  const config = useRuntimeConfiguration();
  const [isRotate, setRotate] = React.useState(false);
  const localState = useLocalState() as ReturnType<typeof useLocalState>;
  const [walletAPI, setWalletAPI] = useState<WalletAPI | undefined>(undefined);
  const [floatingOpen] = React.useState(true);

  const privateStateProvider = useMemo(
    () =>
      new WrappedPrivateStateProvider(
        levelPrivateStateProvider({
          privateStateStoreName: contractConfig.privateStateStoreName,
        }),
        logger,
      ),
    [logger],
  );

  const providerCallback: (action: ProviderCallbackAction) => void = (_action: ProviderCallbackAction): void => {
    // no-op
  };

  const zkConfigProvider = useMemo(
    () =>
      new CachedFetchZkConfigProvider<ImpureCounterCircuits>(
        window.location.origin,
        fetch.bind(window),
        providerCallback,
      ),
    [],
  );
  const publicDataProvider = useMemo(
    () =>
      new WrappedPublicDataProvider(
        indexerPublicDataProvider(config.INDEXER_URI, config.INDEXER_WS_URI),
        providerCallback,
        logger,
      ),
    [],
  );

  function shake(): void {
    setRotate(true);
    setTimeout(() => {
      setRotate(false);
    }, 3000);
  }

  const proofProvider = useMemo(() => {
    if (walletAPI) {
      return proofClient(walletAPI.uris.proverServerUri);
    } else {
      return noopProofClient();
    }
  }, [walletAPI]);

  const walletProvider: WalletProvider = useMemo(() => {
    if (walletAPI) {
      return {
        coinPublicKey: walletAPI.coinPublicKey,
        encryptionPublicKey: walletAPI.encryptionPublicKey,
        balanceTx(tx: UnbalancedTransaction, newCoins: CoinInfo[]): Promise<BalancedTransaction> {
          providerCallback('balanceTxStarted');
          return walletAPI.wallet
            .balanceAndProveTransaction(
              ZswapTransaction.deserialize(tx.serialize(getLedgerNetworkId()), getZswapNetworkId()),
              newCoins,
            )
            .then((zswapTx) => Transaction.deserialize(zswapTx.serialize(getZswapNetworkId()), getLedgerNetworkId()))
            .then(createBalancedTx)
            .finally(() => {
              providerCallback('balanceTxDone');
            });
        },
      };
    } else {
      return {
        coinPublicKey: '',
        encryptionPublicKey: '',
        balanceTx(_tx: UnbalancedTransaction, _newCoins: CoinInfo[]): Promise<BalancedTransaction> {
          return Promise.reject(new Error('readonly'));
        },
      };
    }
  }, [walletAPI]);

  const midnightProvider: MidnightProvider = useMemo(() => {
    if (walletAPI) {
      return {
        submitTx(tx: BalancedTransaction): Promise<TransactionId> {
          providerCallback('submitTxStarted');
          return walletAPI.wallet.submitTransaction(tx).finally(() => {
            providerCallback('submitTxDone');
          });
        },
      };
    } else {
      return {
        submitTx(_tx: BalancedTransaction): Promise<TransactionId> {
          return Promise.reject(new Error('readonly'));
        },
      };
    }
  }, [walletAPI]);

  const [walletState, setWalletState] = React.useState<MidnightWalletState>({
    isConnected: false,
    proofServerIsOnline: false,
    address: undefined,
    widget: undefined,
    walletAPI,
    privateStateProvider,
    zkConfigProvider,
    proofProvider,
    publicDataProvider,
    walletProvider,
    midnightProvider,
    shake,
    providers: {
      privateStateProvider,
      publicDataProvider,
      zkConfigProvider,
      proofProvider,
      walletProvider,
      midnightProvider,
    },
    callback: providerCallback,
  });

  async function checkProofServerStatus(proverServerUri: string): Promise<void> {
    if (typeof fetch === 'undefined') {
      setProofServerIsOnline(false);
      return;
    }
    try {
      const response = await fetch(proverServerUri);
      if (!response.ok) {
        setProofServerIsOnline(false);
      }
      const text = await response.text();
      setProofServerIsOnline(text.includes("We're alive 🎉!"));
    } catch (error) {
      setProofServerIsOnline(false);
    }
  }

  async function connect(_manual: boolean): Promise<void> {
    localState.setLaceAutoConnect(true);
    setIsConnecting(true);
    let walletResult;
    try {
      walletResult = await connectToWallet(logger);
    } catch (e) {
      const walletError = getErrorType(e as Error);
      setWalletError(walletError);
      setIsConnecting(false);
    }
    if (!walletResult) {
      setIsConnecting(false);
      // Removed setOpenWallet since dialog is disabled
      return;
    }
    await checkProofServerStatus(walletResult.uris.proverServerUri);
    try {
      const reqState = await walletResult.wallet.state();
      setAddress(reqState.address);
      console.log('Connected wallet address:', reqState.address);
      console.log('Wallet encryption public key:', (reqState as any).encryptionPublicKey);
      setWalletAPI({
        wallet: walletResult.wallet,
        coinPublicKey: reqState.coinPublicKey,
        encryptionPublicKey: (reqState as any).encryptionPublicKey || '',
        uris: walletResult.uris,
      });
    } catch (e) {
      setWalletError(MidnightWalletErrorType.TIMEOUT_API_RESPONSE);
    }
    setIsConnecting(false);
  }

  useEffect(() => {
    setWalletState((state) => ({
      ...state,
      walletAPI,
      privateStateProvider,
      zkConfigProvider,
      proofProvider,
      publicDataProvider,
      walletProvider,
      midnightProvider,
      providers: {
        privateStateProvider,
        publicDataProvider,
        zkConfigProvider,
        proofProvider,
        walletProvider,
        midnightProvider,
      },
    }));
  }, [
    walletAPI,
    privateStateProvider,
    zkConfigProvider,
    proofProvider,
    publicDataProvider,
    walletProvider,
    midnightProvider,
  ]);

  useEffect(() => {
    setWalletState((state) => ({
      ...state,
      isConnected: !!address,
      proofServerIsOnline,
      address,
      widget: WalletWidget(
        () => connect(true), // manual connect
        isRotate,
        false, // openWallet - always false since dialog is disabled
        isChromeBrowser(),
        proofServerIsOnline,
        isConnecting,
        logger,
        floatingOpen,
        address,
        walletError,
      ),
      shake,
    }));
  }, [isConnecting, walletError, address, isRotate, proofServerIsOnline]);

  useEffect(() => {
    if (!walletState.isConnected && !isConnecting && !walletError && localState.isLaceAutoConnect()) {
      void connect(false); // auto connect
    }
  }, [walletState.isConnected, isConnecting]);

  return <MidnightWalletContext.Provider value={walletState}>{children}</MidnightWalletContext.Provider>;
};
