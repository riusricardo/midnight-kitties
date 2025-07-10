/**
 * @file kitties.test.ts
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

import { describe, it, expect } from "vitest";
import { KittiesSimulator } from "./kitties-simulator.js";
import {
  NetworkId,
  setNetworkId
} from "@midnight-ntwrk/midnight-js-network-id";

setNetworkId(NetworkId.Undeployed);

describe("Kitties Contract Tests", () => {
  it("should create a new kitty", () => {
    const simulator = new KittiesSimulator();

    // Initially, there should be no kitties
    expect(simulator.getAllKittiesCount()).toBe(0n);

    // Create the first kitty
    simulator.createKitty();

    // Check that a kitty was created
    expect(simulator.getAllKittiesCount()).toBe(1n);

    // Check that the kitty exists and has proper attributes
    const kitty = simulator.getKitty(1n);
    expect(kitty.generation).toBe(0n); // Changed to bigint
    expect(kitty.forSale).toBe(false);
    expect(kitty.price).toBe(0n);

    // Check that the owner owns the NFT
    const alice = simulator.createPublicKey("Alice");
    expect(simulator.ownerOf(1n)).toBe(alice);
    expect(simulator.balanceOf(alice)).toBe(1n);
  });

  it("should transfer kitty between users", () => {
    const simulator = new KittiesSimulator();
    const alice = simulator.createPublicKey("Alice");
    const bob = simulator.createPublicKey("Bob");

    // Create a kitty (Alice is the default owner)
    simulator.createKitty();

    // Transfer kitty to Bob
    simulator.transferKitty(bob, 1n);

    // Check new owner
    expect(simulator.ownerOf(1n)).toBe(bob);

    // Check balances
    expect(simulator.balanceOf(alice)).toBe(0n);
    expect(simulator.balanceOf(bob)).toBe(1n);

    // Check that kitty data was updated
    const kitty = simulator.getKitty(1n);
    expect(kitty.owner).toEqual(simulator.publicKeyToBytes(bob));
    expect(kitty.forSale).toBe(false);
    expect(kitty.price).toBe(0n);
  });

  it("should set price and make kitty for sale", () => {
    const simulator = new KittiesSimulator();

    // Create a kitty
    simulator.createKitty();

    // Set price for the kitty
    const price = 100n;
    simulator.setPrice(1n, price);

    // Check that the kitty is now for sale
    const kitty = simulator.getKitty(1n);
    expect(kitty.price).toBe(price);
    expect(kitty.forSale).toBe(true);
  });

  it("should allow transferring a kitty", () => {
    const simulator = new KittiesSimulator();
    const alice = simulator.createPublicKey("Alice");
    const bob = simulator.createPublicKey("Bob");

    // Create a kitty (Alice is the owner)
    simulator.createKitty();

    // Set price for the kitty first to test price persistence
    const price = 100n;
    simulator.setPrice(1n, price);

    // Verify kitty is for sale
    let kitty = simulator.getKitty(1n);
    expect(kitty.forSale).toBe(true);
    expect(kitty.price).toBe(price);

    // Transfer the kitty to Bob (this should reset sale status)
    simulator.transferKitty(bob, 1n);

    // Check ownership transfer
    expect(simulator.ownerOf(1n)).toBe(bob);
    expect(simulator.balanceOf(alice)).toBe(0n);
    expect(simulator.balanceOf(bob)).toBe(1n);

    // Check that kitty data was updated after transfer (should reset sale status)
    kitty = simulator.getKitty(1n);
    expect(kitty.forSale).toBe(false);
    expect(kitty.price).toBe(0n);
  });

  it("should handle offer-based buying system", () => {
    const simulator = new KittiesSimulator();
    const alice = simulator.createPublicKey("Alice");
    const bob = simulator.createPublicKey("Bob");

    // Alice creates a kitty
    simulator.createKitty();

    // Alice sets a price for the kitty
    const price = 100n;
    simulator.setPrice(1n, price);

    // Verify kitty is for sale
    let kitty = simulator.getKitty(1n);
    expect(kitty.forSale).toBe(true);
    expect(kitty.price).toBe(price);

    // Switch to Bob's context to make an offer
    simulator.switchUser(bob);

    // Bob makes an offer
    const bidPrice = 120n;
    simulator.createBuyOffer(1n, bidPrice);

    // Check that the offer was created
    const offer = simulator.getOffer(1n, bob);
    expect(offer.kittyId).toBe(1n);
    expect(offer.buyer).toEqual(simulator.publicKeyToBytes(bob));
    expect(offer.price).toBe(bidPrice);

    // Switch back to Alice's context
    simulator.switchUser(alice);

    // Alice approves Bob's offer
    simulator.approveOffer(1n, bob);

    // Check that ownership transferred
    expect(simulator.ownerOf(1n)).toBe(bob);
    expect(simulator.balanceOf(alice)).toBe(0n);
    expect(simulator.balanceOf(bob)).toBe(1n);

    // Check that kitty data was updated (should reset sale status)
    kitty = simulator.getKitty(1n);
    expect(kitty.forSale).toBe(false);
    expect(kitty.price).toBe(0n);

    // Check that the offer was removed after approval
    // (getOffer should return default/empty offer after approval)
    const offerAfterApproval = simulator.getOffer(1n, bob);
    expect(offerAfterApproval).toEqual({
      kittyId: 0n,
      buyer: { bytes: new Uint8Array(32) },
      price: 0n
    });
  });

  it("should handle multiple offers for the same kitty", () => {
    const simulator = new KittiesSimulator();
    const alice = simulator.createPublicKey("Alice");
    const bob = simulator.createPublicKey("Bob");
    const charlie = simulator.createPublicKey("Charlie");

    // Alice creates a kitty
    simulator.createKitty();

    // Alice sets a price for the kitty
    const price = 100n;
    simulator.setPrice(1n, price);

    // Bob makes an offer
    simulator.switchUser(bob);
    simulator.createBuyOffer(1n, 120n);

    // Charlie makes a higher offer
    simulator.switchUser(charlie);
    simulator.createBuyOffer(1n, 150n);

    // Check both offers exist
    const bobOffer = simulator.getOffer(1n, bob);
    const charlieOffer = simulator.getOffer(1n, charlie);

    expect(bobOffer.price).toBe(120n);
    expect(charlieOffer.price).toBe(150n);

    // Switch back to Alice's context
    simulator.switchUser(alice);

    // Alice chooses to approve Charlie's higher offer
    simulator.approveOffer(1n, charlie);

    // Check that Charlie now owns the kitty
    expect(simulator.ownerOf(1n)).toBe(charlie);
    expect(simulator.balanceOf(alice)).toBe(0n);
    expect(simulator.balanceOf(bob)).toBe(0n);
    expect(simulator.balanceOf(charlie)).toBe(1n);

    // Check that all offers were cleared after approval (including Bob's rejected offer)
    const bobOfferAfterApproval = simulator.getOffer(1n, bob);
    const charlieOfferAfterApproval = simulator.getOffer(1n, charlie);

    expect(bobOfferAfterApproval).toEqual({
      kittyId: 0n,
      buyer: { bytes: new Uint8Array(32) },
      price: 0n
    });

    expect(charlieOfferAfterApproval).toEqual({
      kittyId: 0n,
      buyer: { bytes: new Uint8Array(32) },
      price: 0n
    });
  });

  it("should handle offer rejection scenarios", () => {
    const simulator = new KittiesSimulator();
    const alice = simulator.createPublicKey("Alice");
    const bob = simulator.createPublicKey("Bob");

    // Alice creates a kitty
    simulator.createKitty();

    // Alice sets a price for the kitty
    const price = 100n;
    simulator.setPrice(1n, price);

    // Bob makes an offer that meets the minimum price
    simulator.switchUser(bob);
    simulator.createBuyOffer(1n, price); // Equal to asking price

    // Check that the offer was created
    const offer = simulator.getOffer(1n, bob);
    expect(offer.price).toBe(price);

    // Switch back to Alice's context
    simulator.switchUser(alice);

    // Alice can approve the offer
    simulator.approveOffer(1n, bob);

    // Check that ownership transferred
    expect(simulator.ownerOf(1n)).toBe(bob);
    expect(simulator.balanceOf(alice)).toBe(0n);
    expect(simulator.balanceOf(bob)).toBe(1n);
  });

  it("should enforce minimum price for offers", () => {
    const simulator = new KittiesSimulator();
    const bob = simulator.createPublicKey("Bob");

    // Alice creates a kitty (Alice is the default user)
    simulator.createKitty();

    // Alice sets a price for the kitty
    const price = 100n;
    simulator.setPrice(1n, price);

    // Bob tries to make an offer below the asking price
    simulator.switchUser(bob);

    // This should fail due to contract constraints
    expect(() => {
      simulator.createBuyOffer(1n, 50n); // Below asking price
    }).toThrow("Bid price too low");
  });

  it("should enforce for-sale requirement for offers", () => {
    const simulator = new KittiesSimulator();
    const bob = simulator.createPublicKey("Bob");

    // Alice creates a kitty but doesn't put it for sale (Alice is the default user)
    simulator.createKitty();

    // Verify kitty is not for sale
    let kitty = simulator.getKitty(1n);
    expect(kitty.forSale).toBe(false);
    expect(kitty.price).toBe(0n);

    // Bob tries to make an offer on a kitty not for sale
    simulator.switchUser(bob);

    // This should fail due to contract constraints
    expect(() => {
      simulator.createBuyOffer(1n, 100n);
    }).toThrow("Kitty is not for sale");
  });

  it("should breed two kitties", () => {
    const simulator = new KittiesSimulator();
    const alice = simulator.createPublicKey("Alice");

    // Create two parent kitties
    simulator.createKitty(); // Kitty ID 1
    simulator.createKitty(); // Kitty ID 2

    expect(simulator.getAllKittiesCount()).toBe(2n);

    // Breed the two kitties
    simulator.breedKitty(1n, 2n);

    // Check that a new kitty was created
    expect(simulator.getAllKittiesCount()).toBe(3n);

    // Check that the owner owns all kitties
    expect(simulator.balanceOf(alice)).toBe(3n);
    expect(simulator.ownerOf(3n)).toBe(alice);

    // Check that the offspring has the correct generation
    const parent1 = simulator.getKitty(1n);
    const parent2 = simulator.getKitty(2n);
    const offspring = simulator.getKitty(3n);

    expect(parent1.generation).toBe(0n); // Changed to bigint
    expect(parent2.generation).toBe(0n); // Changed to bigint
    expect(offspring.generation).toBe(1n); // max(0, 0) + 1 = 1, Changed to bigint
  });

  it("should handle multiple generations of breeding", () => {
    const simulator = new KittiesSimulator();
    const alice = simulator.createPublicKey("Alice");

    // Create initial kitties (generation 0)
    simulator.createKitty(); // Kitty ID 1
    simulator.createKitty(); // Kitty ID 2

    // Breed them to create generation 1
    simulator.breedKitty(1n, 2n); // Kitty ID 3 (generation 1)

    // Create another generation 0 kitty
    simulator.createKitty(); // Kitty ID 4

    // Breed generation 1 with generation 0 to create generation 2
    simulator.breedKitty(3n, 4n); // Kitty ID 5 (generation 2)

    // Check generations
    expect(simulator.getKitty(1n).generation).toBe(0n); // Changed to bigint
    expect(simulator.getKitty(2n).generation).toBe(0n); // Changed to bigint
    expect(simulator.getKitty(3n).generation).toBe(1n); // Changed to bigint
    expect(simulator.getKitty(4n).generation).toBe(0n); // Changed to bigint
    expect(simulator.getKitty(5n).generation).toBe(2n); // max(1, 0) + 1 = 2, Changed to bigint

    expect(simulator.getAllKittiesCount()).toBe(5n);
    expect(simulator.balanceOf(alice)).toBe(5n);
  });

  it("should handle NFT approvals", () => {
    const simulator = new KittiesSimulator();
    const bob = simulator.createPublicKey("Bob");

    // Create a kitty (owned by default user Alice)
    simulator.createKitty();

    // Alice approves Bob to transfer her kitty
    simulator.approve(bob, 1n);

    // Check approval
    const approved = simulator.getApproved(1n);
    expect(approved).toBe(bob);
  });

  it("should handle operator approvals", () => {
    const simulator = new KittiesSimulator();
    const alice = simulator.createPublicKey("Alice");
    const bob = simulator.createPublicKey("Bob");

    // Alice sets Bob as operator for all her tokens
    simulator.setApprovalForAll(bob, true);

    // Check approval
    const isApproved = simulator.isApprovedForAll(alice, bob);
    expect(isApproved).toBe(true);
  });

  it("should handle zero balance correctly", () => {
    const simulator = new KittiesSimulator();
    const alice = simulator.createPublicKey("Alice");
    const bob = simulator.createPublicKey("Bob");

    // Check balance of user with no tokens
    expect(simulator.balanceOf(bob)).toBe(0n);

    // Alice should also have 0 initially
    expect(simulator.balanceOf(alice)).toBe(0n);

    // Create a kitty for Alice
    simulator.createKitty();

    // Now Alice should have 1, Bob still 0
    expect(simulator.balanceOf(alice)).toBe(1n);
    expect(simulator.balanceOf(bob)).toBe(0n);
  });

  it("should handle large token IDs", () => {
    const simulator = new KittiesSimulator();
    const alice = simulator.createPublicKey("Alice");

    // Create multiple kitties to get higher IDs
    for (let i = 0; i < 10; i++) {
      simulator.createKitty();
    }

    expect(simulator.getAllKittiesCount()).toBe(10n);
    expect(simulator.balanceOf(alice)).toBe(10n);

    // Check that all kitties exist and have correct properties
    for (let i = 1; i <= 10; i++) {
      const kitty = simulator.getKitty(BigInt(i));
      expect(kitty.generation).toBe(0n); // Changed to bigint
      expect(simulator.ownerOf(BigInt(i))).toBe(alice);
    }
  });

  it("should generate different DNA for each kitty", () => {
    const simulator = new KittiesSimulator();

    // Create multiple kitties
    simulator.createKitty();
    simulator.createKitty();
    simulator.createKitty();

    // Get their DNA
    const kitty1 = simulator.getKitty(1n);
    const kitty2 = simulator.getKitty(2n);
    const kitty3 = simulator.getKitty(3n);

    // DNA should be different for each kitty
    expect(kitty1.dna).not.toBe(kitty2.dna);
    expect(kitty1.dna).not.toBe(kitty3.dna);
    expect(kitty2.dna).not.toBe(kitty3.dna);
  });
});
