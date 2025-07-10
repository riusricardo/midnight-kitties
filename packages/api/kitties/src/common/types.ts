/**
 * @file types.ts
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

import { Kitties, type KittiesPrivateState, type Gender, type Offer } from '@midnight-ntwrk/kitties-contract';
import type { ImpureCircuitId, MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import type { DeployedContract, FoundContract } from '@midnight-ntwrk/midnight-js-contracts';

export type KittiesContract = Kitties.Contract<KittiesPrivateState>;

export type ImpureKittiesCircuits = ImpureCircuitId<Kitties.Contract<KittiesPrivateState>>;

export const KittiesPrivateStateId = 'kittiesPrivateState';

export type KittiesProviders = MidnightProviders<
  ImpureKittiesCircuits,
  typeof KittiesPrivateStateId,
  KittiesPrivateState
>;

export type DeployedKittiesContract = DeployedContract<KittiesContract> | FoundContract<KittiesContract>;

// Re-export types from the contract
export type { Ledger, Kitty, Gender, Offer } from '@midnight-ntwrk/kitties-contract';

// Helper types for API methods
export interface KittyData {
  id: bigint;
  dna: bigint;
  gender: Gender;
  owner: { bytes: Uint8Array };
  price: bigint;
  forSale: boolean;
  generation: bigint;
}

export interface KittyListingData {
  id: bigint;
  kitty: KittyData;
}

export interface KittyOffersData {
  kittyId: bigint;
  offers: Offer[];
}

export interface TransferKittyParams {
  to: { bytes: Uint8Array };
  kittyId: bigint;
}

export interface SetPriceParams {
  kittyId: bigint;
  price: bigint;
}

export interface CreateBuyOfferParams {
  kittyId: bigint;
  bidPrice: bigint;
}

export interface BreedKittyParams {
  kittyId1: bigint;
  kittyId2: bigint;
}

export interface NFTApprovalParams {
  to: { bytes: Uint8Array };
  tokenId: bigint;
}

export interface NFTSetApprovalForAllParams {
  operator: { bytes: Uint8Array };
  approved: boolean;
}

export interface ApproveOfferParams {
  kittyId: bigint;
  buyer: { bytes: Uint8Array };
}

export interface GetOfferParams {
  kittyId: bigint;
  from: { bytes: Uint8Array };
}
