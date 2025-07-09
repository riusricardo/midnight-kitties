/**
 * @file cli.ts
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
import { stdin as input, stdout as output } from 'node:process';
import { createInterface, type Interface } from 'node:readline/promises';
import { type Logger } from 'pino';
import { type StartedDockerComposeEnvironment, type DockerComposeEnvironment } from 'testcontainers';
import {
  type KittiesProviders,
  type Config,
  StandaloneConfig,
  buildWalletAndWaitForFunds,
  buildFreshWallet,
  configureProviders,
} from '@repo/kitties-api/node-api';
import { setLogger, KittiesAPI } from '@repo/kitties-api/common-api';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { contractConfig } from '@repo/kitties-api';
import type { CredentialSubject } from '@midnight-ntwrk/kitties-contract';

let logger: Logger;

/**
 * This seed gives access to tokens minted in the genesis block of a local development node - only
 * used in standalone networks to build a wallet with initial funds.
 */
const GENESIS_MINT_WALLET_SEED = '0000000000000000000000000000000000000000000000000000000000000001';

const DEPLOY_OR_JOIN_QUESTION = `
You can do one of the following:
  1. Deploy a new kitties contract
  2. Join an existing kitties contract
  3. Exit
Which would you like to do? `;

const MAIN_LOOP_QUESTION = `
You can do one of the following:
  1. Increment
  2. Display current kitties value
  3. Set/Update credential information
  4. Check verification status
  5. Exit
Which would you like to do? `;

