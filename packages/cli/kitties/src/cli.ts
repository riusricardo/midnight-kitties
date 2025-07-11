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
import type { Offer } from '@midnight-ntwrk/kitties-contract';
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
  contractConfig,
  safeParseAddressWithWallet,
  convertWalletPublicKeyToBytes,
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
  5. Transfer a kitty from owner
  6. Set kitty price
  7. Create buy offer
  8. Breed kitties
  9. View kitty details
  10. View contract stats
  11. View all offers for a kitty
  12. Approve offer
  13. NFT Operations
  14. Exit
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

const viewMyKitties = async (kittiesApi: KittiesAPI, providers: KittiesProviders): Promise<void> => {
  try {
    logger.info('Fetching your kitties...');
    // Get the wallet's public key and convert to bytes format
    const coinPublicKey = providers.walletProvider.coinPublicKey;
    const walletBytes = convertWalletPublicKeyToBytes(coinPublicKey);
    const walletAddress = { bytes: walletBytes };

    const kitties = await kittiesApi.getMyKitties(walletAddress);

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
    const toAddress = safeParseAddressWithWallet(toAddressStr);

    logger.info(`Transferring kitty #${kittyId} to ${formatAddress(toAddress)}...`);
    await kittiesApi.transferKitty({ to: { bytes: toAddress }, kittyId });
    logger.info('✅ Kitty transferred successfully!');
  } catch (error) {
    logger.error(`Failed to transfer kitty: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const transferKittyFrom = async (kittiesApi: KittiesAPI, rli: Interface): Promise<void> => {
  try {
    const kittyIdStr = await rli.question('Enter the kitty ID to transfer: ');
    const kittyId = safeParseBigInt(kittyIdStr);

    const fromAddressStr = await rli.question('Enter the owner address: ');
    const fromAddress = safeParseAddressWithWallet(fromAddressStr);

    const toAddressStr = await rli.question('Enter the recipient address: ');
    const toAddress = safeParseAddressWithWallet(toAddressStr);

    logger.info(`Transferring kitty #${kittyId} from ${formatAddress(fromAddress)} to ${formatAddress(toAddress)}...`);
    await kittiesApi.transferKittyFrom({ from: { bytes: fromAddress }, to: { bytes: toAddress }, kittyId });
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
        await viewMyKitties(kittiesApi, providers);
        break;
      case '3':
        await viewKittiesForSale(kittiesApi);
        break;
      case '4':
        await transferKitty(kittiesApi, rli);
        break;
      case '5':
        await transferKittyFrom(kittiesApi, rli);
        break;
      case '6':
        await setKittyPrice(kittiesApi, rli);
        break;
      case '7':
        await createBuyOffer(kittiesApi, rli);
        break;
      case '8':
        await breedKitties(kittiesApi, rli);
        break;
      case '9':
        await viewKittyDetails(kittiesApi, rli);
        break;
      case '10':
        await viewContractStats(kittiesApi);
        break;
      case '11':
        await viewOffers(kittiesApi, rli);
        break;
      case '12':
        await approveOffer(kittiesApi, rli);
        break;
      case '13':
        await nftOperations(kittiesApi, rli);
        break;
      case '14':
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
  7. Back to main menu
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
    const address = safeParseAddressWithWallet(addressStr);

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
    const toAddress = safeParseAddressWithWallet(toAddressStr);

    const tokenIdStr = await rli.question('Enter the token ID to approve: ');
    const tokenId = safeParseBigInt(tokenIdStr);

    logger.info(`Approving ${formatAddress(toAddress)} for token ${tokenId}...`);
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
    const operatorAddress = safeParseAddressWithWallet(operatorAddressStr);

    const approvedStr = await rli.question('Approve? (y/n): ');
    const approved = approvedStr.toLowerCase() === 'y' || approvedStr.toLowerCase() === 'yes';

    logger.info(
      `Setting approval for all tokens - operator: ${formatAddress(operatorAddress)}, approved: ${approved}...`,
    );
    await kittiesApi.setApprovalForAll({ operator: { bytes: operatorAddress }, approved });
    logger.info('✅ Approval for all tokens set successfully!');
  } catch (error) {
    logger.error(`Failed to set approval for all: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const checkApprovedForAll = async (kittiesApi: KittiesAPI, rli: Interface): Promise<void> => {
  try {
    const ownerAddressStr = await rli.question('Enter the owner address: ');
    const ownerAddress = safeParseAddressWithWallet(ownerAddressStr);

    const operatorAddressStr = await rli.question('Enter the operator address: ');
    const operatorAddress = safeParseAddressWithWallet(operatorAddressStr);

    const isApproved = await kittiesApi.isApprovedForAll({ bytes: ownerAddress }, { bytes: operatorAddress });
    logger.info(
      `Operator ${formatAddress(operatorAddress)} is ${isApproved ? 'approved' : 'not approved'} for all tokens of ${formatAddress(ownerAddress)}`,
    );
  } catch (error) {
    logger.error(`Failed to check approval for all: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const viewOffers = async (kittiesApi: KittiesAPI, rli: Interface): Promise<void> => {
  try {
    const kittyIdStr = await rli.question('Enter the kitty ID to view offers for: ');
    const kittyId = safeParseBigInt(kittyIdStr);

    // First check if the kitty exists
    try {
      await kittiesApi.getKitty(kittyId);
    } catch {
      logger.error(`Kitty #${kittyId} does not exist or cannot be accessed`);
      return;
    }

    logger.info(`Fetching all offers for kitty #${kittyId}...`);

    // @ts-ignore - Method exists but may not be in current type definitions
    const offers: Offer[] = await kittiesApi.getOffersForKitty(kittyId);

    if (!offers || offers.length === 0) {
      logger.info(`No offers found for kitty #${kittyId}`);
      return;
    }

    logger.info(`\n=== ${offers.length} Offer(s) Found for Kitty #${kittyId} ===`);
    offers.forEach((offer: Offer, index: number) => {
      logger.info(`\n--- Offer ${index + 1} ---`);
      logger.info(`Kitty ID: ${offer.kittyId}`);
      logger.info(`Buyer: ${formatAddress(offer.buyer.bytes)}`);
      logger.info(`Price: ${formatPrice(offer.price)}`);
    });
  } catch (error) {
    logger.error(`Failed to fetch offers: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const approveOffer = async (kittiesApi: KittiesAPI, rli: Interface): Promise<void> => {
  try {
    const kittyIdStr = await rli.question('Enter the kitty ID to approve offer for: ');
    const kittyId = safeParseBigInt(kittyIdStr);

    // First check if the kitty exists
    try {
      await kittiesApi.getKitty(kittyId);
    } catch {
      logger.error(`Kitty #${kittyId} does not exist or cannot be accessed`);
      return;
    }

    logger.info(`Fetching offers for kitty #${kittyId}...`);

    // @ts-ignore - Method exists but may not be in current type definitions
    const offers: Offer[] = await kittiesApi.getOffersForKitty(kittyId);

    if (!offers || offers.length === 0) {
      logger.info(`No offers found for kitty #${kittyId}`);
      return;
    }

    // Display all offers
    logger.info(`\n=== ${offers.length} Offer(s) Found for Kitty #${kittyId} ===`);
    offers.forEach((offer: Offer, index: number) => {
      logger.info(`\n--- Offer ${index + 1} ---`);
      logger.info(`Buyer: ${formatAddress(offer.buyer.bytes)}`);
      logger.info(`Price: ${formatPrice(offer.price)}`);
    });

    if (offers.length === 1) {
      // If only one offer, ask for confirmation
      const confirm = await rli.question(
        `\nApprove the offer from ${formatAddress(offers[0].buyer.bytes)} for ${formatPrice(offers[0].price)}? (y/n): `,
      );
      if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
        logger.info('Offer approval cancelled');
        return;
      }

      logger.info(`Approving offer for kitty #${kittyId} from ${formatAddress(offers[0].buyer.bytes)}...`);
      // @ts-ignore - Method exists but may not be in current type definitions
      await kittiesApi.approveOffer({ kittyId, buyer: offers[0].buyer });
      logger.info('✅ Offer approved successfully!');
    } else {
      // Multiple offers, let user choose
      const choiceStr = await rli.question(`\nWhich offer would you like to approve? (1-${offers.length}): `);
      const choice = parseInt(choiceStr, 10);

      if (isNaN(choice) || choice < 1 || choice > offers.length) {
        logger.error(`Invalid choice. Please enter a number between 1 and ${offers.length}`);
        return;
      }

      const selectedOffer = offers[choice - 1];
      logger.info(
        `Approving offer ${choice} for kitty #${kittyId} from ${formatAddress(selectedOffer.buyer.bytes)}...`,
      );
      // @ts-ignore - Method exists but may not be in current type definitions
      await kittiesApi.approveOffer({ kittyId, buyer: selectedOffer.buyer });
      logger.info('✅ Offer approved successfully!');
    }
  } catch (error) {
    logger.error(`Failed to approve offer: ${error instanceof Error ? error.message : String(error)}`);
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
