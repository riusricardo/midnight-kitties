/**
 * @file private-state-provider.ts
 * @license GPL-3.0
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

import { type SigningKey } from '@midnight-ntwrk/compact-runtime';
import type { Logger } from 'pino';

// Remove broken import
// import { type PrivateStateSchema } from '@midnight-ntwrk/midnight-js-types/dist/private-state-provider';

// Use minimal typing for compatibility with the rest of the codebase
export class WrappedPrivateStateProvider {
  constructor(
    private readonly privateDataProvider: any,
    private readonly logger: Logger,
  ) {}

  set(key: string, _state: unknown): Promise<void> {
    this.logger.trace(`Setting private state for key: ${key}`);
    // @ts-ignore
    return this.privateDataProvider.set(key, _state);
  }

  get(key: string): Promise<unknown | null> {
    this.logger.trace(`Getting private state for key: ${key}`);
    // @ts-ignore
    return this.privateDataProvider.get(key);
  }

  remove(key: string): Promise<void> {
    this.logger.trace(`Removing private state for key: ${key}`);
    // @ts-ignore
    return this.privateDataProvider.remove(key);
  }

  clear(): Promise<void> {
    this.logger.trace('Clearing private state');
    // @ts-ignore
    return this.privateDataProvider.clear();
  }

  setSigningKey(key: string, _signingKey: SigningKey): Promise<void> {
    this.logger.trace(`Setting signing key for key: ${key}`);
    // @ts-ignore
    return this.privateDataProvider.setSigningKey(key, _signingKey);
  }

  getSigningKey(key: string): Promise<SigningKey | null> {
    this.logger.trace(`Getting signing key for key: ${key}`);
    // @ts-ignore
    return this.privateDataProvider.getSigningKey(key);
  }

  removeSigningKey(key: string): Promise<void> {
    this.logger.trace(`Removing signing key for key: ${key}`);
    // @ts-ignore
    return this.privateDataProvider.removeSigningKey(key);
  }

  clearSigningKeys(): Promise<void> {
    this.logger.trace('Clearing signing keys');
    // @ts-ignore
    return this.privateDataProvider.clearSigningKeys();
  }
}
