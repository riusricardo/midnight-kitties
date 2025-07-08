import React, { createContext, type PropsWithChildren } from 'react';
import { BrowserLocalState, type LocalState } from './BrowserLocalState.js';
import { type Logger } from 'pino';

export const LocalStateProviderContext = createContext<LocalState | undefined>(undefined);

export type LocalStateProviderProps = PropsWithChildren<{
  logger: Logger;
}>;

export const LocalStateProvider: React.FC<Readonly<LocalStateProviderProps>> = ({ children }) => (
  <LocalStateProviderContext.Provider value={new BrowserLocalState()}>{children}</LocalStateProviderContext.Provider>
);
