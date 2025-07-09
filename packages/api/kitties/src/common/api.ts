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

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import {
  Kitties,
  type KittiesPrivateState,
  createKittiesPrivateState,
  witnesses,
} from '../../../../contracts/kitties/dist/index.js';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { type FinalizedTxData } from '@midnight-ntwrk/midnight-js-types';

import { assertIsContractAddress, toHex } from '@midnight-ntwrk/midnight-js-utils';
import type { PrivateStateProvider } from '@midnight-ntwrk/midnight-js-types';
import { map, type Observable, retry } from 'rxjs';
import { type KittiesContract, type KittiesProviders, type DeployedKittiesContract } from './types.js';

// Single shared contract instance to ensure consistency
const kittiesContractInstance: KittiesContract = new Kitties.Contract(witnesses);

// Unified API interfaces
export interface DeployedKittiesAPI {
  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<KittiesState>;
  readonly increment: () => Promise<void>;
  readonly getKittiesValue: () => Promise<bigint>;
}

export interface KittiesState {
  readonly kittiesValue: bigint;
}

// Transaction response type for CLI operations
export interface TransactionResponse {
  readonly txId?: string;
  readonly txHash?: string;
  readonly blockHeight?: bigint | number;
}

// Main KittiesAPI class
export class KittiesAPI implements DeployedKittiesAPI {
  private constructor(
    public readonly deployedContract: DeployedKittiesContract,
    public readonly providers: KittiesProviders,
  ) {
    this.deployedContractAddress = deployedContract.deployTxData.public.contractAddress;
    this.state$ = this.providers.publicDataProvider
      .contractStateObservable(this.deployedContractAddress, { type: 'all' })
      .pipe(
        map((contractState) => Kitties.ledger(contractState.data)),
        map((ledgerState) => ({
          kittiesValue: ledgerState.round,
        })),
        retry({
          delay: 500, // retry websocket connection if it fails
        }),
      );
  }

  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<KittiesState>;

  async increment(): Promise<void> {
    console.log('Incrementing kitties...');
    const finalizedTxData = await KittiesAPI.incrementWithTxInfo(this);
    console.log(`Transaction ${finalizedTxData.txId} added in block ${finalizedTxData.blockHeight}`);
  }

  async getKittiesValue(): Promise<bigint> {
    console.log('Getting kitties value...');
    const { kittiesValue } = await KittiesAPI.getKittiesInfo(this);
    if (kittiesValue === null) {
      return BigInt(0);
    }
    return kittiesValue;
  }

  // ========================================
  // UNIFIED STATIC METHODS (UI + CLI)
  // ========================================

