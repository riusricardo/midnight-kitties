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

import { CounterSimulator } from "./counter-simulator.js";
import {
  NetworkId,
  setNetworkId
} from "@midnight-ntwrk/midnight-js-network-id";
import { describe, it, expect } from "vitest";

setNetworkId(NetworkId.Undeployed);

describe("Counter smart contract", () => {
  it("generates initial ledger state deterministically", () => {
    const simulator0 = new CounterSimulator();
    const simulator1 = new CounterSimulator();
    const ledger0 = simulator0.getLedger();
    const ledger1 = simulator1.getLedger();

    // Check that the round values are the same
    expect(ledger0.round).toEqual(ledger1.round);
    // Check that both credential maps are empty initially
    expect(ledger0.credentialHashes.size()).toEqual(0n);
    expect(ledger1.credentialHashes.size()).toEqual(0n);
  });

  it("properly initializes ledger state and private state", () => {
    const simulator = new CounterSimulator();
    const initialLedgerState = simulator.getLedger();
    expect(initialLedgerState.round).toEqual(0n);
    const initialPrivateState = simulator.getPrivateState();
    expect(initialPrivateState).toEqual({ value: 0 });
  });

  it("increments the counter correctly", () => {
    const simulator = new CounterSimulator();

    // Create a test credential subject (over 21 years old) for this test
    const testCredentialSubject = {
      id: simulator.getUserPublicKey().bytes,
      first_name: new Uint8Array(32).fill(2),
      last_name: new Uint8Array(32).fill(3),
      birth_timestamp: BigInt(Date.now() - 25 * 365 * 24 * 60 * 60 * 1000)
    };

    // Set the credential so the increment can work
    simulator.setCredentialSubject(testCredentialSubject);

    const nextLedgerState = simulator.increment();
    expect(nextLedgerState.round).toEqual(1n);
    const nextPrivateState = simulator.getPrivateState();
    expect(nextPrivateState.value).toEqual(0);
  });

  it("verifies credentials are stored and retrieved from credentialHashes map", () => {
    const simulator = new CounterSimulator();

    // Create a test credential subject (over 21 years old)
    const testCredentialSubject = {
      id: simulator.getUserPublicKey().bytes,
      first_name: new Uint8Array(32).fill(2), // Use 2 for first name
      last_name: new Uint8Array(32).fill(3), // Use 3 for last name
      birth_timestamp: BigInt(Date.now() - 25 * 365 * 24 * 60 * 60 * 1000) // 25 years ago
    };

    // Set the credential in private state
    simulator.setCredentialSubject(testCredentialSubject);

    // Verify initial state - credentialHashes should be empty
    const initialLedger = simulator.getLedger();
    expect(initialLedger.credentialHashes.size()).toEqual(0n);

    // First increment should store the credential ID in the map
    const firstIncrementLedger = simulator.increment();
    expect(firstIncrementLedger.round).toEqual(1n);

    // Verify the credential ID was stored in credentialHashes
    const credentialHashes = firstIncrementLedger.credentialHashes;
    expect(credentialHashes.size()).toEqual(1n);

    // The key should be the user's public key - check if it exists in the map
    const idExists = credentialHashes.member(simulator.getUserPublicKey());
    expect(idExists).toBe(true);

    // Second increment with same credential should still work (existing credential lookup)
    const secondIncrementLedger = simulator.increment();
    expect(secondIncrementLedger.round).toEqual(2n);

    // Should still have the same credential in the map
    expect(secondIncrementLedger.credentialHashes.size()).toEqual(1n);
  });

  it("fails when same credential ID has different hash (birth timestamp)", () => {
    const simulator = new CounterSimulator();

    // First credential - user is over 21, so this should work
    const firstCredential = {
      id: simulator.getUserPublicKey().bytes,
      first_name: new Uint8Array(32).fill(2),
      last_name: new Uint8Array(32).fill(3),
      birth_timestamp: BigInt(Date.now() - 25 * 365 * 24 * 60 * 60 * 1000) // 25 years ago
    };

    simulator.setCredentialSubject(firstCredential);
    const firstIncrement = simulator.increment();
    expect(firstIncrement.credentialHashes.size()).toEqual(1n);

    // Same credential ID but different birth timestamp should fail
    const conflictingCredential = {
      id: simulator.getUserPublicKey().bytes, // Same ID as first
      first_name: new Uint8Array(32).fill(2),
      last_name: new Uint8Array(32).fill(3),
      birth_timestamp: BigInt(Date.now() - 30 * 365 * 24 * 60 * 60 * 1000) // Different birth timestamp
    };

    simulator.setCredentialSubject(conflictingCredential);

    // This should throw an error due to credential subject hash mismatch
    expect(() => {
      simulator.increment();
    }).toThrow("Credential subject hash mismatch");
  });

  it("prevents credential update after initial registration - underage user scenario", () => {
    const simulator = new CounterSimulator();

    // Scenario: User initially tries with underage credentials (17 years old)
    const underageCredential = {
      id: simulator.getUserPublicKey().bytes,
      first_name: new Uint8Array(32).fill(2),
      last_name: new Uint8Array(32).fill(3),
      birth_timestamp: BigInt(Date.now() - 17 * 365 * 24 * 60 * 60 * 1000) // 17 years ago - underage
    };

    simulator.setCredentialSubject(underageCredential);

    // First attempt should NOT increment the round due to age restriction, but should store credentials
    const firstAttemptLedger = simulator.increment();
    expect(firstAttemptLedger.round).toEqual(0n); // Round should not increment for underage user

    // Verify that the credential WAS stored in the map despite the age check failure
    // (because credential storage happens before age validation in the new contract behavior)
    expect(firstAttemptLedger.credentialHashes.size()).toEqual(1n);
    const idExists = firstAttemptLedger.credentialHashes.member(
      simulator.getUserPublicKey()
    );
    expect(idExists).toBe(true);

    // Now user realizes the limitation and tries to "update" their birth timestamp
    // to appear older, but keeps the same ID (fraudulent attempt)
    const fraudulentCredential = {
      id: simulator.getUserPublicKey().bytes, // Same ID as before
      first_name: new Uint8Array(32).fill(2),
      last_name: new Uint8Array(32).fill(3),
      birth_timestamp: BigInt(Date.now() - 25 * 365 * 24 * 60 * 60 * 1000) // Now claims to be 25 years old
    };

    simulator.setCredentialSubject(fraudulentCredential);

    // This should now FAIL with "Credential subject hash mismatch" because:
    // 1. The credential ID already exists in the map (from first attempt)
    // 2. The hash of the new credential (with different birth_timestamp) doesn't match the stored hash
    expect(() => {
      simulator.increment();
    }).toThrow("Credential subject hash mismatch");

    // Verify the state hasn't changed - still 1 credential, round still 0
    const ledgerAfterSecondFailure = simulator.getLedger();
    expect(ledgerAfterSecondFailure.credentialHashes.size()).toEqual(1n);
    expect(ledgerAfterSecondFailure.round).toEqual(0n);
  });
});
