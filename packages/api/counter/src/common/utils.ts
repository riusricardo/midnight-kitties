// Utility functions for API usage

import { type CredentialSubject, pureCircuits } from '@midnight-ntwrk/counter-contract';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';

export function hashSubject(subject_birth: bigint): string {
  return toHex(pureCircuits.subject_hash(subject_birth));
}

export function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

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

export function dateToUnixTimestamp(year: number, month: number, day: number): bigint {
  const date = new Date(year, month - 1, day); // month is 0-based in JS Date
  return BigInt(Math.floor(date.getTime())); // Convert to seconds and return as bigint
}

export function uint8ArrayToString(arr: Uint8Array): string {
  return new TextDecoder().decode(arr);
}

export function customStringify(obj: any): string {
  return JSON.stringify(obj, (_, value) => (typeof value === 'bigint' ? value.toString() : value), 2);
}
