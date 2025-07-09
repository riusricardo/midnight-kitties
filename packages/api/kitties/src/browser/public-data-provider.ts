/**
 * @file public-data-provider.ts
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
 */

import type {
  BlockHashConfig,
  BlockHeightConfig,
  ContractStateObservableConfig,
  FinalizedTxData,
  PublicDataProvider,
} from '@midnight-ntwrk/midnight-js-types';
import type { Logger } from 'pino';
import type { ContractAddress, ContractState } from '@midnight-ntwrk/compact-runtime';
import { retryWithBackoff } from './retry-with-backoff';
import type { TransactionId, ZswapChainState } from '@midnight-ntwrk/ledger';
import type { Observable } from 'rxjs';

export class WrappedPublicDataProvider implements PublicDataProvider {
  constructor(
    private readonly wrapped: PublicDataProvider,
    private readonly callback: (action: 'watchForTxDataStarted' | 'watchForTxDataDone') => void,
    private readonly logger: Logger,
  ) {}

  queryContractState(
    contractAddress: ContractAddress,
    config?: BlockHeightConfig | BlockHashConfig,
  ): Promise<ContractState | null> {
    return retryWithBackoff(
      () => this.wrapped.queryContractState(contractAddress, config),
      'queryContractState',
      this.logger,
    );
  }

  queryZSwapAndContractState(
    contractAddress: ContractAddress,
    config?: BlockHeightConfig | BlockHashConfig,
  ): Promise<[ZswapChainState, ContractState] | null> {
    return retryWithBackoff(
      () => this.wrapped.queryZSwapAndContractState(contractAddress, config),
      'queryZSwapAndContractState',
      this.logger,
    );
  }

  queryDeployContractState(contractAddress: ContractAddress): Promise<ContractState | null> {
    return retryWithBackoff(
      () => this.wrapped.queryDeployContractState(contractAddress),
      'queryDeployContractState',
      this.logger,
    );
  }

  watchForContractState(contractAddress: ContractAddress): Promise<ContractState> {
    return retryWithBackoff(
      () => this.wrapped.watchForContractState(contractAddress),
      'watchForContractState',
      this.logger,
    );
  }

  watchForDeployTxData(contractAddress: ContractAddress): Promise<FinalizedTxData> {
    return retryWithBackoff(
      () => this.wrapped.watchForDeployTxData(contractAddress),
      'watchForDeployTxData',
      this.logger,
    );
  }

  watchForTxData(txId: TransactionId): Promise<FinalizedTxData> {
    // calling a callback is a workaround to show in the UI when the watchForTxData is called
    this.callback('watchForTxDataStarted');
    return retryWithBackoff(
      () => this.wrapped.watchForTxData(txId),
      'watchForTxDataStarted',
      this.logger,
      1000, // we keep retrying long enough
    ).finally(() => {
      this.callback('watchForTxDataDone');
    });
  }

  contractStateObservable(address: ContractAddress, config: ContractStateObservableConfig): Observable<ContractState> {
    return this.wrapped.contractStateObservable(address, config);
  }
}