  /**
   * Deploy a new kitties contract
   * @param providers - The providers configuration
   * @param privateState - Initial private state for the contract
   * @returns KittiesAPI instance
   */
  static async deploy(providers: KittiesProviders, privateState: KittiesPrivateState): Promise<KittiesAPI> {
    console.log('Deploying kitties contract...');

    try {
      // Validate providers
      KittiesAPI.validateProviders(providers);

      console.log('Calling deployContract with shared contract instance...');
      const deployedContract = await deployContract(providers as any, {
        contract: kittiesContractInstance,
        privateStateId: 'kittiesPrivateState',
        initialPrivateState: await KittiesAPI.getPrivateState('kittiesPrivateState', providers.privateStateProvider),
      });

      console.log(`Deployed contract at address: ${deployedContract.deployTxData.public.contractAddress}`);

      const typedContract = deployedContract as unknown as DeployedKittiesContract;

      // Always return KittiesAPI instance
      return new KittiesAPI(typedContract, providers);
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
   * Connect to an existing kitties contract
   * @param providers - The providers configuration
   * @param contractAddress - Address of the existing contract
   * @returns KittiesAPI instance
   */
  static async connect(providers: KittiesProviders, contractAddress: ContractAddress | string): Promise<KittiesAPI> {
    console.log(`Connecting to kitties contract at ${contractAddress}...`);
    const state = await this.getOrCreateInitialPrivateState(providers.privateStateProvider);
    try {
      const deployedContract = await findDeployedContract(providers as any, {
        contractAddress,
        contract: kittiesContractInstance,
        privateStateId: 'kittiesPrivateState',
        initialPrivateState: state,
      });

      console.log('Successfully connected to contract');
      const typedContract = deployedContract as unknown as DeployedKittiesContract;

      // Always return KittiesAPI instance
      return new KittiesAPI(typedContract, providers);
    } catch (error) {
      console.error('Error connecting to contract:', error);

      if (error instanceof Error && error.message.includes('verifier key')) {
        throw new Error(`Unable to connect to contract at ${contractAddress}. Original error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Increment the kitties and return transaction information (for CLI use)
   * @param kittiesApi - The KittiesAPI instance
   * @returns Transaction response with details
   */
  static async incrementWithTxInfo(kittiesApi: KittiesAPI): Promise<TransactionResponse> {
    console.log('Incrementing...');
    const finalizedTxData = await kittiesApi.deployedContract.callTx.increment();

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
   * Get current kitties value and contract information
   * @param kittiesApi - The KittiesAPI instance
   * @returns Object with kitties value and contract address
   */
  static async getKittiesInfo(
    kittiesApi: KittiesAPI,
  ): Promise<{ kittiesValue: bigint | null; contractAddress: ContractAddress }> {
    const contractAddress = kittiesApi.deployedContractAddress;
    try {
      const kittiesValue = await KittiesAPI.getKittiesState(kittiesApi.providers, contractAddress);
      if (kittiesValue === null) {
        console.log(`There is no kitties contract deployed at ${contractAddress}.`);
      } else {
        console.log(`Current kitties value: ${Number(kittiesValue)}`);
      }
      return { contractAddress, kittiesValue };
    } catch (error) {
      console.error('Error reading kitties value directly:', error);
      throw new Error(
        `Unable to read kitties value from contract at ${contractAddress}. The contract may not be a valid kitties contract or may be incompatible.`,
      );
    }
  }

  /**
   * Get the kitties state (value) from a contract address
   * @param providers - The providers configuration
   * @param contractAddress - The contract address to query
   * @returns The kitties value or null if not found
   */
  static async getKittiesState(providers: KittiesProviders, contractAddress: ContractAddress): Promise<bigint | null> {
    assertIsContractAddress(contractAddress);
    console.log('Checking contract state...');
    const state = await providers.publicDataProvider
      .queryContractState(contractAddress)
      .then((contractState) => (contractState != null ? Kitties.ledger(contractState.data).round : null));
    console.log(`Kitties state: ${state}`);
    return state;
  }

  static async contractExists(providers: KittiesProviders, contractAddress: ContractAddress): Promise<boolean> {
    try {
      const state = await providers.publicDataProvider.queryContractState(contractAddress);
      if (state === null) {
        return false;
      }
      void Kitties.ledger(state.data); // try to parse it
      return true;
    } catch (e) {
      return false;
    }
  }

  static async getOrCreateInitialPrivateState(
    privateStateProvider: PrivateStateProvider<'kittiesPrivateState', KittiesPrivateState>,
  ): Promise<KittiesPrivateState> {
    let state = await privateStateProvider.get('kittiesPrivateState');
    if (state === null) {
      state = createKittiesPrivateState();
      await privateStateProvider.set('kittiesPrivateState', state);
    }
    return state;
  }

  private static async getPrivateState(
    privateStateKey: 'kittiesPrivateState',
    providers: PrivateStateProvider<'kittiesPrivateState', KittiesPrivateState>,
  ): Promise<KittiesPrivateState> {
    const existingPrivateState = await providers.get(privateStateKey);
    const initialState = await this.getOrCreateInitialPrivateState(providers);
    return existingPrivateState ?? initialState;
  }

  // ========================================
  // CLI UTILITY METHODS
  // ========================================

  /**
   * Get the underlying deployed contract from a KittiesAPI instance (for CLI compatibility)
   * @param kittiesApi - The KittiesAPI instance
   * @returns The deployed contract instance
   */
  static getDeployedContract(kittiesApi: KittiesAPI): DeployedKittiesContract {
    return kittiesApi.deployedContract;
  }

  /**
   * Get the contract address from a KittiesAPI instance
   * @param kittiesApi - The KittiesAPI instance
   * @returns The contract address as string
   */
  static getContractAddress(kittiesApi: KittiesAPI): string {
    return kittiesApi.deployedContractAddress;
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
      const currentState = await this.providers.privateStateProvider.get('kittiesPrivateState');

      // Create updated state with new credential subject
      const updatedState: KittiesPrivateState = {
        ...currentState,
        value: currentState?.value ?? 0,
        CredentialSubject: credentialSubject,
      };

      // Save updated state
      await this.providers.privateStateProvider.set('kittiesPrivateState', updatedState);
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
      const privateState = await this.providers.privateStateProvider.get('kittiesPrivateState');
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
   * Static method to update credential subject for any KittiesAPI instance
   */
  static async updateCredentialSubject(kittiesApi: KittiesAPI, credentialSubject: any): Promise<void> {
    return kittiesApi.updateCredentialSubject(credentialSubject);
  }

  /**
   * Static method to check if user is verified for any KittiesAPI instance
   */
  static async isUserVerified(kittiesApi: KittiesAPI): Promise<boolean> {
    return kittiesApi.isUserVerified();
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Validate that all required providers are present
   */
  private static validateProviders(providers: KittiesProviders): void {
    if (!providers) {
      throw new Error('KittiesProviders is required for deployment');
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
export { Kitties, witnesses } from '../../../../contracts/kitties/dist/index.js';
export type { KittiesContract, KittiesProviders, DeployedKittiesContract } from './types.js';
export { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';

// Re-export currentDir from config for compatibility
export { currentDir } from './config.js';

export function setLogger(_logger: any) {
  // Logger functionality replaced with console.log
}

// Note: Node.js specific functions (buildWalletAndWaitForFunds, buildFreshWallet, etc.)
// are available in './node-api' for CLI compatibility, but are not exported here
// to maintain browser compatibility
