// Browser-specific types that need to be shared
import type { DAppConnectorWalletAPI, ServiceUriConfig } from '@midnight-ntwrk/dapp-connector-api';
import type { CoinPublicKey } from '@midnight-ntwrk/wallet-api';

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

export interface WalletAPI {
  wallet: DAppConnectorWalletAPI;
  coinPublicKey: CoinPublicKey;
  uris: ServiceUriConfig;
}
