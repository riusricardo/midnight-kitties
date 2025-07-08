// Node.js specific functions for the counter API
// These functions require Node.js environment and are used primarily by the CLI

import { type CoinInfo, nativeToken, Transaction, type TransactionId } from '@midnight-ntwrk/ledger';
import {
  type BalancedTransaction,
  createBalancedTx,
  type UnbalancedTransaction,
  type WalletProvider,
} from '@midnight-ntwrk/midnight-js-types';
import { Transaction as ZswapTransaction } from '@midnight-ntwrk/zswap';
import { getLedgerNetworkId, getZswapNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import { webcrypto } from 'node:crypto';
import * as Rx from 'rxjs';
import * as env from '../common/env.js';
import { WalletBuilder, type Resource } from '@midnight-ntwrk/wallet';
import type { Wallet } from '@midnight-ntwrk/wallet-api';
import { type Config, contractConfig, StandaloneConfig } from '../common/config.js';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { type CounterPrivateStateId, type CounterProviders, type DeployedCounterContract } from '../common/types.js';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { randomBytes } from '../common/utils.js';

export const configureProviders = async (
  wallet: any, // Wallet & Resource,
  config: Config,
  zkConfigProvider: any, // Should be ZKConfigProvider<'increment'>, but kept as any for flexibility
): Promise<CounterProviders> => {
  const walletAndMidnightProvider = await createWalletAndMidnightProvider(wallet);
  return {
    privateStateProvider: levelPrivateStateProvider<typeof CounterPrivateStateId>({
      privateStateStoreName: contractConfig.privateStateStoreName,
    }) as any, // Type assertion to bypass strict typing
    publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
    zkConfigProvider: zkConfigProvider as any, // injected
    proofProvider: httpClientProofProvider(config.proofServer) as any,
    walletProvider: walletAndMidnightProvider as any,
    midnightProvider: walletAndMidnightProvider as any,
  } as CounterProviders;
};

export const createWalletAndMidnightProvider = async (wallet: Wallet): Promise<WalletProvider & any> => {
  const state = await Rx.firstValueFrom(wallet.state());
  return {
    coinPublicKey: (state as any).coinPublicKey,
    encryptionPublicKey: (state as any).encryptionPublicKey,
    balanceTx(tx: UnbalancedTransaction, newCoins: CoinInfo[]): Promise<BalancedTransaction> {
      return wallet
        .balanceTransaction(
          ZswapTransaction.deserialize(tx.serialize(getLedgerNetworkId()), getZswapNetworkId()),
          newCoins,
        )
        .then((tx: any) => wallet.proveTransaction(tx))
        .then((zswapTx: any) => Transaction.deserialize(zswapTx.serialize(getZswapNetworkId()), getLedgerNetworkId()))
        .then(createBalancedTx);
    },
    submitTx(tx: BalancedTransaction): Promise<TransactionId> {
      return wallet.submitTransaction(tx);
    },
  };
};

export const waitForSync = (wallet: Wallet) =>
  Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(5_000),
      Rx.tap((state: any) => {
        const applyGap = state.syncProgress?.lag.applyGap ?? 0n;
        const sourceGap = state.syncProgress?.lag.sourceGap ?? 0n;
        console.log(
          `Waiting for funds. Backend lag: ${sourceGap}, wallet lag: ${applyGap}, transactions=${state.transactionHistory.length}`,
        );
      }),
      Rx.filter((state: any) => {
        // Let's allow progress only if wallet is synced fully
        return state.syncProgress !== undefined && state.syncProgress.synced;
      }),
    ),
  );

export const waitForSyncProgress = async (wallet: Wallet) =>
  await Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(5_000),
      Rx.tap((state: any) => {
        const applyGap = state.syncProgress?.lag.applyGap ?? 0n;
        const sourceGap = state.syncProgress?.lag.sourceGap ?? 0n;
        console.log(
          `Waiting for funds. Backend lag: ${sourceGap}, wallet lag: ${applyGap}, transactions=${state.transactionHistory.length}`,
        );
      }),
      Rx.filter((state: any) => {
        // Let's allow progress only if syncProgress is defined
        return state.syncProgress !== undefined;
      }),
    ),
  );

export const waitForFunds = (wallet: Wallet) =>
  Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(10_000),
      Rx.tap((state: any) => {
        const applyGap = state.syncProgress?.lag.applyGap ?? 0n;
        const sourceGap = state.syncProgress?.lag.sourceGap ?? 0n;
        console.log(
          `Waiting for funds. Backend lag: ${sourceGap}, wallet lag: ${applyGap}, transactions=${state.transactionHistory.length}`,
        );
      }),
      Rx.filter((state: any) => {
        // Let's allow progress only if wallet is synced
        return state.syncProgress?.synced === true;
      }),
      Rx.map((s: any) => (s as any).balances[nativeToken()] ?? 0n),
      Rx.filter((balance: any) => balance > 0n),
    ),
  );

