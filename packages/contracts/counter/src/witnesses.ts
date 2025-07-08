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
  Contract as ContractType,
  Ledger,
  CredentialSubject,
  Witnesses
} from "./managed/counter/contract/index.cjs";

import { WitnessContext } from "@midnight-ntwrk/compact-runtime";

// Declare console and TextDecoder for browser environment
// declare const console: {
//   log: (..._data: any[]) => void;
// };
// declare const TextDecoder: {
//   new (encoding?: string): {
//     decode(_input?: Uint8Array): string;
//   };
// };

export type Contract<T, W extends Witnesses<T> = Witnesses<T>> = ContractType<
  T,
  W
>;

// This is how we type an empty object.
export type CounterPrivateState = {
  value: number;
  readonly CredentialSubject?: CredentialSubject;
};

export function createCounterPrivateState(): CounterPrivateState {
  return {
    value: 0,
    CredentialSubject: {
      id: new Uint8Array(32).fill(0),
      first_name: new Uint8Array(32).fill(0),
      last_name: new Uint8Array(32).fill(0),
      birth_timestamp: 0n
    }
  };
}

export const witnesses = {
  get_identity: ({
    privateState
  }: WitnessContext<Ledger, CounterPrivateState>): [
    CounterPrivateState,
    CredentialSubject
  ] => {
    if (privateState.CredentialSubject) {
      return [privateState, privateState.CredentialSubject];
    } else {
      throw new Error("No identity found");
    }
  },
  get_current_time: ({
    privateState
  }: WitnessContext<any, CounterPrivateState>): [
    CounterPrivateState,
    bigint
  ] => {
    const currentTime = BigInt(Date.now());
    return [privateState, currentTime];
  }
};
