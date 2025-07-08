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

import ContractModule from "./managed/counter/contract/index.cjs";
import type { CredentialSubject } from "./managed/counter/contract/index.cjs";

export const pureCircuits = ContractModule.pureCircuits;
export * as Counter from "./managed/counter/contract/index.cjs";

export * from "./witnesses.js";
export type { CounterPrivateState } from "./witnesses.js";
export { witnesses } from "./witnesses.js";
export { createCounterPrivateState } from "./witnesses.js";
// Re-export the types explicitly
export type { CredentialSubject };
