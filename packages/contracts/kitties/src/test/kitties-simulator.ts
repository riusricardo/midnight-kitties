/**
 * @file kitties-simulator.ts
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

import {
  type CircuitContext,
  QueryContext,
  sampleContractAddress,
  constructorContext,
  type CoinPublicKey
} from "@midnight-ntwrk/compact-runtime";
import {
  Contract,
  type Ledger,
  ledger
} from "../managed/kitties/contract/index.cjs";
import { type KittiesPrivateState, witnesses } from "../witnesses.js";
import { toHex, fromHex, isHex } from "@midnight-ntwrk/midnight-js-utils";
import { TextEncoder } from "util";

export class KittiesSimulator {
  readonly contract: Contract<KittiesPrivateState>;
  private baseContext: CircuitContext<KittiesPrivateState>;

  constructor() {
    this.contract = new Contract<KittiesPrivateState>(witnesses);
    const {
      currentPrivateState,
      currentContractState,
      currentZswapLocalState
    } = this.contract.initialState(
      constructorContext({}, this.createPublicKey("Alice"))
    );
    this.baseContext = {
      currentPrivateState,
      currentZswapLocalState,
      originalState: currentContractState,
      transactionContext: new QueryContext(
        currentContractState.data,
        sampleContractAddress()
      )
    };
  }

  // === Contract State Access ===

  public getLedger(): Ledger {
    return ledger(this.baseContext.originalState.data);
  }

  public getPrivateState(): KittiesPrivateState {
    return this.baseContext.currentPrivateState;
  }

  // === Kitty Creation and Management ===

  /**
   * Create a new kitty (mints NFT automatically)
   */
  public createKitty(): void {
    const result = this.contract.impureCircuits.createKitty(this.baseContext);
    this.baseContext = result.context;
  }

  /**
   * Transfer a kitty to another address
   */
  public transferKitty(to: CoinPublicKey, kittyId: bigint): void {
    const result = this.contract.impureCircuits.transferKitty(
      this.baseContext,
      this.publicKeyToBytes(to),
      kittyId
    );
    this.baseContext = result.context;
  }

  /**
   * Set the price for a kitty
   */
  public setPrice(kittyId: bigint, price: bigint): void {
    const result = this.contract.impureCircuits.setPrice(
      this.baseContext,
      kittyId,
      price
    );
    this.baseContext = result.context;
  }

  /**
   * Buy a kitty that is for sale
   */
  public buyKitty(kittyId: bigint, bidPrice: bigint): void {
    const result = this.contract.impureCircuits.buyKitty(
      this.baseContext,
      kittyId,
      bidPrice
    );
    this.baseContext = result.context;
  }

  /**
   * Breed two kitties to create a new offspring
   */
  public breedKitty(kittyId1: bigint, kittyId2: bigint): void {
    const result = this.contract.impureCircuits.breedKitty(
      this.baseContext,
      kittyId1,
      kittyId2
    );
    this.baseContext = result.context;
  }

  // === Query Methods ===

  /**
   * Get kitty information
   */
  public getKitty(kittyId: bigint): any {
    const result = this.contract.circuits.getKitty(this.baseContext, kittyId);
    return result.result;
  }

  /**
   * Get total number of kitties created
   */
  public getAllKittiesCount(): bigint {
    const result = this.contract.circuits.getAllKittiesCount(this.baseContext);
    return result.result;
  }

  // === NFT Module Functions (inherited from NFT) ===

  /**
   * Returns the balance count (bigint) - matches contract interface
   */
  public balanceOf(owner: CoinPublicKey): bigint {
    const result = this.contract.circuits.balanceOf(
      this.baseContext,
      this.publicKeyToBytes(owner)
    );
    return result.result;
  }

  /**
   * Returns the owner public key - matches contract interface
   */
  public ownerOf(tokenId: bigint): CoinPublicKey {
    const result = this.contract.circuits.ownerOf(this.baseContext, tokenId);
    return this.bytesToPublicKey(result.result);
  }

  /**
   * Approve an address for a token
   */
  public approve(to: CoinPublicKey, tokenId: bigint): void {
    const result = this.contract.impureCircuits.approve(
      this.baseContext,
      this.publicKeyToBytes(to),
      tokenId
    );
    this.baseContext = result.context;
  }

  /**
   * Returns the approved address for a token
   */
  public getApproved(tokenId: bigint): CoinPublicKey {
    const result = this.contract.circuits.getApproved(
      this.baseContext,
      tokenId
    );
    return this.bytesToPublicKey(result.result);
  }

  /**
   * Set approval for all tokens
   */
  public setApprovalForAll(operator: CoinPublicKey, approved: boolean): void {
    const result = this.contract.impureCircuits.setApprovalForAll(
      this.baseContext,
      this.publicKeyToBytes(operator),
      approved
    );
    this.baseContext = result.context;
  }

  /**
   * Returns approval status (boolean) - matches contract interface
   */
  public isApprovedForAll(
    owner: CoinPublicKey,
    operator: CoinPublicKey
  ): boolean {
    const result = this.contract.circuits.isApprovedForAll(
      this.baseContext,
      this.publicKeyToBytes(owner),
      this.publicKeyToBytes(operator)
    );
    return result.result;
  }

  /**
   * Transfer token from one address to another
   */
  public transferFrom(
    from: CoinPublicKey,
    to: CoinPublicKey,
    tokenId: bigint
  ): void {
    const result = this.contract.impureCircuits.transferFrom(
      this.baseContext,
      this.publicKeyToBytes(from),
      this.publicKeyToBytes(to),
      tokenId
    );
    this.baseContext = result.context;
  }

  // === Utility Methods ===

  /**
   * Create a deterministic public key from a username for testing
   */
  public createPublicKey(userName: string): CoinPublicKey {
    const encoded = new TextEncoder().encode(userName);
    const hexChars: string[] = [];

    for (let i = 0; i < 32; i++) {
      const byte =
        i < encoded.length
          ? encoded[i]
          : (userName.charCodeAt(i % userName.length) + i) % 256;
      hexChars.push(byte.toString(16).padStart(2, "0"));
    }

    return hexChars.join("") as CoinPublicKey;
  }

  /**
   * Convert string to 32-byte format
   */
  public stringToBytes(str: string): { bytes: Uint8Array } {
    const encoded = new TextEncoder().encode(str);
    const bytes = new Uint8Array(32);
    bytes.set(encoded.slice(0, 32));
    return { bytes };
  }

  /**
   * Convert CoinPublicKey to bytes
   */
  public publicKeyToBytes(publicKey: CoinPublicKey): { bytes: Uint8Array } {
    if (isHex(publicKey)) {
      const bytes = fromHex(publicKey.padStart(64, "0"));
      const result = new Uint8Array(32);
      result.set(bytes.slice(0, 32));
      return { bytes: result };
    }
    return this.stringToBytes(publicKey);
  }

  /**
   * Convert bytes to public key
   */
  public bytesToPublicKey(bytesObj: { bytes: Uint8Array }): CoinPublicKey {
    return toHex(bytesObj.bytes) as CoinPublicKey;
  }
}
