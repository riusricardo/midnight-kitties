import { useContext } from 'react';
import { LocalStateProviderContext, type LocalState } from '../contexts';

export const useLocalState = (): LocalState => {
  const context = useContext(LocalStateProviderContext);

  if (!context) {
    throw new Error('A <LocalStateProvider /> is required.');
  }
  return context;
};
