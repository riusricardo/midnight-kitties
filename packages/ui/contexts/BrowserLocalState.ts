/**
 * @file BrowserLocalState.ts
 * @license GPL-3.0
 *
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

export interface LocalState {
  // eslint-disable-next-line no-unused-vars
  readonly setLaceAutoConnect: (_value: boolean) => void;
  readonly isLaceAutoConnect: () => boolean;
}

// Use globalThis for universal compatibility (browser/node)
export class BrowserLocalState implements LocalState {
  isLaceAutoConnect(): boolean {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage.getItem('kitties_midnight_lace_connect') === 'true';
    }
    return false;
  }

  setLaceAutoConnect(_value: boolean): void {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      globalThis.localStorage.setItem('kitties_midnight_lace_connect', _value.toString());
    }
  }
}
