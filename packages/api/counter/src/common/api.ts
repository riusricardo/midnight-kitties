// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import {
  Counter,
  type CounterPrivateState,
  createCounterPrivateState,
  witnesses,
} from '../../../../contracts/counter/dist/index.js';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { type FinalizedTxData } from '@midnight-ntwrk/midnight-js-types';

import { assertIsContractAddress, toHex } from '@midnight-ntwrk/midnight-js-utils';
import type { PrivateStateProvider } from '@midnight-ntwrk/midnight-js-types';
import { map, type Observable, retry } from 'rxjs';
import { type CounterContract, type CounterProviders, type DeployedCounterContract } from './types.js';

// Single shared contract instance to ensure consistency
const counterContractInstance: CounterContract = new Counter.Contract(witnesses);

// Unified API interfaces
export interface DeployedCounterAPI {
  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<CounterState>;
  readonly increment: () => Promise<void>;
  readonly getCounterValue: () => Promise<bigint>;
}

export interface CounterState {
  readonly counterValue: bigint;
}

// Transaction response type for CLI operations
export interface TransactionResponse {
  readonly txId?: string;
  readonly txHash?: string;
  readonly blockHeight?: bigint | number;
}

// Main CounterAPI class
export class CounterAPI implements DeployedCounterAPI {
  private constructor(
    public readonly deployedContract: DeployedCounterContract,
    public readonly providers: CounterProviders,
  ) {
    this.deployedContractAddress = deployedContract.deployTxData.public.contractAddress;
    this.state$ = this.providers.publicDataProvider
      .contractStateObservable(this.deployedContractAddress, { type: 'all' })
      .pipe(
        map((contractState) => Counter.ledger(contractState.data)),
        map((ledgerState) => ({
          counterValue: ledgerState.round,
        })),
        retry({
          delay: 500, // retry websocket connection if it fails
        }),
      );
  }

  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<CounterState>;

  async increment(): Promise<void> {
    console.log('Incrementing counter...');
    const finalizedTxData = await CounterAPI.incrementWithTxInfo(this);
    console.log(`Transaction ${finalizedTxData.txId} added in block ${finalizedTxData.blockHeight}`);
  }

  async getCounterValue(): Promise<bigint> {
    console.log('Getting counter value...');
    const { counterValue } = await CounterAPI.getCounterInfo(this);
    if (counterValue === null) {
      return BigInt(0);
    }
    return counterValue;
  }

  // ========================================
  // UNIFIED STATIC METHODS (UI + CLI)
  // ========================================

  /**
   * Deploy a new counter contract
   * @param providers - The providers configuration
   * @param privateState - Initial private state for the contract
   * @returns CounterAPI instance
   */
  static async deploy(providers: CounterProviders, privateState: CounterPrivateState): Promise<CounterAPI> {
    console.log('Deploying counter contract...');

    try {
      // Validate providers
      CounterAPI.validateProviders(providers);

      console.log('Calling deployContract with shared contract instance...');
      const deployedContract = await deployContract(providers as any, {
        contract: counterContractInstance,
        privateStateId: 'counterPrivateState',
        initialPrivateState: await CounterAPI.getPrivateState('counterPrivateState', providers.privateStateProvider),
      });

      console.log(`Deployed contract at address: ${deployedContract.deployTxData.public.contractAddress}`);

      const typedContract = deployedContract as unknown as DeployedCounterContract;

      // Always return CounterAPI instance
      return new CounterAPI(typedContract, providers);
    } catch (error) {
      console.error('Contract deployment failed:', error);

      if (error instanceof Error && error.message.includes('verifier key')) {
        throw new Error(
          `Contract deployment failed due to verifier key compatibility issue. This may be due to version mismatch between the contract and runtime environment. Please ensure your client and network are using compatible versions. Original error: ${error.message}`,
        );
      }

      if (error instanceof Error && error.message.includes('Unsupported version')) {
        throw new Error(
          `Contract deployment failed due to version incompatibility. The contract runtime version does not match the client version. Please check that you're using compatible versions of the Midnight SDK. Original error: ${error.message}`,
        );
      }

      throw error;
    }
  }