const join = async (providers: KittiesProviders, rli: Interface): Promise<KittiesAPI | null> => {
  try {
    const contractAddress = await rli.question('What is the contract address (in hex)? ');
    return await KittiesAPI.connect(providers, contractAddress);
  } catch (error) {
    logger.error(`Failed to connect to contract: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
};

// Helper function to convert string to Uint8Array with padding
const stringToUint8Array = (str: string, length: number = 32): Uint8Array => {
  const utf8Bytes = Buffer.from(str, 'utf8');

  if (utf8Bytes.length > length) {
    throw new Error(`String "${str}" is too long. Maximum length is ${length} bytes.`);
  }

  const paddedArray = new Uint8Array(length);
  paddedArray.set(utf8Bytes);
  return paddedArray;
};

// Helper function to convert hex string to Uint8Array with padding
const hexToUint8Array = (hexString: string, length: number = 32): Uint8Array => {
  // Remove '0x' prefix if present
  const cleanHex = hexString.startsWith('0x') ? hexString.slice(2) : hexString;

  // Convert hex to bytes
  const bytes = new Uint8Array(Math.ceil(cleanHex.length / 2));
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
  }

  // Pad or truncate to the desired length
  const paddedArray = new Uint8Array(length);
  paddedArray.set(bytes.slice(0, length));
  return paddedArray;
};

// Helper function to get wallet public key from providers
const getWalletPublicKey = async (providers: KittiesProviders): Promise<string> => {
  try {
    // Access the coin public key from the wallet provider
    const coinPublicKey = providers.walletProvider.coinPublicKey;

    // Handle string case
    if (typeof coinPublicKey === 'string') {
      return coinPublicKey;
    }

    // Handle object case - use type assertion to bypass strict typing
    if (coinPublicKey && typeof coinPublicKey === 'object') {
      // Try to convert to string using various methods
      try {
        // Type assertion with proper type checking
        const publicKeyObj = coinPublicKey as { toString?: () => string };
        if (typeof publicKeyObj.toString === 'function') {
          return String(publicKeyObj.toString());
        }
        // If toString fails, try JSON serialization
        return JSON.stringify(coinPublicKey);
      } catch {
        // If toString fails, try JSON serialization
        return JSON.stringify(coinPublicKey);
      }
    }

    // Fallback: use a deterministic approach based on wallet address
    return '0000000000000000000000000000000000000000000000000000000000000000';
  } catch {
    logger.warn('Could not retrieve wallet public key, using fallback method');
    // Fallback: use a deterministic approach based on wallet address
    return '0000000000000000000000000000000000000000000000000000000000000000';
  }
};

const setCredentials = async (kittiesApi: KittiesAPI, providers: KittiesProviders, rli: Interface): Promise<void> => {
  try {
    logger.info('\n=== Setting Credential Information ===');
    logger.info('Note: You must be at least 21 years old to increment the kitties.');

    // Get user input for credentials
    const firstName = await rli.question('Enter your first name: ');
    const lastName = await rli.question('Enter your last name: ');
    const birthYear = await rli.question('Enter your birth year (YYYY): ');
    const birthMonth = await rli.question('Enter your birth month (1-12): ');
    const birthDay = await rli.question('Enter your birth day (1-31): ');

    // Validate birth date
    const birthDate = new Date(parseInt(birthYear), parseInt(birthMonth) - 1, parseInt(birthDay));
    if (isNaN(birthDate.getTime())) {
      logger.error('Invalid birth date provided');
      return;
    }

    const birthTimestamp = BigInt(birthDate.getTime());
    const currentTime = BigInt(Date.now());
    const twentyOneYearsInMs = BigInt(21 * 365 * 24 * 60 * 60 * 1000);

    if (currentTime - birthTimestamp < twentyOneYearsInMs) {
      logger.warn('Warning: You must be at least 21 years old to increment the kitties.');
    }

    // Get wallet public key for credential ID
    const walletPublicKey = await getWalletPublicKey(providers);

    // Create credential subject with proper formatting
    const credentialSubject = {
      id: hexToUint8Array(walletPublicKey, 32),
      first_name: stringToUint8Array(firstName, 32),
      last_name: stringToUint8Array(lastName, 32),
      birth_timestamp: birthTimestamp,
    };

    logger.info('Updating credential information...');
    await kittiesApi.updateCredentialSubject(credentialSubject);
    logger.info('Credential information updated successfully!');

    // Check verification status
    const isVerified = await kittiesApi.isUserVerified();
    if (isVerified) {
      logger.info('✅ You are verified and can increment the kitties.');
    } else {
      logger.warn('❌ You are not verified. Make sure you are at least 21 years old.');
    }
  } catch (error) {
    logger.error(`Failed to set credentials: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const checkVerificationStatus = async (kittiesApi: KittiesAPI): Promise<void> => {
  try {
    const isVerified = await kittiesApi.isUserVerified();
    const credentialSubject = (await kittiesApi.getCredentialSubject()) as CredentialSubject | null;

    if (credentialSubject) {
      const firstName = Buffer.from(credentialSubject.first_name).toString('utf8').replace(/\0/g, '');
      const lastName = Buffer.from(credentialSubject.last_name).toString('utf8').replace(/\0/g, '');
      const birthDate = new Date(Number(credentialSubject.birth_timestamp));

      logger.info('\n=== Current Credential Information ===');
      logger.info(`Name: ${firstName} ${lastName}`);
      logger.info(`Birth Date: ${birthDate.toDateString()}`);
      logger.info(`Verification Status: ${isVerified ? '✅ Verified' : '❌ Not Verified'}`);

      if (!isVerified) {
        const currentTime = BigInt(Date.now());
        const ageInMs = currentTime - credentialSubject.birth_timestamp;
        const ageInYears = Number(ageInMs / BigInt(365 * 24 * 60 * 60 * 1000));

        logger.info(`Current Age: ~${ageInYears} years`);
        logger.info('Note: You must be at least 21 years old to increment the kitties.');
      }
    } else {
      logger.info('\n=== Verification Status ===');
      logger.info('❌ No credential information found.');
      logger.info('Please set your credential information first (option 3).');
    }
  } catch (error) {
    logger.error(`Failed to check verification status: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const deployOrJoin = async (providers: KittiesProviders, rli: Interface): Promise<KittiesAPI | null> => {
  while (true) {
    // while loop for CLI menu
    const choice = await rli.question(DEPLOY_OR_JOIN_QUESTION);
    switch (choice) {
      case '1':
        try {
          return await KittiesAPI.deploy(providers, { value: 0 });
        } catch (error) {
          logger.error(`Failed to deploy: ${error instanceof Error ? error.message : String(error)}`);
          return null;
        }
      case '2':
        return await join(providers, rli);
      case '3':
        logger.info('Exiting...');
        return null;
      default:
        logger.error(`Invalid choice: ${choice}`);
    }
  }
};

const mainLoop = async (providers: KittiesProviders, rli: Interface): Promise<void> => {
  const kittiesApi = await deployOrJoin(providers, rli);
  if (kittiesApi === null) {
    return;
  }

  // Show initial verification status
  try {
    await checkVerificationStatus(kittiesApi);
  } catch {
    logger.debug('Could not check initial verification status');
  }

  while (true) {
    // while loop for CLI menu
    const choice = await rli.question(MAIN_LOOP_QUESTION);
    switch (choice) {
      case '1':
        try {
          // Check if user is verified before attempting increment
          const isVerified = await kittiesApi.isUserVerified();
          if (!isVerified) {
            logger.warn('❌ Cannot increment: You must set valid credentials first (option 3)');
            logger.warn('You must be at least 21 years old to increment the kitties.');
            break;
          }

          await KittiesAPI.incrementWithTxInfo(kittiesApi);
          logger.info('✅ Kitties incremented successfully!');
        } catch (error) {
          if (error instanceof Error) {
            if (error.message.includes('Identity ID cannot be empty')) {
              logger.error('❌ Please set your credential information first (option 3)');
            } else if (error.message.includes('Credential subject hash mismatch')) {
              logger.error('❌ Credential verification failed. Please check your credential information.');
            } else {
              logger.error(`❌ Failed to increment: ${error.message}`);
            }
          } else {
            logger.error('❌ Failed to increment kitties');
          }
        }
        break;
      case '2':
        try {
          const kittiesInfo = await KittiesAPI.getKittiesInfo(kittiesApi);
          logger.info(`\n=== Kitties Information ===`);
          logger.info(`Contract Address: ${kittiesInfo.contractAddress}`);
          logger.info(`Current Value: ${kittiesInfo.kittiesValue}`);
        } catch (error) {
          logger.error(`Failed to get kitties info: ${error instanceof Error ? error.message : String(error)}`);
        }
        break;
      case '3':
        await setCredentials(kittiesApi, providers, rli);
        break;
      case '4':
        await checkVerificationStatus(kittiesApi);
        break;
      case '5':
        logger.info('Exiting...');
        return;
      default:
        logger.error(`Invalid choice: ${choice}`);
    }
  }
};

const buildWalletFromSeed = async (config: Config, rli: Interface): Promise<(Wallet & Resource) | null> => {
  try {
    const seed = await rli.question('Enter your wallet seed: ');
    return await buildWalletAndWaitForFunds(config, seed, '');
  } catch (error) {
    logger.error(`Failed to build wallet from seed: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
};

const WALLET_LOOP_QUESTION = `
You can do one of the following:
  1. Build a fresh wallet
  2. Build wallet from a seed
  3. Exit
Which would you like to do? `;

const buildWallet = async (config: Config, rli: Interface): Promise<(Wallet & Resource) | null> => {
  if (config instanceof StandaloneConfig) {
    try {
      return await buildWalletAndWaitForFunds(config, GENESIS_MINT_WALLET_SEED, '');
    } catch (error) {
      logger.error(`Failed to build standalone wallet: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }
  while (true) {
    // while loop for CLI menu
    const choice = await rli.question(WALLET_LOOP_QUESTION);
    switch (choice) {
      case '1':
        try {
          return await buildFreshWallet(config);
        } catch (error) {
          logger.error(`Failed to build fresh wallet: ${error instanceof Error ? error.message : String(error)}`);
          return null;
        }
      case '2':
        return await buildWalletFromSeed(config, rli);
      case '3':
        logger.info('Exiting...');
        return null;
      default:
        logger.error(`Invalid choice: ${choice}`);
    }
  }
};

const mapContainerPort = (env: StartedDockerComposeEnvironment, url: string, containerName: string) => {
  const mappedUrl = new URL(url);
  const container = env.getContainer(containerName);

  mappedUrl.port = String(container.getFirstMappedPort());

  return mappedUrl.toString().replace(/\/+$/, '');
};

export const run = async (config: Config, _logger: Logger, dockerEnv?: DockerComposeEnvironment): Promise<void> => {
  logger = _logger;
  setLogger(_logger);
  const rli = createInterface({ input, output, terminal: true });
  let env;
  if (dockerEnv !== undefined) {
    env = await dockerEnv.up();

    if (config instanceof StandaloneConfig) {
      config.indexer = mapContainerPort(env, config.indexer, 'kitties-indexer');
      config.indexerWS = mapContainerPort(env, config.indexerWS, 'kitties-indexer');
      config.node = mapContainerPort(env, config.node, 'kitties-node');
      config.proofServer = mapContainerPort(env, config.proofServer, 'kitties-proof-server');
    }
  }
  const wallet = await buildWallet(config, rli);
  try {
    if (wallet !== null) {
      const providers = await configureProviders(
        wallet,
        config,
        new NodeZkConfigProvider<'increment'>(contractConfig.zkConfigPath),
      );
      await mainLoop(providers, rli);
    }
  } catch (e) {
    if (e instanceof Error) {
      logger.error(`Found error '${e.message}'`);
      logger.info('Exiting...');
      logger.debug(`${e.stack}`);
    } else {
      throw e;
    }
  } finally {
    try {
      rli.close();
      rli.removeAllListeners();
    } catch (e) {
      logger.error(`Error closing readline interface: ${e}`);
    } finally {
      try {
        if (wallet !== null) {
          await wallet.close();
        }
      } catch (e) {
        logger.error(`Error closing wallet: ${e}`);
      } finally {
        try {
          if (env !== undefined) {
            await env.down();
            logger.info('Goodbye');
          }
        } catch (e) {
          logger.error(`Error shutting down docker environment: ${e}`);
        }
      }
    }
  }
};