export const buildWalletAndWaitForFunds = async (
  { indexer, indexerWS, node, proofServer }: Config,
  seed: string,
  filename: string,
): Promise<Wallet & Resource> => {
  const directoryPath = process.env.SYNC_CACHE;
  let wallet: Wallet & Resource;
  if (directoryPath !== undefined) {
    if (env.existsSync(`${directoryPath}/${filename}`)) {
      console.log(`Attempting to restore state from ${directoryPath}/${filename}`);
      try {
        const serializedStream = env.createReadStream(`${directoryPath}/${filename}`);
        const serialized = await streamToString(serializedStream);
        serializedStream.on('finish', () => {
          serializedStream.close();
        });
        wallet = await WalletBuilder.restore(indexer, indexerWS, proofServer, node, seed, serialized, 'info');
        wallet.start();
        const stateObject = JSON.parse(serialized);
        if ((await isAnotherChain(wallet, Number(stateObject.offset))) === true) {
          console.log('The chain was reset, building wallet from scratch');
          wallet = await WalletBuilder.build(indexer, indexerWS, proofServer, node, seed, getZswapNetworkId(), 'info');
          wallet.start();
        } else {
          const newState = await waitForSync(wallet);
          // allow for situations when there's no new index in the network between runs
          const typedState = newState as any;
          if (typedState.syncProgress?.synced) {
            console.log('Wallet was able to sync from restored state');
          } else {
            console.log(`Offset: ${stateObject.offset}`);
            console.log(`SyncProgress.lag.applyGap: ${typedState.syncProgress?.lag.applyGap}`);
            console.log(`SyncProgress.lag.sourceGap: ${typedState.syncProgress?.lag.sourceGap}`);
            console.log('Wallet was not able to sync from restored state, building wallet from scratch');
            wallet = await WalletBuilder.build(
              indexer,
              indexerWS,
              proofServer,
              node,
              seed,
              getZswapNetworkId(),
              'info',
            );
            wallet.start();
          }
        }
      } catch (error: unknown) {
        if (typeof error === 'string') {
          console.log(error);
        } else if (error instanceof Error) {
          console.log(error.message);
        } else {
          console.log(error);
        }
        console.log('Wallet was not able to restore using the stored state, building wallet from scratch');
        wallet = await WalletBuilder.build(indexer, indexerWS, proofServer, node, seed, getZswapNetworkId(), 'info');
        wallet.start();
      }
    } else {
      console.log('Wallet save file not found, building wallet from scratch');
      wallet = await WalletBuilder.build(indexer, indexerWS, proofServer, node, seed, getZswapNetworkId(), 'info');
      wallet.start();
    }
  } else {
    console.log('File path for save file not found, building wallet from scratch');
    wallet = await WalletBuilder.build(indexer, indexerWS, proofServer, node, seed, getZswapNetworkId(), 'info');
    wallet.start();
  }

  const state = await Rx.firstValueFrom(wallet.state());
  console.log(`Your wallet seed is: ${seed}`);
  console.log(`Your wallet address is: ${(state as any).address}`);
  let balance = (state as any).balances[nativeToken()];
  if (balance === undefined || balance === 0n) {
    console.log(`Your wallet balance is: 0`);
    console.log(`Waiting to receive tokens...`);
    balance = await waitForFunds(wallet);
  }
  console.log(`Your wallet balance is: ${balance}`);
  return wallet;
};

export const buildFreshWallet = async (config: Config): Promise<Wallet & Resource> =>
  await buildWalletAndWaitForFunds(config, toHex(randomBytes(32)), '');

export const saveState = async (wallet: Wallet, filename: string) => {
  const directoryPath = process.env.SYNC_CACHE;
  if (directoryPath !== undefined) {
    console.log(`Saving state in ${directoryPath}/${filename}`);
    try {
      await env.mkdir(directoryPath, { recursive: true });
      const serializedState = await wallet.serializeState();
      const writer = env.createWriteStream(`${directoryPath}/${filename}`);
      writer.write(serializedState);
      writer.on('finish', function () {
        console.log(`File '${directoryPath}/${filename}' written successfully.`);
      });
      writer.on('error', function (err) {
        console.log(err);
      });
      writer.end();
    } catch (e) {
      if (typeof e === 'string') {
        console.log(e);
      } else if (e instanceof Error) {
        console.log(e.message);
      }
    }
  } else {
    console.log('Not saving cache as sync cache was not defined');
  }
};

export const streamToString = async (stream: env.ReadStream): Promise<string> => {
  const chunks: Buffer[] = [];
  return await new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : chunk));
    stream.on('error', (err) => {
      reject(err);
    });
    stream.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
  });
};

export const isAnotherChain = async (wallet: Wallet, offset: number) => {
  await waitForSyncProgress(wallet);
  // Here wallet does not expose the offset block it is synced to, that is why this workaround
  const walletOffset = Number(JSON.parse(await wallet.serializeState()).offset);
  if (walletOffset < offset - 1) {
    console.log(`Your offset offset is: ${walletOffset} restored offset: ${offset} so it is another chain`);
    return true;
  } else {
    console.log(`Your offset offset is: ${walletOffset} restored offset: ${offset} ok`);
    return false;
  }
};

export { type CounterProviders, type DeployedCounterContract, type Config, StandaloneConfig };
