/**
 * @file index.ts
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

export { default as App } from './App.js';
export * from './KittiesReader.js';
export * from './KittyCard.js';
export * from './MyKittiesGallery.js';
export * from './MidnightWallet.js';
export * from './WalletWidget.js';

// Re-export browser utilities that were moved to @repo/kitties-api/browser
export {
  connectToWallet,
  WrappedPublicDataProvider,
  WrappedPrivateStateProvider,
  retryWithBackoff,
} from '@repo/kitties-api/browser';