  /**
   * Connect to an existing counter contract
   * @param providers - The providers configuration
   * @param contractAddress - Address of the existing contract
   * @returns CounterAPI instance
   */
  static async connect(providers: CounterProviders, contractAddress: ContractAddress | string): Promise<CounterAPI> {
    console.log(`Connecting to counter contract at ${contractAddress}...`);
    const state = await this.getOrCreateInitialPrivateState(providers.privateStateProvider);
    try {
      const deployedContract = await findDeployedContract(providers as any, {
        contractAddress,
        contract: counterContractInstance,
        privateStateId: 'counterPrivateState',
        initialPrivateState: state,
      });

      console.log('Successfully connected to contract');
      const typedContract = deployedContract as unknown as DeployedCounterContract;

      // Always return CounterAPI instance
      return new CounterAPI(typedContract, providers);
    } catch (error) {
      console.error('Error connecting to contract:', error);

      if (error instanceof Error && error.message.includes('verifier key')) {
        throw new Error(`Unable to connect to contract at ${contractAddress}. Original error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Increment the counter and return transaction information (for CLI use)
   * @param counterApi - The CounterAPI instance
   * @returns Transaction response with details
   */
  static async incrementWithTxInfo(counterApi: CounterAPI): Promise<TransactionResponse> {
    console.log('Incrementing...');
    const finalizedTxData = await counterApi.deployedContract.callTx.increment();

    // Extract transaction information defensively
    let txInfo: TransactionResponse = {};

    if (finalizedTxData && typeof finalizedTxData === 'object') {
      if ('public' in finalizedTxData && finalizedTxData.public) {
        const pub = finalizedTxData.public;
        txInfo = {
          txId: pub.txId,
          txHash: pub.txHash,
          blockHeight: pub.blockHeight,
        };
        console.log(
          `Transaction ${txInfo.txId ?? txInfo.txHash ?? 'unknown'} added in block ${txInfo.blockHeight ?? 'unknown'}`,
        );
      } else {
        // Handle direct transaction data
        const data = finalizedTxData as any;
        txInfo = {
          txId: data.txId,
          txHash: data.txHash,
          blockHeight: data.blockHeight,
        };
        console.log(
          `Transaction ${txInfo.txId ?? txInfo.txHash ?? 'unknown'} added in block ${txInfo.blockHeight ?? 'unknown'}`,
        );
      }
    } else {
      console.log('Transaction finalized:', finalizedTxData);
    }

    return txInfo;
  }

  /**
   * Get current counter value and contract information
   * @param counterApi - The CounterAPI instance
   * @returns Object with counter value and contract address
   */
  static async getCounterInfo(
    counterApi: CounterAPI,
  ): Promise<{ counterValue: bigint | null; contractAddress: ContractAddress }> {
    const contractAddress = counterApi.deployedContractAddress;
    try {
      const counterValue = await CounterAPI.getCounterState(counterApi.providers, contractAddress);
      if (counterValue === null) {
        console.log(`There is no counter contract deployed at ${contractAddress}.`);
      } else {
        console.log(`Current counter value: ${Number(counterValue)}`);
      }
      return { contractAddress, counterValue };
    } catch (error) {
      console.error('Error reading counter value directly:', error);
      throw new Error(
        `Unable to read counter value from contract at ${contractAddress}. The contract may not be a valid counter contract or may be incompatible.`,
      );
    }
  }

  /**
   * Get the counter state (value) from a contract address
   * @param providers - The providers configuration
   * @param contractAddress - The contract address to query
   * @returns The counter value or null if not found
   */
  static async getCounterState(providers: CounterProviders, contractAddress: ContractAddress): Promise<bigint | null> {
    assertIsContractAddress(contractAddress);
    console.log('Checking contract state...');
    const state = await providers.publicDataProvider
      .queryContractState(contractAddress)
      .then((contractState) => (contractState != null ? Counter.ledger(contractState.data).round : null));
    console.log(`Counter state: ${state}`);
    return state;
  }

  static async contractExists(providers: CounterProviders, contractAddress: ContractAddress): Promise<boolean> {
    try {
      const state = await providers.publicDataProvider.queryContractState(contractAddress);
      if (state === null) {
        return false;
      }
      void Counter.ledger(state.data); // try to parse it
      return true;
    } catch (e) {
      return false;
    }
  }

  static async getOrCreateInitialPrivateState(
    privateStateProvider: PrivateStateProvider<'counterPrivateState', CounterPrivateState>,
  ): Promise<CounterPrivateState> {
    let state = await privateStateProvider.get('counterPrivateState');
    if (state === null) {
      state = createCounterPrivateState();
      await privateStateProvider.set('counterPrivateState', state);
    }
    return state;
  }

  private static async getPrivateState(
    privateStateKey: 'counterPrivateState',
    providers: PrivateStateProvider<'counterPrivateState', CounterPrivateState>,
  ): Promise<CounterPrivateState> {
    const existingPrivateState = await providers.get(privateStateKey);
    const initialState = await this.getOrCreateInitialPrivateState(providers);
    return existingPrivateState ?? initialState;
  }

  // ========================================
  // CLI UTILITY METHODS
  // ========================================

  /**
   * Get the underlying deployed contract from a CounterAPI instance (for CLI compatibility)
   * @param counterApi - The CounterAPI instance
   * @returns The deployed contract instance
   */
  static getDeployedContract(counterApi: CounterAPI): DeployedCounterContract {
    return counterApi.deployedContract;
  }

  /**
   * Get the contract address from a CounterAPI instance
   * @param counterApi - The CounterAPI instance
   * @returns The contract address as string
   */
  static getContractAddress(counterApi: CounterAPI): string {
    return counterApi.deployedContractAddress;
  }

  // ========================================
  // CREDENTIAL MANAGEMENT METHODS
  // ========================================

  /**
   * Update the private state with credential subject information
   * @param credentialSubject - The credential subject data to store
   */
  async updateCredentialSubject(credentialSubject: any): Promise<void> {
    try {
      // Validate credential subject format before storing
      if (!credentialSubject) {
        throw new Error('Credential subject cannot be null or undefined');
      }

      if (
        !credentialSubject.id ||
        !(credentialSubject.id instanceof Uint8Array) ||
        credentialSubject.id.length !== 32
      ) {
        throw new Error('Credential subject ID must be a Uint8Array of length 32');
      }

      if (
        !credentialSubject.first_name ||
        !(credentialSubject.first_name instanceof Uint8Array) ||
        credentialSubject.first_name.length !== 32
      ) {
        throw new Error('Credential subject first_name must be a Uint8Array of length 32');
      }

      if (
        !credentialSubject.last_name ||
        !(credentialSubject.last_name instanceof Uint8Array) ||
        credentialSubject.last_name.length !== 32
      ) {
        throw new Error('Credential subject last_name must be a Uint8Array of length 32');
      }

      if (typeof credentialSubject.birth_timestamp !== 'bigint') {
        throw new Error('Credential subject birth_timestamp must be a bigint');
      }

      // Get current private state
      const currentState = await this.providers.privateStateProvider.get('counterPrivateState');

      // Create updated state with new credential subject
      const updatedState: CounterPrivateState = {
        ...currentState,
        value: currentState?.value ?? 0,
        CredentialSubject: credentialSubject,
      };

      // Save updated state
      await this.providers.privateStateProvider.set('counterPrivateState', updatedState);
      console.log('Updated private state with credential subject successfully');
    } catch (error) {
      console.error('Error updating credential subject:', error);
      throw new Error(
        `Failed to update credential information: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get the current credential subject from private state
   * @returns The credential subject or null if not set
   */
  async getCredentialSubject(): Promise<any | null> {
    try {
      const privateState = await this.providers.privateStateProvider.get('counterPrivateState');
      const credentialSubject = privateState?.CredentialSubject;

      // Return null if no credential subject or if it's the default empty one
      if (!credentialSubject) return null;

      // Check if this is a default/empty credential subject (all zeros)
      const isDefaultCredential =
        credentialSubject.birth_timestamp === 0n ||
        (credentialSubject.id && credentialSubject.id.every((byte: number) => byte === 0));

      return isDefaultCredential ? null : credentialSubject;
    } catch (error) {
      console.error('Error getting credential subject:', error);
      return null;
    }
  }

  /**
   * Check if the user is verified (has valid credential subject)
   * @returns True if the user has a valid credential subject
   */
  async isUserVerified(): Promise<boolean> {
    const credentialSubject = await this.getCredentialSubject();
    if (!credentialSubject) return false;

    // Check if this is a default/empty credential subject (all zeros)
    const isDefaultCredential =
      credentialSubject.birth_timestamp === 0n ||
      (credentialSubject.id && credentialSubject.id.every((byte: number) => byte === 0));

    if (isDefaultCredential) return false;

    // Check if the user is at least 21 years old (to match smart contract behavior)
    const currentTime = BigInt(Date.now());
    const twentyOneYearsInMs = BigInt(21 * 365 * 24 * 60 * 60 * 1000);

    return currentTime - credentialSubject.birth_timestamp >= twentyOneYearsInMs;
  }

  /**
   * Static method to update credential subject for any CounterAPI instance
   */
  static async updateCredentialSubject(counterApi: CounterAPI, credentialSubject: any): Promise<void> {
    return counterApi.updateCredentialSubject(credentialSubject);
  }

  /**
   * Static method to check if user is verified for any CounterAPI instance
   */
  static async isUserVerified(counterApi: CounterAPI): Promise<boolean> {
    return counterApi.isUserVerified();
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Validate that all required providers are present
   */
  private static validateProviders(providers: CounterProviders): void {
    if (!providers) {
      throw new Error('CounterProviders is required for deployment');
    }

    if (!providers.publicDataProvider) {
      throw new Error('PublicDataProvider is required for deployment');
    }

    if (!providers.privateStateProvider) {
      throw new Error('PrivateStateProvider is required for deployment');
    }

    if (!providers.walletProvider) {
      throw new Error('WalletProvider is required for deployment');
    }

    if (!providers.zkConfigProvider) {
      throw new Error('ZKConfigProvider is required for deployment');
    }

    if (!providers.proofProvider) {
      throw new Error('ProofProvider is required for deployment');
    }

    if (!providers.midnightProvider) {
      throw new Error('MidnightProvider is required for deployment');
    }
  }
}

// Exports for compatibility
export { Counter, witnesses } from '../../../../contracts/counter/dist/index.js';
export type { CounterContract, CounterProviders, DeployedCounterContract } from './types.js';
export { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';

// Re-export currentDir from config for compatibility
export { currentDir } from './config.js';

export function setLogger(_logger: any) {
  // Logger functionality replaced with console.log
}

// Note: Node.js specific functions (buildWalletAndWaitForFunds, buildFreshWallet, etc.)
// are available in './node-api' for CLI compatibility, but are not exported here
// to maintain browser compatibility
