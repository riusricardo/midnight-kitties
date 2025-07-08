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

import {
  type CircuitContext,
  QueryContext,
  sampleContractAddress,
  constructorContext,
  ownPublicKey
} from "@midnight-ntwrk/compact-runtime";
import {
  Contract,
  type Ledger,
  ledger,
  CredentialSubject
} from "../managed/counter/contract/index.cjs";
import { type CounterPrivateState, witnesses } from "../witnesses.js";

// This is over-kill for such a simple contract, but the same pattern can be used to test more
// complex contracts.
export class CounterSimulator {
  readonly contract: Contract<CounterPrivateState>;
  circuitContext: CircuitContext<CounterPrivateState>;

  constructor() {
    this.contract = new Contract<CounterPrivateState>(witnesses);
    const {
      currentPrivateState,
      currentContractState,
      currentZswapLocalState
    } = this.contract.initialState(
      constructorContext({ value: 0 }, "0".repeat(64))
    );
    this.circuitContext = {
      currentPrivateState,
      currentZswapLocalState,
      originalState: currentContractState,
      transactionContext: new QueryContext(
        currentContractState.data,
        sampleContractAddress()
      )
    };
  }

  public getLedger(): Ledger {
    return ledger(this.circuitContext.transactionContext.state);
  }

  public getPrivateState(): CounterPrivateState {
    return this.circuitContext.currentPrivateState;
  }

  public setCredentialSubject(credentialSubject: CredentialSubject): void {
    // Update the private state to include the credential
    this.circuitContext.currentPrivateState = {
      ...this.circuitContext.currentPrivateState,
      CredentialSubject: credentialSubject
    };
  }

  public getUserPublicKey(): { bytes: Uint8Array } {
    // Return the user's public key from the circuit context
    const publicKey = ownPublicKey(this.circuitContext);

    // If the public key is empty (all zeros), create a test public key
    if (publicKey.bytes.every((byte) => byte === 0)) {
      return { bytes: new Uint8Array(32).fill(0) }; // Use a test public key
    }

    return publicKey;
  }

  public increment(): Ledger {
    // Update the current context to be the result of executing the circuit.
    this.circuitContext = this.contract.impureCircuits.increment(
      this.circuitContext
    ).context;
    return ledger(this.circuitContext.transactionContext.state);
  }
}
