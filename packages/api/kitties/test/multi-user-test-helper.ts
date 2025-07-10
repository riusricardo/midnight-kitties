/**
 * Multi-user test helper for testing offer-based buying system
 */
import { type CoinPublicKey } from '@midnight-ntwrk/compact-runtime';
import { KittiesAPI, type KittiesProviders } from '@repo/kitties-api';
import { MockWalletProvider } from './mock-wallet-provider';

export class MultiUserTestHelper {
  private baseProviders: KittiesProviders;
  private deployedApi: KittiesAPI | null = null;
  private userApis: Map<string, KittiesAPI> = new Map();

  constructor(baseProviders: KittiesProviders) {
    this.baseProviders = baseProviders;
  }

  /**
   * Deploy the contract with the original user
   */
  async deployContract(): Promise<KittiesAPI> {
    if (!this.deployedApi) {
      this.deployedApi = await KittiesAPI.deploy(this.baseProviders, {});
    }
    return this.deployedApi;
  }

  /**
   * Create a new user API instance that connects to the same contract
   * Note: This is a simplified approach that reuses the same wallet provider
   * but simulates different users for testing purposes
   */
  async createUserApi(userName: string, seed: number): Promise<KittiesAPI> {
    if (!this.deployedApi) {
      throw new Error('Contract must be deployed first');
    }

    // For now, just connect with the same providers to the existing contract
    // This simulates a different user but uses the same underlying wallet
    // In a real multi-user scenario, each user would have their own wallet
    const userApi = await KittiesAPI.connect(this.baseProviders, this.deployedApi.deployedContractAddress);

    this.userApis.set(userName, userApi);
    return userApi;
  }

  /**
   * Get a user's API instance
   */
  getUserApi(userName: string): KittiesAPI {
    const api = this.userApis.get(userName);
    if (!api) {
      throw new Error(`User ${userName} not found. Create user API first.`);
    }
    return api;
  }

  /**
   * Get the original deployed API
   */
  getOriginalApi(): KittiesAPI {
    if (!this.deployedApi) {
      throw new Error('Contract must be deployed first');
    }
    return this.deployedApi;
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.userApis.clear();
    this.deployedApi = null;
  }
}
