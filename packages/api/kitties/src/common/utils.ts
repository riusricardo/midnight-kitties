/**
 * @file utils.ts
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
 */

import type { Gender } from '@midnight-ntwrk/kitties-contract';

/**
 * Generate random bytes for various purposes (DNA generation, etc.)
 * @param length - The number of bytes to generate
 * @returns A Uint8Array with random bytes
 */
export function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * Pad a string to a specific byte length
 * @param s - The string to pad
 * @param n - The target length in bytes
 * @returns A Uint8Array with the padded string
 */
export function pad(s: string, n: number): Uint8Array {
  const encoder = new TextEncoder();
  const utf8Bytes = encoder.encode(s);
  if (n < utf8Bytes.length) {
    throw new Error(`The padded length n must be at least ${utf8Bytes.length}`);
  }
  const paddedArray = new Uint8Array(n);
  paddedArray.set(utf8Bytes);
  return paddedArray;
}

/**
 * Convert date to Unix timestamp
 * @param year - The year
 * @param month - The month (1-12)
 * @param day - The day
 * @returns Unix timestamp as bigint
 */
export function dateToUnixTimestamp(year: number, month: number, day: number): bigint {
  const date = new Date(year, month - 1, day); // month is 0-based in JS Date
  return BigInt(Math.floor(date.getTime())); // Convert to seconds and return as bigint
}

/**
 * Convert Uint8Array to string
 * @param arr - The Uint8Array to convert
 * @returns The decoded string
 */
export function uint8ArrayToString(arr: Uint8Array): string {
  return new TextDecoder().decode(arr);
}

/**
 * Custom JSON stringify that handles bigint values
 * @param obj - The object to stringify
 * @returns JSON string with bigint values converted to strings
 */
export function customStringify(obj: any): string {
  return JSON.stringify(obj, (_, value) => (typeof value === 'bigint' ? value.toString() : value), 2);
}

/**
 * Generate a readable representation of kitty DNA
 * @param dna - The DNA as a bigint
 * @returns A hex string representation of the DNA
 */
export function formatDNA(dna: bigint): string {
  return `0x${dna.toString(16).padStart(64, '0')}`;
}

/**
 * Format a gender enum value to a readable string
 * @param gender - The gender enum value (0 = Male, 1 = Female)
 * @returns A readable gender string
 */
export function formatGender(gender: number): string {
  return gender === 0 ? 'Male' : 'Female';
}

/**
 * Convert price from bigint to a readable format
 * @param price - The price as bigint
 * @returns The price as a number (for display purposes)
 */
export function formatPrice(price: bigint): number {
  return Number(price);
}

/**
 * Check if a kitty is for sale
 * @param price - The kitty's price
 * @param forSale - The kitty's for sale status
 * @returns True if the kitty is for sale
 */
export function isKittyForSale(price: bigint, forSale: boolean): boolean {
  return forSale && price > 0n;
}

/**
 * Format a gender enum value to a readable string
 * @param gender - The gender enum value from the contract
 * @returns A readable gender string
 */
export function formatGenderEnum(gender: Gender): string {
  if (typeof gender === 'object') {
    if ('Male' in gender) return 'Male';
    if ('Female' in gender) return 'Female';
  }
  if (typeof gender === 'number') {
    return gender === 0 ? 'Male' : 'Female';
  }
  return 'Unknown';
}

/**
 * Format a Uint8Array address for display
 * @param bytes - The address bytes
 * @returns A hex string representation of the address
 * @note This currently returns hex format. In the future, this could be enhanced
 * to return Bech32 format when a reverse conversion utility becomes available.
 */
export function formatAddress(bytes: Uint8Array): string {
  // TODO: Convert to Bech32 format when reverse conversion utility is available
  // For now, return hex format for consistency
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Parse a bigint from user input string
 * @param input - The input string
 * @returns The parsed bigint
 * @throws Error if the input is not a valid number
 */
export function parseBigInt(input: string): bigint {
  try {
    return BigInt(input);
  } catch {
    throw new Error(`Invalid number: ${input}`);
  }
}

/**
 * Parse a hex address from user input
 * @param input - The input hex string (with or without 0x prefix)
 * @returns A Uint8Array representing the address
 * @throws Error if the input is not a valid hex string
 */
export function parseAddress(input: string): Uint8Array {
  try {
    if (input.length % 2 !== 0) {
      throw new Error('Invalid hex string length');
    }
    const bytes = new Uint8Array(input.length / 2);
    for (let i = 0; i < input.length; i += 2) {
      bytes[i / 2] = parseInt(input.substr(i, 2), 16);
    }
    return bytes;
  } catch {
    throw new Error(`Invalid address format: ${input}`);
  }
}

/**
 * Format a generation number for display
 * @param generation - The generation number as bigint
 * @returns The generation as a readable string
 */
export function formatGeneration(generation: bigint): string {
  return `Gen ${generation}`;
}

/**
 * Format for sale status for display
 * @param forSale - Whether the kitty is for sale
 * @returns A readable for sale status
 */
export function formatForSale(forSale: boolean): string {
  return forSale ? 'Yes' : 'No';
}

/**
 * Format a contract address for display
 * @param address - The contract address (string or other type)
 * @returns A formatted address string
 */
export function formatContractAddress(address: string | any): string {
  if (typeof address === 'string') {
    return address;
  }
  return String(address);
}

/**
 * Format a total count for display
 * @param count - The count as any type
 * @returns A formatted count string
 */
export function formatCount(count: any): string {
  return String(count);
}

/**
 * Safe wrapper for parseBigInt to handle potential errors
 * @param input - The input string to parse
 * @returns The parsed bigint or throws an error
 */
export function safeParseBigInt(input: string): bigint {
  if (!input || typeof input !== 'string') {
    throw new Error('Input must be a non-empty string');
  }
  return parseBigInt(input);
}
