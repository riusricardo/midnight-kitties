/**
 * Mock wallet provider for testing multi-user scenarios
 */
import { type CoinPublicKey } from '@midnight-ntwrk/compact-runtime';
import { type WalletProvider } from '@midnight-ntwrk/midnight-js-types';
import { type Observable, BehaviorSubject } from 'rxjs';

export class MockWalletProvider implements WalletProvider {
  private _coinPublicKey: CoinPublicKey;
  private _balanceSubject: BehaviorSubject<bigint>;

  constructor(initialPublicKey: CoinPublicKey) {
    this._coinPublicKey = initialPublicKey;
    this._balanceSubject = new BehaviorSubject<bigint>(BigInt(1000000)); // 1M initial balance
  }

  get coinPublicKey(): CoinPublicKey {
    return this._coinPublicKey;
  }

  get encryptionPublicKey(): string {
    // Generate a valid-looking encryption public key based on the coin public key
    // Use a fixed valid format that won't cause checksum errors
    const coinKeyShort = this._coinPublicKey.substring(0, 8);
    return `enc_test_${coinKeyShort}_000000000000000000000000000000000000000000000000000000000001`;
  }

  get balanceObserver(): Observable<bigint> {
    return this._balanceSubject.asObservable();
  }

  get balanceTx(): (tx: any, newCoins: any[]) => Promise<any> {
    // Mock transaction balancing function
    return async (tx: any, newCoins: any[]) => {
      // Just return the transaction as-is for mocking
      return tx;
    };
  }

  /**
   * Switch to a different user for testing
   */
  switchUser(newPublicKey: CoinPublicKey): void {
    this._coinPublicKey = newPublicKey;
    // Reset balance for new user
    this._balanceSubject.next(BigInt(1000000));
  }

  /**
   * Create a new public key for testing (utility method)
   */
  static createMockPublicKey(seed: number): CoinPublicKey {
    const bytes = new Uint8Array(32);
    // Fill with a pattern based on the seed
    for (let i = 0; i < 32; i++) {
      bytes[i] = (seed + i) % 256;
    }
    // Convert to string format that CoinPublicKey expects
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('') as CoinPublicKey;
  }

  // Implement other required WalletProvider methods as no-ops or mocks
  async signTransaction(transaction: any): Promise<any> {
    // Mock implementation - just return the transaction
    return transaction;
  }

  async getBalance(): Promise<bigint> {
    return this._balanceSubject.value;
  }

  // Add any other methods that might be required by the WalletProvider interface
  [key: string]: any;
}
