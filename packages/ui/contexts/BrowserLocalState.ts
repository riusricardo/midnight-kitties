export interface LocalState {
  // eslint-disable-next-line no-unused-vars
  readonly setLaceAutoConnect: (_value: boolean) => void;
  readonly isLaceAutoConnect: () => boolean;
}

// Use globalThis for universal compatibility (browser/node)
export class BrowserLocalState implements LocalState {
  isLaceAutoConnect(): boolean {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage.getItem('counter_midnight_lace_connect') === 'true';
    }
    return false;
  }

  setLaceAutoConnect(_value: boolean): void {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      globalThis.localStorage.setItem('counter_midnight_lace_connect', _value.toString());
    }
  }
}
