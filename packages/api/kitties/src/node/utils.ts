import { getZswapNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { parseCoinPublicKeyToHex, parseEncPublicKeyToHex } from '@midnight-ntwrk/midnight-js-utils';
import { ShieldedAddress, MidnightBech32m } from '@midnight-ntwrk/wallet-sdk-address-format';
import { parseAddress } from '../common/utils.js';
/**
 * Safe wrapper for parseAddress to handle potential errors
 * @param input - The input string to parse
 * @returns The parsed address or throws an error
 */
export function safeParseAddress(input: string): Uint8Array {
  if (!input || typeof input !== 'string') {
    throw new Error('Input must be a non-empty string');
  }
  try {
    const result = convertWalletPublicKeyToBytes(input);
    return result;
  } catch (error) {
    throw new Error(`Invalid address format: ${input}. Please enter a valid address.`);
  }
}

// Helper function to convert wallet public key to bytes format
// This handles the conversion from Bech32m format (or other formats) to the 32-byte format expected by the contract
export function convertWalletPublicKeyToBytes(input: unknown): Uint8Array {
  // Validate input is a string
  if (typeof input !== 'string' || !input.trim()) {
    throw new Error('Input must be a non-empty string');
  }

  const inputStr = input.trim();

  try {
    // First, try to parse as a coin public key (shield-cpk format)
    if (inputStr.includes('shield-cpk')) {
      const hexKey = parseCoinPublicKeyToHex(inputStr, getZswapNetworkId());
      return parseAddress(hexKey);
    }
    // If it's a shield-addr format, extract the coin public key from the shielded address
    else if (inputStr.includes('shield-addr')) {
      const bech32 = MidnightBech32m.parse(inputStr);
      // Extract network from the bech32 address
      const networkContext = bech32.network;
      const shieldedAddress = ShieldedAddress.codec.decode(networkContext, bech32);
      // Get the coin public key string and parse it to hex
      const coinPublicKeyStr = shieldedAddress.coinPublicKeyString();
      const hexKey = parseCoinPublicKeyToHex(coinPublicKeyStr, getZswapNetworkId());
      return parseAddress(hexKey);
    }
    // If it's already a hex string, parse it directly
    else {
      return parseAddress(inputStr);
    }
  } catch (error) {
    console.error('Failed to parse address:', error);
    throw new Error(
      `Unable to parse address: ${input}. Please provide either a shield-cpk (coin public key), shield-addr (wallet address), or hex format.`,
    );
  }
}

