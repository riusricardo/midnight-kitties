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
} from '@midnight-ntwrk/kitties-contract';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';

import { assertIsContractAddress, toHex, parseCoinPublicKeyToHex } from '@midnight-ntwrk/midnight-js-utils';
import type { PrivateStateProvider } from '@midnight-ntwrk/midnight-js-types';
import { convertWalletPublicKeyToBytes } from './utils';
import { map, type Observable, retry } from 'rxjs';
import {
  type KittiesContract,
  type KittiesProviders,
  type DeployedKittiesContract,
  type KittyData,
  type KittyListingData,
  type TransferKittyParams,
  type SetPriceParams,
  type CreateBuyOfferParams,
  type ApproveOfferParams,
  type GetOfferParams,
  type OfferData,
  type BreedKittyParams,
  type NFTApprovalParams,
  type NFTSetApprovalForAllParams,
  type NFTTransferParams,
  type NFTTransferFromParams,
  type Kitty,
} from './types.js';

// Single shared contract instance to ensure consistency
const kittiesContractInstance: KittiesContract = new Kitties.Contract(witnesses);

// Unified API interfaces
export interface DeployedKittiesAPI {
  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<KittiesState>;

  // Kitty-specific operations
  readonly createKitty: () => Promise<void>;
  readonly transferKitty: (params: TransferKittyParams) => Promise<void>;
  readonly setPrice: (params: SetPriceParams) => Promise<void>;
  readonly createBuyOffer: (params: CreateBuyOfferParams) => Promise<void>;
  readonly approveOffer: (params: ApproveOfferParams) => Promise<void>;
  readonly getOffer: (params: GetOfferParams) => Promise<OfferData>;
  readonly breedKitty: (params: BreedKittyParams) => Promise<void>;
  readonly getKitty: (kittyId: bigint) => Promise<KittyData>;
  readonly getAllKittiesCount: () => Promise<bigint>;
  readonly getKittiesForSale: () => Promise<KittyListingData[]>;
  readonly getUserKitties: (owner: { bytes: Uint8Array }) => Promise<KittyData[]>;

  // Wallet convenience methods
  readonly getWalletAddress: () => { bytes: Uint8Array };
  readonly getMyKitties: () => Promise<KittyData[]>;

  // NFT standard operations
  readonly balanceOf: (owner: { bytes: Uint8Array }) => Promise<bigint>;
  readonly ownerOf: (tokenId: bigint) => Promise<{ bytes: Uint8Array }>;
  readonly approve: (params: NFTApprovalParams) => Promise<void>;
  readonly getApproved: (tokenId: bigint) => Promise<{ bytes: Uint8Array }>;
  readonly setApprovalForAll: (params: NFTSetApprovalForAllParams) => Promise<void>;
  readonly isApprovedForAll: (owner: { bytes: Uint8Array }, operator: { bytes: Uint8Array }) => Promise<boolean>;
  readonly transfer: (params: NFTTransferParams) => Promise<void>;
  readonly transferFrom: (params: NFTTransferFromParams) => Promise<void>;
}

