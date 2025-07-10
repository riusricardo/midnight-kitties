/**
 * @file kitties.api.test.ts
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

import { type Resource } from '@midnight-ntwrk/wallet';
import { type Wallet } from '@midnight-ntwrk/wallet-api';
import path from 'path';
import { configureProviders, KittiesProviders } from '@repo/kitties-api/node-api';
import { setLogger, KittiesAPI, currentDir } from '@repo/kitties-api';
import { TestEnvironment } from './commons';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { contractConfig, createLogger } from '@repo/kitties-api';

const logDir = path.resolve(currentDir, '..', 'logs', 'tests', `${new Date().toISOString()}.log`);
const logger = await createLogger(logDir);

describe('API', () => {
  let testEnvironment: TestEnvironment;
  let wallet: Wallet & Resource;
  let providers: KittiesProviders;

  beforeAll(
    async () => {
      setLogger(logger);
      testEnvironment = new TestEnvironment(logger);
      const testConfiguration = await testEnvironment.start();
      wallet = await testEnvironment.getWallet();
      providers = await configureProviders(
        wallet,
        testConfiguration.dappConfig,
        new NodeZkConfigProvider<'increment'>(contractConfig.zkConfigPath),
      );
    },
    1000 * 60 * 45,
  );

  afterAll(async () => {
    await testEnvironment.saveWalletCache();
    await testEnvironment.shutdown();
  });

  it('should deploy the contract and create kitties [@slow]', async () => {
    // Clear any existing private state to ensure clean test
    await providers.privateStateProvider.clear();

    // Deploy using new unified API - now returns KittiesAPI instance
    const kittiesApi = await KittiesAPI.deploy(providers, {});
    expect(kittiesApi).not.toBeNull();

    // Get initial kitties count
    const initialCount = await kittiesApi.getAllKittiesCount();
    expect(initialCount).toEqual(BigInt(0));

    // Create a new kitty
    await kittiesApi.createKitty();

    // Kitties count should now be 1
    const countAfterCreate = await kittiesApi.getAllKittiesCount();
    expect(countAfterCreate).toEqual(BigInt(1));

    // Get the created kitty
    const kitty = await kittiesApi.getKitty(BigInt(1));
    expect(kitty).not.toBeNull();
    expect(kitty.id).toEqual(BigInt(1));
    expect(kitty.dna).toBeDefined();
    expect(kitty.gender).toBeDefined();
    expect(kitty.generation).toEqual(BigInt(0)); // First generation
    expect(kitty.forSale).toBe(false); // Not for sale initially
    expect(kitty.price).toEqual(BigInt(0)); // No price set initially
  });

  it('should create multiple kitties and track ownership [@slow]', async () => {
    // Clear any existing private state to ensure clean test
    await providers.privateStateProvider.clear();

    // Deploy a new contract for this test
    const kittiesApi = await KittiesAPI.deploy(providers, {});
    expect(kittiesApi).not.toBeNull();

    // Test address conversion via API
    const walletBytes = kittiesApi.getWalletAddress();

    // Create first kitty
    await kittiesApi.createKitty();

    // Get the actual owner from the kitty itself
    const kitty1 = await kittiesApi.getKitty(BigInt(1));
    const actualOwner = kitty1.owner;

    // Use the converted wallet bytes to test getUserKitties
    const userKittiesAfterFirst = await kittiesApi.getUserKitties(walletBytes);
    expect(userKittiesAfterFirst.length).toBe(1);
    expect(userKittiesAfterFirst[0].id).toEqual(BigInt(1));
    expect(userKittiesAfterFirst[0].generation).toEqual(BigInt(0));

    // Test the convenience method getMyKitties
    const myKittiesAfterFirst = await kittiesApi.getMyKitties();
    expect(myKittiesAfterFirst.length).toBe(1);
    expect(myKittiesAfterFirst[0].id).toEqual(BigInt(1));

    // Create second kitty
    await kittiesApi.createKitty();

    // Check user now has two kitties
    const userKittiesAfterSecond = await kittiesApi.getUserKitties(walletBytes);
    expect(userKittiesAfterSecond.length).toBe(2);

    // Total count should be 2
    const totalCount = await kittiesApi.getAllKittiesCount();
    expect(totalCount).toEqual(BigInt(2));

    // Test that the kitties have different DNA (random generation)
    expect(userKittiesAfterSecond[0].dna).not.toEqual(userKittiesAfterSecond[1].dna);
  });

  it('should handle kitty pricing and sales lists [@slow]', async () => {
    // Clear any existing private state to ensure clean test
    await providers.privateStateProvider.clear();

    // Deploy a new contract for this test
    const kittiesApi = await KittiesAPI.deploy(providers, {});

    // Create a kitty
    await kittiesApi.createKitty();

    // Get the created kitty
    const kitty = await kittiesApi.getKitty(BigInt(1));
    expect(kitty.forSale).toBe(false);
    expect(kitty.price).toEqual(BigInt(0));

    // Set a price for the kitty
    const price = BigInt(100);
    await kittiesApi.setPrice({ kittyId: BigInt(1), price });

    // Get the kitty after setting price
    const kittyAfterPrice = await kittiesApi.getKitty(BigInt(1));
    expect(kittyAfterPrice.forSale).toBe(true);
    expect(kittyAfterPrice.price).toEqual(price);

    // Check that the kitty appears in the for sale list
    const forSaleKitties = await kittiesApi.getKittiesForSale();
    expect(forSaleKitties.length).toBe(1);
    expect(forSaleKitties[0].kitty.id).toEqual(BigInt(1));
    expect(forSaleKitties[0].kitty.price).toEqual(price);

    // Remove from sale by setting price to 0
    await kittiesApi.setPrice({ kittyId: BigInt(1), price: BigInt(0) });

    // Get the kitty after removing from sale
    const kittyAfterRemoval = await kittiesApi.getKitty(BigInt(1));
    expect(kittyAfterRemoval.forSale).toBe(false);
    expect(kittyAfterRemoval.price).toEqual(BigInt(0));

    // Check that the kitty no longer appears in the for sale list
    const forSaleKittiesAfterRemoval = await kittiesApi.getKittiesForSale();
    expect(forSaleKittiesAfterRemoval.length).toBe(0);
  });

  it('should handle kitty breeding [@slow]', async () => {
    // Clear any existing private state to ensure clean test
    await providers.privateStateProvider.clear();

    // Deploy a new contract for this test
    const kittiesApi = await KittiesAPI.deploy(providers, {});

    // Create two parent kitties
    await kittiesApi.createKitty(); // Kitty 1
    await kittiesApi.createKitty(); // Kitty 2

    // Get the parent kitties
    const parent1 = await kittiesApi.getKitty(BigInt(1));
    const parent2 = await kittiesApi.getKitty(BigInt(2));

    expect(parent1.generation).toEqual(BigInt(0));
    expect(parent2.generation).toEqual(BigInt(0));

    // Breed the two kitties
    await kittiesApi.breedKitty({ kittyId1: BigInt(1), kittyId2: BigInt(2) });

    // Check that a new kitty was created
    const totalCount = await kittiesApi.getAllKittiesCount();
    expect(totalCount).toEqual(BigInt(3));

    // Get the child kitty
    const child = await kittiesApi.getKitty(BigInt(3));
    expect(child.generation).toEqual(BigInt(1)); // Should be generation 1
    expect(child.dna).not.toEqual(parent1.dna); // Should have different DNA
    expect(child.dna).not.toEqual(parent2.dna); // Should have different DNA
  });

  it('should enforce offer-based buying system constraints [@slow]', async () => {
    // Clear any existing private state to ensure clean test
    await providers.privateStateProvider.clear();

    // Deploy a new contract for this test
    const kittiesApi = await KittiesAPI.deploy(providers, {});

    // Create a kitty
    await kittiesApi.createKitty();

    // Set a price for the kitty
    const price = BigInt(100);
    await kittiesApi.setPrice({ kittyId: BigInt(1), price });

    // Verify kitty is for sale
    const kittyBeforeOffer = await kittiesApi.getKitty(BigInt(1));
    expect(kittyBeforeOffer.forSale).toBe(true);
    expect(kittyBeforeOffer.price).toEqual(price);

    // Test 1: Cannot make offer on own kitty (contract constraint)
    await expect(kittiesApi.buyKitty({ kittyId: BigInt(1), bidPrice: BigInt(120) })).rejects.toThrow(
      'Cannot buy your own kitty',
    );

    // Test 2: Transfer kitty to another address to simulate different ownership
    const newOwnerAddress = { bytes: new Uint8Array(32).fill(1) };
    await kittiesApi.transferKitty({ to: newOwnerAddress, kittyId: BigInt(1) });

    // Verify transfer worked and sale status was reset
    const kittyAfterTransfer = await kittiesApi.getKitty(BigInt(1));
    expect(kittyAfterTransfer.owner.bytes).toEqual(newOwnerAddress.bytes);
    expect(kittyAfterTransfer.forSale).toBe(false);
    expect(kittyAfterTransfer.price).toEqual(BigInt(0));

    // Test 3: Cannot make offer on kitty not for sale
    await expect(kittiesApi.buyKitty({ kittyId: BigInt(1), bidPrice: BigInt(100) })).rejects.toThrow(
      'Kitty is not for sale',
    );

    // Note: This test validates the core offer system constraints.
    // In a real multi-wallet scenario, different users would be able to:
    // - Make offers on each other's kitties for sale
    // - Approve offers and complete ownership transfers
    // - Have their offers cleared after approval
    // The contract-level tests (in the simulator) fully validate this logic.
  });

  it('should enforce contract constraints [@slow]', async () => {
    // Clear any existing private state to ensure clean test
    await providers.privateStateProvider.clear();

    // Deploy a new contract for this test
    const kittiesApi = await KittiesAPI.deploy(providers, {});

    // Create a kitty
    await kittiesApi.createKitty();

    // Test 1: Cannot make offer on kitty not for sale
    await expect(kittiesApi.buyKitty({ kittyId: BigInt(1), bidPrice: BigInt(100) })).rejects.toThrow(
      'Kitty is not for sale',
    );

    // Set a price to make it for sale
    const price = BigInt(100);
    await kittiesApi.setPrice({ kittyId: BigInt(1), price });

    // Test 2: Cannot make offer below asking price
    await expect(kittiesApi.buyKitty({ kittyId: BigInt(1), bidPrice: BigInt(50) })).rejects.toThrow(
      'Bid price too low',
    );

    // Test 3: Cannot buy own kitty (even with valid price)
    await expect(kittiesApi.buyKitty({ kittyId: BigInt(1), bidPrice: price })).rejects.toThrow(
      'Cannot buy your own kitty',
    );
  });

  it('should handle NFT standard operations [@slow]', async () => {
    // Clear any existing private state to ensure clean test
    await providers.privateStateProvider.clear();

    // Deploy a new contract for this test
    const kittiesApi = await KittiesAPI.deploy(providers, {});

    // Get wallet address using API conversion
    const walletBytes = kittiesApi.getWalletAddress();

    // Create a test address for ownership operations
    const testAddress = { bytes: new Uint8Array(32).fill(1) };

    // Initially, balance should be 0
    const initialBalance = await kittiesApi.balanceOf(testAddress);
    expect(initialBalance).toEqual(BigInt(0));

    // Create first kitty
    await kittiesApi.createKitty();

    // Get the owner of the first kitty and verify it matches our wallet
    const owner = await kittiesApi.ownerOf(BigInt(1));

    expect(owner).toBeDefined();
    expect(owner.bytes).toBeInstanceOf(Uint8Array);
    expect(owner.bytes).toEqual(walletBytes.bytes);

    // Check wallet balance
    const walletBalance = await kittiesApi.balanceOf(walletBytes);
    expect(walletBalance).toEqual(BigInt(1));

    // Try to transfer the kitty to the test address
    await kittiesApi.transferKitty({ to: testAddress, kittyId: BigInt(1) });

    // Verify the transfer worked
    const newOwner = await kittiesApi.ownerOf(BigInt(1));
    expect(newOwner.bytes).toEqual(testAddress.bytes);

    // Check balance of test address
    const balanceAfterTransfer = await kittiesApi.balanceOf(testAddress);
    expect(balanceAfterTransfer).toEqual(BigInt(1));

    // Check wallet balance is now 0
    const walletBalanceAfter = await kittiesApi.balanceOf(walletBytes);
    expect(walletBalanceAfter).toEqual(BigInt(0));

    // Verify transfer resets sale status
    const kittyAfterTransfer = await kittiesApi.getKitty(BigInt(1));
    expect(kittyAfterTransfer.forSale).toBe(false);
    expect(kittyAfterTransfer.price).toEqual(BigInt(0));

    // Create another kitty and check total supply
    await kittiesApi.createKitty();
    const totalSupply = await kittiesApi.getAllKittiesCount();
    expect(totalSupply).toEqual(BigInt(2));
  });
});
