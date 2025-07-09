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

  it('should deploy the contract and require valid credentials to increment [@slow]', async () => {
    // Clear any existing private state to ensure clean test
    await providers.privateStateProvider.clear();

    // Deploy using new unified API - now returns KittiesAPI instance
    const kittiesApi = await KittiesAPI.deploy(providers, { value: 0 });
    expect(kittiesApi).not.toBeNull();

    // Get initial kitties value using new unified API
    const kitties = await KittiesAPI.getKittiesInfo(kittiesApi);
    expect(kitties.kittiesValue).toEqual(BigInt(0));

    // Initially, trying to increment without credentials should fail with error
    await expect(KittiesAPI.incrementWithTxInfo(kittiesApi)).rejects.toThrow(/First name cannot be empty/);

    // Kitties should still be 0 after failed attempt
    const kittiesAfterFailedAttempt = await KittiesAPI.getKittiesInfo(kittiesApi);
    expect(kittiesAfterFailedAttempt.kittiesValue).toEqual(BigInt(0));

    // Now set up valid credentials for a user over 21
    const validCredential = {
      id: new Uint8Array(32).fill(1),
      first_name: new Uint8Array(32).fill(2),
      last_name: new Uint8Array(32).fill(3),
      birth_timestamp: BigInt(Date.now() - 25 * 365 * 24 * 60 * 60 * 1000), // 25 years old
    };

    await kittiesApi.updateCredentialSubject(validCredential);

    // Verify user is now verified
    const isVerified = await kittiesApi.isUserVerified();
    expect(isVerified).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Now increment should work with valid credentials
    const response = await KittiesAPI.incrementWithTxInfo(kittiesApi);
    expect(response.txHash || response.txId).toMatch(/[0-9a-f]{64}/);
    expect(response.blockHeight).toBeGreaterThan(BigInt(0));

    // Get kitties value after successful increment
    const kittiesAfter = await KittiesAPI.getKittiesInfo(kittiesApi);
    expect(kittiesAfter.kittiesValue).toEqual(BigInt(1));
    expect(kittiesAfter.contractAddress).toEqual(kitties.contractAddress);
  });

  it('should store and retrieve credential subject in KittiesPrivateState [@slow]', async () => {
    // Clear any existing private state to ensure clean test
    await providers.privateStateProvider.clear();

    // Deploy a new contract for this test
    const kittiesApi = await KittiesAPI.deploy(providers, { value: 0 });
    expect(kittiesApi).not.toBeNull();

    // Create test credential data matching the CredentialSubject structure
    const testCredentialSubject = {
      id: new Uint8Array(32).fill(1), // Test ID
      first_name: new TextEncoder().encode('TestUser').slice(0, 32), // Encode and pad to 32 bytes
      last_name: new TextEncoder().encode('TestLastName').slice(0, 32), // Encode and pad to 32 bytes
      birth_timestamp: BigInt(Date.now() - 25 * 365 * 24 * 60 * 60 * 1000), // 25 years ago - over 21
    };

    // Pad the byte arrays to 32 bytes
    const paddedFirstName = new Uint8Array(32);
    paddedFirstName.set(testCredentialSubject.first_name);

    const paddedLastName = new Uint8Array(32);
    paddedLastName.set(testCredentialSubject.last_name);

    const finalCredentialSubject = {
      id: testCredentialSubject.id,
      first_name: paddedFirstName,
      last_name: paddedLastName,
      birth_timestamp: testCredentialSubject.birth_timestamp,
    };

    // Initially, no credential subject should exist
    const initialCredential = await kittiesApi.getCredentialSubject();
    expect(initialCredential).toBeNull();

    // User should not be verified initially
    const initialVerification = await kittiesApi.isUserVerified();
    expect(initialVerification).toBe(false);

    // Update the credential subject
    await kittiesApi.updateCredentialSubject(finalCredentialSubject);

    // Retrieve the credential subject
    const retrievedCredential = await kittiesApi.getCredentialSubject();
    expect(retrievedCredential).not.toBeNull();
    expect(retrievedCredential.id).toEqual(finalCredentialSubject.id);
    expect(retrievedCredential.first_name).toEqual(finalCredentialSubject.first_name);
    expect(retrievedCredential.last_name).toEqual(finalCredentialSubject.last_name);
    expect(retrievedCredential.birth_timestamp).toEqual(finalCredentialSubject.birth_timestamp);

    // User should now be verified (over 21)
    const finalVerification = await kittiesApi.isUserVerified();
    expect(finalVerification).toBe(true);

    // Test that the private state persists across API calls
    const retrievedAgain = await kittiesApi.getCredentialSubject();
    expect(retrievedAgain).toEqual(retrievedCredential);
  });

  it('should correctly validate age verification with 21+ requirement [@slow]', async () => {
    // Clear any existing private state to ensure clean test
    await providers.privateStateProvider.clear();

    // Deploy a new contract for this test
    const kittiesApi = await KittiesAPI.deploy(providers, { value: 0 });

    // Test with under-age user (20 years old - under 21)
    const underageCredential = {
      id: new Uint8Array(32).fill(2),
      first_name: new Uint8Array(32).fill(0),
      last_name: new Uint8Array(32).fill(0),
      birth_timestamp: BigInt(Date.now() - 20 * 365 * 24 * 60 * 60 * 1000), // 20 years ago - under 21
    };

    await kittiesApi.updateCredentialSubject(underageCredential);
    const underageVerification = await kittiesApi.isUserVerified();
    expect(underageVerification).toBe(false);

    // Test with legal age user (22 years old - over 21)
    const legalAgeCredential = {
      id: new Uint8Array(32).fill(3),
      first_name: new Uint8Array(32).fill(0),
      last_name: new Uint8Array(32).fill(0),
      birth_timestamp: BigInt(Date.now() - 22 * 365 * 24 * 60 * 60 * 1000), // 22 years ago - over 21
    };

    await kittiesApi.updateCredentialSubject(legalAgeCredential);
    const legalAgeVerification = await kittiesApi.isUserVerified();
    expect(legalAgeVerification).toBe(true);
  });

  it('should prevent credential fraud attempts [@slow]', async () => {
    // Clear any existing private state to ensure clean test
    await providers.privateStateProvider.clear();

    // Deploy a new contract for this test
    const kittiesApi = await KittiesAPI.deploy(providers, { value: 0 });

    // User initially tries with underage credentials (19 years old)
    const underageCredential = {
      id: new Uint8Array(32).fill(1),
      first_name: new Uint8Array(32).fill(2),
      last_name: new Uint8Array(32).fill(3),
      birth_timestamp: BigInt(Date.now() - 19 * 365 * 24 * 60 * 60 * 1000), // 19 years old - under 21
    };

    await kittiesApi.updateCredentialSubject(underageCredential);

    // Verify user is not verified due to age
    const underageVerification = await kittiesApi.isUserVerified();
    expect(underageVerification).toBe(false);

    // Get initial kitties value
    const initialKitties = await KittiesAPI.getKittiesInfo(kittiesApi);
    expect(initialKitties.kittiesValue).toEqual(BigInt(0));

    // Underage user tries to increment - based on smart contract behavior,
    // this should succeed but not increment the kitties (round stays 0)
    await KittiesAPI.incrementWithTxInfo(kittiesApi);

    // Kitties should still be 0 since user is underage
    const kittiesAfterUnderage = await KittiesAPI.getKittiesInfo(kittiesApi);
    expect(kittiesAfterUnderage.kittiesValue).toEqual(BigInt(0));

    // Now user tries to "update" their birth timestamp to appear older
    // but keeps the same ID (fraudulent attempt)
    const fraudulentCredential = {
      id: new Uint8Array(32).fill(1), // Same ID as before
      first_name: new Uint8Array(32).fill(2),
      last_name: new Uint8Array(32).fill(3),
      birth_timestamp: BigInt(Date.now() - 25 * 365 * 24 * 60 * 60 * 1000), // Now claims to be 25 years old
    };

    await kittiesApi.updateCredentialSubject(fraudulentCredential);

    // This should fail when trying to increment due to credential hash mismatch
    await expect(KittiesAPI.incrementWithTxInfo(kittiesApi)).rejects.toThrow();

    // Kitties should still be 0
    const finalKitties = await KittiesAPI.getKittiesInfo(kittiesApi);
    expect(finalKitties.kittiesValue).toEqual(BigInt(0));
  });

  it('should allow same user to increment multiple times with consistent credentials [@slow]', async () => {
    // Clear any existing private state to ensure clean test
    await providers.privateStateProvider.clear();

    // Deploy a new contract for this test
    const kittiesApi = await KittiesAPI.deploy(providers, { value: 0 });

    // User with valid credentials
    const userCredential = {
      id: new Uint8Array(32).fill(1),
      first_name: new Uint8Array(32).fill(2),
      last_name: new Uint8Array(32).fill(3),
      birth_timestamp: BigInt(Date.now() - 25 * 365 * 24 * 60 * 60 * 1000), // 25 years old
    };

    await kittiesApi.updateCredentialSubject(userCredential);

    // Verify user is verified
    const verification = await kittiesApi.isUserVerified();
    expect(verification).toBe(true);

    // First increment
    await KittiesAPI.incrementWithTxInfo(kittiesApi);
    const kittiesAfterFirst = await KittiesAPI.getKittiesInfo(kittiesApi);
    expect(kittiesAfterFirst.kittiesValue).toEqual(BigInt(1));

    // Same user sets same credentials again (simulating returning user)
    await kittiesApi.updateCredentialSubject(userCredential);

    // Second increment with same credentials should work
    await KittiesAPI.incrementWithTxInfo(kittiesApi);
    const kittiesAfterSecond = await KittiesAPI.getKittiesInfo(kittiesApi);
    expect(kittiesAfterSecond.kittiesValue).toEqual(BigInt(2));

    // Third increment
    await KittiesAPI.incrementWithTxInfo(kittiesApi);
    const kittiesAfterThird = await KittiesAPI.getKittiesInfo(kittiesApi);
    expect(kittiesAfterThird.kittiesValue).toEqual(BigInt(3));
  });
});