export interface KittiesState {
  readonly allKittiesCount: bigint;
  readonly genderSelector: boolean;
  readonly kitties: Map<bigint, Kitty>;
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
          allKittiesCount: ledgerState.allKittiesCount,
          genderSelector: ledgerState.genderSelector,
          kitties: new Map(Array.from(ledgerState.kitties)),
        })),
        retry({
          delay: 500, // retry websocket connection if it fails
        }),
      );
  }

  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<KittiesState>;

  // Helper method to get the current wallet address in the correct Hex Bytes format
  getWalletAddress(): { bytes: Uint8Array } {
    const coinPublicKey = this.providers.walletProvider.coinPublicKey;
    const bytes = convertWalletPublicKeyToBytes(coinPublicKey);
    return { bytes };
  }

  //  =====================================
  //   KITTY-SPECIFIC OPERATIONS
  //  =====================================

  // Convenience method to get kitties for the current wallet
  async getMyKitties(): Promise<KittyData[]> {
    const walletAddress = this.getWalletAddress();
    return await this.getUserKitties(walletAddress);
  }

  async createKitty(): Promise<void> {
    console.log('Creating a new kitty...');
    const finalizedTxData = await this.deployedContract.callTx.createKitty();
    console.log(`Kitty created! Transaction added in block ${finalizedTxData.public.blockHeight}`);
  }

  async transferKitty(params: TransferKittyParams): Promise<void> {
    console.log(`Transferring kitty ${params.kittyId} to ${toHex(params.to.bytes)}...`);
    const finalizedTxData = await this.deployedContract.callTx.transferKitty(params.to, params.kittyId);
    console.log(`Kitty transferred! Transaction added in block ${finalizedTxData.public.blockHeight}`);
  }

  async setPrice(params: SetPriceParams): Promise<void> {
    console.log(`Setting price for kitty ${params.kittyId} to ${params.price}...`);
    const finalizedTxData = await this.deployedContract.callTx.setPrice(params.kittyId, params.price);
    console.log(`Price set! Transaction added in block ${finalizedTxData.public.blockHeight}`);
  }

  async createBuyOffer(params: CreateBuyOfferParams): Promise<void> {
    console.log(`Creating buy offer for kitty ${params.kittyId} with bid price ${params.bidPrice}...`);
    const finalizedTxData = await this.deployedContract.callTx.createBuyOffer(params.kittyId, params.bidPrice);
    console.log(`Buy offer created! Transaction added in block ${finalizedTxData.public.blockHeight}`);
  }

  async approveOffer(params: ApproveOfferParams): Promise<void> {
    console.log(`Approving offer for kitty ${params.kittyId} from buyer...`);
    const finalizedTxData = await this.deployedContract.callTx.approveOffer(params.kittyId, params.buyer);
    console.log(`Offer approved! Transaction added in block ${finalizedTxData.public.blockHeight}`);
  }

  async getOffer(params: GetOfferParams): Promise<OfferData> {
    console.log(`Getting offer for kitty ${params.kittyId} from ${toHex(params.from.bytes)}...`);
    const response = await this.deployedContract.callTx.getOffer(params.kittyId, params.from);
    const offer = (response as any).private.result;
    return {
      kittyId: offer.kittyId,
      buyer: offer.buyer,
      price: offer.price,
    };
  }

  async breedKitty(params: BreedKittyParams): Promise<void> {
    console.log(`Breeding kitties ${params.kittyId1} and ${params.kittyId2}...`);
    const finalizedTxData = await this.deployedContract.callTx.breedKitty(params.kittyId1, params.kittyId2);
    console.log(`Kitties bred! Transaction added in block ${finalizedTxData.public.blockHeight}`);
  }

  async getKitty(kittyId: bigint): Promise<KittyData> {
    console.log(`Getting kitty ${kittyId}...`);
    // Use the contract call directly for read operations
    const response = await this.deployedContract.callTx.getKitty(kittyId);
    // Extract the result from the transaction response
    const kitty = (response as any).private.result;
    return {
      id: kittyId,
      dna: kitty.dna,
      gender: kitty.gender,
      owner: kitty.owner,
      price: kitty.price,
      forSale: kitty.forSale,
      generation: kitty.generation,
    };
  }

  async getAllKittiesCount(): Promise<bigint> {
    console.log('Getting total kitties count...');
    // Use the contract call directly for read operations
    const response = await this.deployedContract.callTx.getAllKittiesCount();
    const count = (response as any).private.result;
    console.log(`Total kitties: ${count}`);
    return count;
  }

  async getKittiesForSale(): Promise<KittyListingData[]> {
    console.log('Getting kitties for sale...');
    const contractState = await this.providers.publicDataProvider.queryContractState(this.deployedContractAddress);
    if (!contractState) {
      return [];
    }

    const ledgerState = Kitties.ledger(contractState.data);
    const forSaleKitties: KittyListingData[] = [];

    for (const [kittyId, kitty] of ledgerState.kitties) {
      if (kitty.forSale) {
        forSaleKitties.push({
          id: kittyId,
          kitty: {
            id: kittyId,
            dna: kitty.dna,
            gender: kitty.gender,
            owner: kitty.owner,
            price: kitty.price,
            forSale: kitty.forSale,
            generation: kitty.generation,
          },
        });
      }
    }

    console.log(`Found ${forSaleKitties.length} kitties for sale`);
    return forSaleKitties;
  }

  async getUserKitties(owner: { bytes: Uint8Array }): Promise<KittyData[]> {
    console.log(`Getting kitties for owner ${toHex(owner.bytes)}...`);
    const contractState = await this.providers.publicDataProvider.queryContractState(this.deployedContractAddress);
    if (!contractState) {
      return [];
    }

    const ledgerState = Kitties.ledger(contractState.data);
    const userKitties: KittyData[] = [];

    for (const [kittyId, kitty] of ledgerState.kitties) {
      if (toHex(kitty.owner.bytes) === toHex(owner.bytes)) {
        userKitties.push({
          id: kittyId,
          dna: kitty.dna,
          gender: kitty.gender,
          owner: kitty.owner,
          price: kitty.price,
          forSale: kitty.forSale,
          generation: kitty.generation,
        });
      }
    }

    console.log(`Found ${userKitties.length} kitties for user`);
    return userKitties;
  }

  //  =====================================
  //   NFT STANDARD OPERATIONS
  //  =====================================

  async balanceOf(owner: { bytes: Uint8Array }): Promise<bigint> {
    console.log(`Getting balance for owner ${toHex(owner.bytes)}...`);
    const response = await this.deployedContract.callTx.balanceOf(owner);
    const balance = (response as any).private.result;
    return balance;
  }

  async ownerOf(tokenId: bigint): Promise<{ bytes: Uint8Array }> {
    console.log(`Getting owner of token ${tokenId}...`);
    const response = await this.deployedContract.callTx.ownerOf(tokenId);
    const owner = (response as any).private.result;
    return owner;
  }

  async approve(params: NFTApprovalParams): Promise<void> {
    console.log(`Approving ${toHex(params.to.bytes)} for token ${params.tokenId}...`);
    const finalizedTxData = await this.deployedContract.callTx.approve(params.to, params.tokenId);
    console.log(`Approval granted! Transaction added in block ${finalizedTxData.public.blockHeight}`);
  }

  async getApproved(tokenId: bigint): Promise<{ bytes: Uint8Array }> {
    console.log(`Getting approved address for token ${tokenId}...`);
    const response = await this.deployedContract.callTx.getApproved(tokenId);
    const approved = (response as any).private.result;
    return approved;
  }

  async setApprovalForAll(params: NFTSetApprovalForAllParams): Promise<void> {
    console.log(
      `Setting approval for all tokens - operator: ${toHex(params.operator.bytes)}, approved: ${params.approved}...`,
    );
    const finalizedTxData = await this.deployedContract.callTx.setApprovalForAll(params.operator, params.approved);
    console.log(`Approval for all set! Transaction added in block ${finalizedTxData.public.blockHeight}`);
  }

  async isApprovedForAll(owner: { bytes: Uint8Array }, operator: { bytes: Uint8Array }): Promise<boolean> {
    console.log(`Checking if ${toHex(operator.bytes)} is approved for all tokens of ${toHex(owner.bytes)}...`);
    const response = await this.deployedContract.callTx.isApprovedForAll(owner, operator);
    const isApproved = (response as any).private.result;
    return isApproved;
  }

  async transfer(params: NFTTransferParams): Promise<void> {
    console.log(`Transferring token ${params.tokenId} to ${toHex(params.to.bytes)}...`);
    const finalizedTxData = await this.deployedContract.callTx.transfer(params.to, params.tokenId);
    console.log(`Token transferred! Transaction added in block ${finalizedTxData.public.blockHeight}`);
  }

  async transferFrom(params: NFTTransferFromParams): Promise<void> {
    console.log(
      `Transferring token ${params.tokenId} from ${toHex(params.from.bytes)} to ${toHex(params.to.bytes)}...`,
    );
    const finalizedTxData = await this.deployedContract.callTx.transferFrom(params.from, params.to, params.tokenId);
    console.log(`Token transferred! Transaction added in block ${finalizedTxData.public.blockHeight}`);
  }

  //  =====================================
  //   UTILITY METHODS
  //  =====================================

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

  //  =====================================
  //   UNIFIED STATIC METHODS (UI + CLI)
  //  =====================================

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

      console.log('Calling deployContract ...');
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
   * Create a new kitty using the KittiesAPI instance
   * @param kittiesApi - The KittiesAPI instance
   * @returns Transaction response with details
   */
  static async createKittyWithTxInfo(kittiesApi: KittiesAPI): Promise<TransactionResponse> {
    console.log('Creating new kitty...');
    const finalizedTxData = await kittiesApi.deployedContract.callTx.createKitty();

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
   * Get current kitties count and contract information
   * @param kittiesApi - The KittiesAPI instance
   * @returns Object with kitties count and contract address
   */
  static async getKittiesInfo(
    kittiesApi: KittiesAPI,
  ): Promise<{ kittiesCount: bigint | null; contractAddress: ContractAddress }> {
    const contractAddress = kittiesApi.deployedContractAddress;
    try {
      const kittiesCount = await KittiesAPI.getKittiesCount(kittiesApi.providers, contractAddress);
      if (kittiesCount === null) {
        console.log(`There is no kitties contract deployed at ${contractAddress}.`);
      } else {
        console.log(`Current kitties count: ${Number(kittiesCount)}`);
      }
      return { contractAddress, kittiesCount };
    } catch (error) {
      console.error('Error reading kitties count directly:', error);
      throw new Error(
        `Unable to read kitties count from contract at ${contractAddress}. The contract may not be a valid kitties contract or may be incompatible.`,
      );
    }
  }

  /**
   * Get the kitties count from a contract address
   * @param providers - The providers configuration
   * @param contractAddress - The contract address to query
   * @returns The kitties count or null if not found
   */
  static async getKittiesCount(providers: KittiesProviders, contractAddress: ContractAddress): Promise<bigint | null> {
    assertIsContractAddress(contractAddress);
    console.log('Checking contract state...');
    const state = await providers.publicDataProvider
      .queryContractState(contractAddress)
      .then((contractState) => (contractState != null ? Kitties.ledger(contractState.data).allKittiesCount : null));
    console.log(`Kitties count: ${state}`);
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

  //  =====================================
  //   CLI METHODS
  //  =====================================

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

  //  =======================================================
  //   STATIC METHODS FOR KITTY OPERATIONS (USED IN CLI)
  //  =======================================================

  /**
   * Create a new kitty
   * @param kittiesApi - The KittiesAPI instance
   * @returns Transaction response with details
   */
  static async createKitty(kittiesApi: KittiesAPI): Promise<TransactionResponse> {
    return await KittiesAPI.createKittyWithTxInfo(kittiesApi);
  }

  /**
   * Transfer a kitty to another address
   * @param kittiesApi - The KittiesAPI instance
   * @param params - Transfer parameters
   * @returns Transaction response with details
   */
  static async transferKitty(kittiesApi: KittiesAPI, params: TransferKittyParams): Promise<TransactionResponse> {
    console.log(`Transferring kitty ${params.kittyId} to ${toHex(params.to.bytes)}...`);
    const finalizedTxData = await kittiesApi.deployedContract.callTx.transferKitty(params.to, params.kittyId);

    return {
      txId: (finalizedTxData as any).public?.txId,
      txHash: (finalizedTxData as any).public?.txHash,
      blockHeight: (finalizedTxData as any).public?.blockHeight,
    };
  }

  /**
   * Set price for a kitty
   * @param kittiesApi - The KittiesAPI instance
   * @param params - Set price parameters
   * @returns Transaction response with details
   */
  static async setPrice(kittiesApi: KittiesAPI, params: SetPriceParams): Promise<TransactionResponse> {
    console.log(`Setting price for kitty ${params.kittyId} to ${params.price}...`);
    const finalizedTxData = await kittiesApi.deployedContract.callTx.setPrice(params.kittyId, params.price);

    return {
      txId: (finalizedTxData as any).public?.txId,
      txHash: (finalizedTxData as any).public?.txHash,
      blockHeight: (finalizedTxData as any).public?.blockHeight,
    };
  }

  /**
   * Create a buy offer for a kitty
   * @param kittiesApi - The KittiesAPI instance
   * @param params - Create buy offer parameters
   * @returns Transaction response with details
   */
  static async createBuyOffer(kittiesApi: KittiesAPI, params: CreateBuyOfferParams): Promise<TransactionResponse> {
    console.log(`Creating buy offer for kitty ${params.kittyId} with bid price ${params.bidPrice}...`);
    const finalizedTxData = await kittiesApi.deployedContract.callTx.createBuyOffer(params.kittyId, params.bidPrice);

    return {
      txId: (finalizedTxData as any).public?.txId,
      txHash: (finalizedTxData as any).public?.txHash,
      blockHeight: (finalizedTxData as any).public?.blockHeight,
    };
  }

  /**
   * Breed two kitties
   * @param kittiesApi - The KittiesAPI instance
   * @param params - Breed kitty parameters
   * @returns Transaction response with details
   */
  static async breedKitty(kittiesApi: KittiesAPI, params: BreedKittyParams): Promise<TransactionResponse> {
    console.log(`Breeding kitties ${params.kittyId1} and ${params.kittyId2}...`);
    const finalizedTxData = await kittiesApi.deployedContract.callTx.breedKitty(params.kittyId1, params.kittyId2);

    return {
      txId: (finalizedTxData as any).public?.txId,
      txHash: (finalizedTxData as any).public?.txHash,
      blockHeight: (finalizedTxData as any).public?.blockHeight,
    };
  }

  /**
   * Get kitty information
   * @param kittiesApi - The KittiesAPI instance
   * @param kittyId - The kitty ID to get
   * @returns The kitty data
   */
  static async getKitty(kittiesApi: KittiesAPI, kittyId: bigint): Promise<KittyData> {
    return await kittiesApi.getKitty(kittyId);
  }

  /**
   * Get total kitties count
   * @param kittiesApi - The KittiesAPI instance
   * @returns The total kitties count
   */
  static async getAllKittiesCount(kittiesApi: KittiesAPI): Promise<bigint> {
    return await kittiesApi.getAllKittiesCount();
  }

  /**
   * Get kitties for sale
   * @param kittiesApi - The KittiesAPI instance
   * @returns Array of kitties for sale
   */
  static async getKittiesForSale(kittiesApi: KittiesAPI): Promise<KittyListingData[]> {
    return await kittiesApi.getKittiesForSale();
  }

  /**
   * Get user's kitties
   * @param kittiesApi - The KittiesAPI instance
   * @param owner - The owner's public key
   * @returns Array of user's kitties
   */
  static async getUserKitties(kittiesApi: KittiesAPI, owner: { bytes: Uint8Array }): Promise<KittyData[]> {
    return await kittiesApi.getUserKitties(owner);
  }
}

// Exports for compatibility
export { Kitties, witnesses } from '@midnight-ntwrk/kitties-contract';
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
