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
import { setLogger, KittiesAPI } from '@repo/kitties-api';
import {
  formatDNA,
  formatGenderEnum,
  formatAddress,
  formatGeneration,
  formatForSale,
  formatPrice,
  formatContractAddress,
  formatCount,
  safeParseBigInt,
  convertWalletPublicKeyToBytes,
  contractConfig,
} from '@repo/kitties-api';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';

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
  1. Create a new kitty
  2. View my kitties
  3. View kitties for sale
  4. Transfer a kitty
  5. Set kitty price
  6. Create buy offer
  7. Breed kitties
  8. View kitty details
  9. View contract stats
  10. View offers
  11. Approve offer
  12. NFT Operations
  13. Exit
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

// Kitty operations
const createKitty = async (kittiesApi: KittiesAPI): Promise<void> => {
  try {
    logger.info('Creating a new kitty...');
    await kittiesApi.createKitty();
    logger.info('✅ Kitty created successfully!');
  } catch (error) {
    logger.error(`Failed to create kitty: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const viewMyKitties = async (kittiesApi: KittiesAPI): Promise<void> => {
  try {
    logger.info('Fetching your kitties...');
    const kitties = await kittiesApi.getMyKitties();

    if (kitties.length === 0) {
      logger.info("You don't own any kitties yet.");
      return;
    }

    logger.info(`\n=== Your Kitties (${kitties.length}) ===`);
    for (const kitty of kitties) {
      logger.info(`Kitty #${kitty.id}:`);
      logger.info(`  DNA: ${formatDNA(kitty.dna)}`);
      logger.info(`  Gender: ${formatGenderEnum(kitty.gender)}`);
      logger.info(`  Generation: ${formatGeneration(kitty.generation)}`);
      logger.info(`  Price: ${formatPrice(kitty.price)}`);
      logger.info(`  For Sale: ${formatForSale(kitty.forSale)}`);
      logger.info('');
    }
  } catch (error) {
    logger.error(`Failed to fetch your kitties: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const viewKittiesForSale = async (kittiesApi: KittiesAPI): Promise<void> => {
  try {
    logger.info('Fetching kitties for sale...');
    const forSaleKitties = await kittiesApi.getKittiesForSale();

    if (forSaleKitties.length === 0) {
      logger.info('No kitties are currently for sale.');
      return;
    }

    logger.info(`\n=== Kitties for Sale (${forSaleKitties.length}) ===`);
    for (const listing of forSaleKitties) {
      const kitty = listing.kitty;
      logger.info(`Kitty #${kitty.id}:`);
      logger.info(`  DNA: ${formatDNA(kitty.dna)}`);
      logger.info(`  Gender: ${formatGenderEnum(kitty.gender)}`);
      logger.info(`  Generation: ${formatGeneration(kitty.generation)}`);
      logger.info(`  Price: ${formatPrice(kitty.price)}`);
      logger.info(`  Owner: ${formatAddress(kitty.owner.bytes)}`);
      logger.info('');
    }
  } catch (error) {
    logger.error(`Failed to fetch kitties for sale: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const transferKitty = async (kittiesApi: KittiesAPI, rli: Interface): Promise<void> => {
  try {
    const kittyIdStr = await rli.question('Enter the kitty ID to transfer: ');
    const kittyId = safeParseBigInt(kittyIdStr);

    const toAddressStr = await rli.question('Enter the recipient address: ');
    const toAddress = safeParseAddress(toAddressStr);

    logger.info(`Transferring kitty #${kittyId} to ${formatAddress(toAddress)}...`);
    await kittiesApi.transferKitty({ to: { bytes: toAddress }, kittyId });
    logger.info('✅ Kitty transferred successfully!');
  } catch (error) {
    logger.error(`Failed to transfer kitty: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const setKittyPrice = async (kittiesApi: KittiesAPI, rli: Interface): Promise<void> => {
  try {
    const kittyIdStr = await rli.question('Enter the kitty ID to set price for: ');
    const kittyId = safeParseBigInt(kittyIdStr);

    const priceStr = await rli.question('Enter the price (0 to remove from sale): ');
    const price = safeParseBigInt(priceStr);

    logger.info(`Setting price for kitty #${kittyId} to ${formatPrice(price)}...`);
    await kittiesApi.setPrice({ kittyId, price });
    logger.info('✅ Price set successfully!');
  } catch (error) {
    logger.error(`Failed to set price: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const createBuyOffer = async (kittiesApi: KittiesAPI, rli: Interface): Promise<void> => {
  try {
    const kittyIdStr = await rli.question('Enter the kitty ID to create offer for: ');
    const kittyId = safeParseBigInt(kittyIdStr);

    const bidPriceStr = await rli.question('Enter your bid price: ');
    const bidPrice = safeParseBigInt(bidPriceStr);

    logger.info(`Creating buy offer for kitty #${kittyId} with bid price ${formatPrice(bidPrice)}...`);
    await kittiesApi.createBuyOffer({ kittyId, bidPrice });
    logger.info('✅ Buy offer created successfully!');
  } catch (error) {
    logger.error(`Failed to create buy offer: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const breedKitties = async (kittiesApi: KittiesAPI, rli: Interface): Promise<void> => {
  try {
    const kittyId1Str = await rli.question('Enter the first kitty ID: ');
    const kittyId1 = safeParseBigInt(kittyId1Str);

    const kittyId2Str = await rli.question('Enter the second kitty ID: ');
    const kittyId2 = safeParseBigInt(kittyId2Str);

    logger.info(`Breeding kitties #${kittyId1} and #${kittyId2}...`);
    await kittiesApi.breedKitty({ kittyId1, kittyId2 });
    logger.info('✅ Kitties bred successfully!');
  } catch (error) {
    logger.error(`Failed to breed kitties: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const viewKittyDetails = async (kittiesApi: KittiesAPI, rli: Interface): Promise<void> => {
  try {
    const kittyIdStr = await rli.question('Enter the kitty ID to view: ');
    const kittyId = safeParseBigInt(kittyIdStr);

    logger.info(`Fetching details for kitty #${kittyId}...`);
    const kitty = await kittiesApi.getKitty(kittyId);

    logger.info(`\n=== Kitty #${kitty.id} Details ===`);
    logger.info(`DNA: ${formatDNA(kitty.dna)}`);
    logger.info(`Gender: ${formatGenderEnum(kitty.gender)}`);
    logger.info(`Generation: ${formatGeneration(kitty.generation)}`);
    logger.info(`Price: ${formatPrice(kitty.price)}`);
    logger.info(`For Sale: ${formatForSale(kitty.forSale)}`);
    logger.info(`Owner: ${formatAddress(kitty.owner.bytes)}`);
  } catch (error) {
    logger.error(`Failed to fetch kitty details: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const viewContractStats = async (kittiesApi: KittiesAPI): Promise<void> => {
  try {
    logger.info('Fetching contract statistics...');
    const totalKitties = await kittiesApi.getAllKittiesCount();
    const contractAddress = kittiesApi.deployedContractAddress;

    logger.info(`\n=== Contract Statistics ===`);
    logger.info(`Contract Address: ${formatContractAddress(contractAddress)}`);
    logger.info(`Total Kitties: ${formatCount(totalKitties)}`);
  } catch (error) {
    logger.error(`Failed to fetch contract stats: ${error instanceof Error ? error.message : String(error)}`);
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

  // Show initial contract stats
  try {
    await viewContractStats(kittiesApi);
  } catch {
    logger.debug('Could not fetch initial contract stats');
  }

  while (true) {
    // while loop for CLI menu
    const choice = await rli.question(MAIN_LOOP_QUESTION);
    switch (choice) {
      case '1':
        await createKitty(kittiesApi);
        break;
      case '2':
        await viewMyKitties(kittiesApi);
        break;
      case '3':
        await viewKittiesForSale(kittiesApi);
        break;
      case '4':
        await transferKitty(kittiesApi, rli);
        break;
      case '5':
        await setKittyPrice(kittiesApi, rli);
        break;
      case '6':
        await createBuyOffer(kittiesApi, rli);
        break;
      case '7':
        await breedKitties(kittiesApi, rli);
        break;
      case '8':
        await viewKittyDetails(kittiesApi, rli);
        break;
      case '9':
        await viewContractStats(kittiesApi);
        break;
      case '10':
        await viewOffers(kittiesApi, rli);
        break;
      case '11':
        await approveOffer(kittiesApi, rli);
        break;
      case '12':
        await nftOperations(kittiesApi, rli);
        break;
      case '13':
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

// NFT Operations
const NFT_OPERATIONS_QUESTION = `
NFT Operations:
  1. Check balance of an address
  2. Check owner of a token
  3. Approve address for a token
  4. Check approved address for a token
  5. Set approval for all tokens
  6. Check if address is approved for all
  7. Transfer token (direct)
  8. Transfer token from address
  9. Back to main menu
Which would you like to do? `;

const nftOperations = async (kittiesApi: KittiesAPI, rli: Interface): Promise<void> => {
  while (true) {
    const choice = await rli.question(NFT_OPERATIONS_QUESTION);
    switch (choice) {
      case '1':
        await checkBalance(kittiesApi, rli);
        break;
      case '2':
        await checkOwner(kittiesApi, rli);
        break;
      case '3':
        await approveToken(kittiesApi, rli);
        break;
      case '4':
        await checkApproved(kittiesApi, rli);
        break;
      case '5':
        await setApprovalForAll(kittiesApi, rli);
        break;
      case '6':
        await checkApprovedForAll(kittiesApi, rli);
        break;
      case '7':
        await transferToken(kittiesApi, rli);
        break;
      case '8':
        await transferTokenFrom(kittiesApi, rli);
        break;
      case '9':
        logger.info('Returning to main menu...');
        return;
      default:
        logger.error(`Invalid choice: ${choice}`);
    }
  }
};

const checkBalance = async (kittiesApi: KittiesAPI, rli: Interface): Promise<void> => {
  try {
    const addressStr = await rli.question('Enter the address to check balance for: ');
    const address = safeParseAddress(addressStr);

    const balance = await kittiesApi.balanceOf({ bytes: address });
    logger.info(`Address ${address} has ${formatCount(balance)} kitties`);
  } catch (error) {
    logger.error(`Failed to check balance: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const checkOwner = async (kittiesApi: KittiesAPI, rli: Interface): Promise<void> => {
  try {
    const tokenIdStr = await rli.question('Enter the token ID to check owner for: ');
    const tokenId = safeParseBigInt(tokenIdStr);

    const owner = await kittiesApi.ownerOf(tokenId);
    logger.info(`Token ${tokenId} is owned by: ${formatAddress(owner.bytes)}`);
  } catch (error) {
    logger.error(`Failed to check owner: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const approveToken = async (kittiesApi: KittiesAPI, rli: Interface): Promise<void> => {
  try {
    const toAddressStr = await rli.question('Enter the address to approve: ');
    const toAddress = safeParseAddress(toAddressStr);

    const tokenIdStr = await rli.question('Enter the token ID to approve: ');
    const tokenId = safeParseBigInt(tokenIdStr);

    logger.info(`Approving ${toAddress} for token ${tokenId}...`);
    await kittiesApi.approve({ to: { bytes: toAddress }, tokenId });
    logger.info('✅ Token approved successfully!');
  } catch (error) {
    logger.error(`Failed to approve token: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const checkApproved = async (kittiesApi: KittiesAPI, rli: Interface): Promise<void> => {
  try {
    const tokenIdStr = await rli.question('Enter the token ID to check approved address for: ');
    const tokenId = safeParseBigInt(tokenIdStr);

    const approved = await kittiesApi.getApproved(tokenId);
    logger.info(`Token ${tokenId} is approved for: ${formatAddress(approved.bytes)}`);
  } catch (error) {
    logger.error(`Failed to check approved address: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const setApprovalForAll = async (kittiesApi: KittiesAPI, rli: Interface): Promise<void> => {
  try {
    const operatorAddressStr = await rli.question('Enter the operator address: ');
    const operatorAddress = safeParseAddress(operatorAddressStr);

    const approvedStr = await rli.question('Approve? (y/n): ');
    const approved = approvedStr.toLowerCase() === 'y' || approvedStr.toLowerCase() === 'yes';

    logger.info(`Setting approval for all tokens - operator: ${operatorAddress}, approved: ${approved}...`);
    await kittiesApi.setApprovalForAll({ operator: { bytes: operatorAddress }, approved });
    logger.info('✅ Approval for all tokens set successfully!');
  } catch (error) {
    logger.error(`Failed to set approval for all: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const checkApprovedForAll = async (kittiesApi: KittiesAPI, rli: Interface): Promise<void> => {
  try {
    const ownerAddressStr = await rli.question('Enter the owner address: ');
    const ownerAddress = safeParseAddress(ownerAddressStr);

    const operatorAddressStr = await rli.question('Enter the operator address: ');
    const operatorAddress = safeParseAddress(operatorAddressStr);

    const isApproved = await kittiesApi.isApprovedForAll({ bytes: ownerAddress }, { bytes: operatorAddress });
    logger.info(
      `Operator ${operatorAddress} is ${isApproved ? 'approved' : 'not approved'} for all tokens of ${ownerAddress}`,
    );
  } catch (error) {
    logger.error(`Failed to check approval for all: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const transferToken = async (kittiesApi: KittiesAPI, rli: Interface): Promise<void> => {
  try {
    const toAddressStr = await rli.question('Enter the recipient address: ');
    const toAddress = safeParseAddress(toAddressStr);

    const tokenIdStr = await rli.question('Enter the token ID to transfer: ');
    const tokenId = safeParseBigInt(tokenIdStr);

    logger.info(`Transferring token ${tokenId} to ${toAddress}...`);
    await kittiesApi.transfer({ to: { bytes: toAddress }, tokenId });
    logger.info('✅ Token transferred successfully!');
  } catch (error) {
    logger.error(`Failed to transfer token: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const transferTokenFrom = async (kittiesApi: KittiesAPI, rli: Interface): Promise<void> => {
  try {
    const fromAddressStr = await rli.question('Enter the sender address: ');
    const fromAddress = safeParseAddress(fromAddressStr);

    const toAddressStr = await rli.question('Enter the recipient address: ');
    const toAddress = safeParseAddress(toAddressStr);

    const tokenIdStr = await rli.question('Enter the token ID to transfer: ');
    const tokenId = safeParseBigInt(tokenIdStr);

    logger.info(`Transferring token ${tokenId} from ${fromAddress} to ${toAddress}...`);
    await kittiesApi.transferFrom({ from: { bytes: fromAddress }, to: { bytes: toAddress }, tokenId });
    logger.info('✅ Token transferred successfully!');
  } catch (error) {
    logger.error(`Failed to transfer token: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const viewOffers = async (kittiesApi: KittiesAPI, rli: Interface): Promise<void> => {
  try {
    const kittyIdStr = await rli.question('Enter the kitty ID to view offers for: ');
    const kittyId = safeParseBigInt(kittyIdStr);

    const fromAddressStr = await rli.question('Enter the buyer address to check offer from: ');
    const fromAddress = safeParseAddress(fromAddressStr);

    // Add validation
    if (fromAddress.length !== 32) {
      logger.error(`Invalid address length: expected 32 bytes, got ${fromAddress.length} bytes`);
      logger.error(`Address bytes: ${Array.from(fromAddress).join(',')}`);
      return;
    }

    // First check if the kitty exists
    try {
      await kittiesApi.getKitty(kittyId);
    } catch {
      logger.error(`Kitty #${kittyId} does not exist or cannot be accessed`);
      return;
    }

    logger.info(`Fetching offer for kitty #${kittyId} from ${formatAddress(fromAddress)}...`);

    // @ts-ignore - Method exists but may not be in current type definitions
    const offer = await kittiesApi.getOffer({ kittyId, from: { bytes: fromAddress } });

    if (!offer) {
      logger.info(`No offer found for kitty #${kittyId} from ${formatAddress(fromAddress)}`);
      return;
    }

    logger.info(`\n=== Offer Details ===`);
    logger.info(`Kitty ID: ${offer.kittyId}`);
    logger.info(`Buyer: ${formatAddress(offer.buyer.bytes)}`);
    logger.info(`Price: ${formatPrice(offer.price)}`);
  } catch (error) {
    logger.error(`Failed to fetch offer: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.message === 'Unexpected length of input') {
      logger.error('This error often indicates an issue with address parsing or format.');
      logger.error('Please ensure you are using a valid wallet address.');
    }
  }
};

const approveOffer = async (kittiesApi: KittiesAPI, rli: Interface): Promise<void> => {
  try {
    const kittyIdStr = await rli.question('Enter the kitty ID to approve offer for: ');
    const kittyId = safeParseBigInt(kittyIdStr);

    const buyerAddressStr = await rli.question('Enter the buyer address: ');
    const buyerAddress = safeParseAddress(buyerAddressStr);

    // Add validation
    if (buyerAddress.length !== 32) {
      logger.error(`Invalid address length: expected 32 bytes, got ${buyerAddress.length} bytes`);
      logger.error(`Address bytes: ${Array.from(buyerAddress).join(',')}`);
      return;
    }

    logger.info(`Approving offer for kitty #${kittyId} from ${formatAddress(buyerAddress)}...`);

    // @ts-ignore - Method exists but may not be in current type definitions
    await kittiesApi.approveOffer({ kittyId, buyer: { bytes: buyerAddress } });
    logger.info('✅ Offer approved successfully!');
  } catch (error) {
    logger.error(`Failed to approve offer: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.message === 'Unexpected length of input') {
      logger.error('This error often indicates an issue with address parsing or format.');
      logger.error('Please ensure you are using a valid wallet address.');
    }
  }
};

// Helper function to parse addresss for CLI input
const safeParseAddress = (input: string): Uint8Array => {
  if (!input || typeof input !== 'string') {
    throw new Error('Input must be a non-empty string');
  }
  try {
    logger.debug(`Parsing address input: ${input}`);
    const result = convertWalletPublicKeyToBytes(input);
    logger.debug(`Parsed address result: ${result.length} bytes - ${Array.from(result).join(',')}`);
    return result;
  } catch (error) {
    logger.error(`Address parsing failed for input: ${input}`);
    logger.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    throw new Error(`Invalid address format: ${input}. Please enter a valid address.`);
  }
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
      const providers = await configureProviders(wallet, config, new NodeZkConfigProvider(contractConfig.zkConfigPath));
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
