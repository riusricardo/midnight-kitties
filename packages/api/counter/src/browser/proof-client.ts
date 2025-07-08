// Proof provider utilities for browser environment
import type { ProofProvider, UnbalancedTransaction, ProveTxConfig } from '@midnight-ntwrk/midnight-js-types';
import type { UnprovenTransaction } from '@midnight-ntwrk/ledger';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';

export const proofClient = <K extends string>(url: string): ProofProvider<K> => {
  const httpClientProvider = httpClientProofProvider(url.trim());
  return {
    proveTx(tx: UnprovenTransaction, proveTxConfig?: ProveTxConfig<K>): Promise<UnbalancedTransaction> {
      return httpClientProvider.proveTx(tx, proveTxConfig);
    },
  };
};

export const noopProofClient = <K extends string>(): ProofProvider<K> => {
  return {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async proveTx(tx: UnprovenTransaction): Promise<UnbalancedTransaction> {
      throw new Error('Proof client not implemented');
    },
  };
};
