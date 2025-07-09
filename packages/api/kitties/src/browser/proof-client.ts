/**
 * @file proof-client.ts
 * @license GPL-3.0
 *
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
