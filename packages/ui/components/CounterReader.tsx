/* global console */
import React, { useState, useEffect } from 'react';
import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import { CounterAPI, type CounterState, type CounterProviders } from '@repo/counter-api/common-api';
import { CircularProgress } from '@mui/material';
import { AgeVerificationForm, type CredentialSubjectData } from './AgeVerificationForm';

interface CounterReaderProviderProps {
  contractAddress: ContractAddress;
  providers: CounterProviders;
  children: React.ReactNode;
}

interface CounterReaderContextType {
  counterState: CounterState | null;
  counterValue: bigint | null;
  isLoading: boolean;
  error: Error | null;
  contractExists: boolean;
  refreshValue: () => Promise<void>;
  hasRealtimeUpdates: boolean;
  incrementCounter: () => Promise<void>;
  showAgeVerification: boolean;
  isVerificationLoading: boolean;
  updateCredentialSubject: (credentialData: any) => Promise<void>;
  closeAgeVerification: () => void;
}

const CounterReaderContext = React.createContext<CounterReaderContextType>({
  counterState: null,
  counterValue: null,
  isLoading: false,
  error: null,
  contractExists: false,
  refreshValue: async () => {},
  hasRealtimeUpdates: false,
  incrementCounter: async () => {},
  showAgeVerification: false,
  isVerificationLoading: false,
  updateCredentialSubject: async () => {},
  closeAgeVerification: () => {},
});

export const useCounterReader = () => {
  const context = React.useContext(CounterReaderContext);
  if (context === undefined) {
    throw new Error('useCounterReader must be used within a CounterReaderProvider');
  }
  return context;
};

export const CounterReaderProvider: React.FC<CounterReaderProviderProps> = ({
  contractAddress,
  providers,
  children,
}) => {
  const [counterApi, setCounterApi] = useState<CounterAPI | null>(null);
  const [counterState, setCounterState] = useState<CounterState | null>(null);
  const [counterValue, setCounterValue] = useState<bigint | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [contractExists, setContractExists] = useState<boolean>(false);
  const [hasRealtimeUpdates, setHasRealtimeUpdates] = useState<boolean>(false);
  const [isUserVerified, setIsUserVerified] = useState<boolean>(false);
  const [isVerificationLoading, setIsVerificationLoading] = useState<boolean>(false);
  const [showAgeVerification, setShowAgeVerification] = useState<boolean>(false);
  const [verifiedContracts, setVerifiedContracts] = useState<Set<string>>(new Set());

  // Helper function to check if current contract is verified
  const isContractVerified = (address: string): boolean => {
    return verifiedContracts.has(address);
  };

  const closeAgeVerification = () => {
    setShowAgeVerification(false);
  };

  const updateCredentialSubject = async (credentialData: any) => {
    if (!counterApi) {
      throw new Error('Counter API not initialized');
    }

    try {
      setIsVerificationLoading(true);
      setError(null);

      await (counterApi as any).updateCredentialSubject(credentialData);

      // Mark this contract as verified
      setVerifiedContracts((prev) => new Set([...prev, contractAddress]));
      setShowAgeVerification(false);

      console.log('Successfully updated credential subject for contract:', contractAddress);
    } catch (err) {
      console.error('Error updating credential subject:', err);
      setError(err instanceof Error ? err : new Error('Failed to update credential information'));
      throw err;
    } finally {
      setIsVerificationLoading(false);
    }
  };

  // Wrapper function to safely call getCounterState
  const getCounterValueSafely = async (): Promise<bigint> => {
    if (!contractAddress) {
      throw new Error('Contract address is required');
    }
    const counterValue = await CounterAPI.getCounterState(providers, contractAddress);
    if (counterValue === null) {
      throw new Error('Counter value is null - contract may not exist or be incompatible');
    }
    return counterValue;
  };

  const loadCounterValue = async () => {
    // Don't proceed if providers are not ready
    if (!providers) {
      setError(new Error('Providers not initialized'));
      return;
    }

    // Don't proceed if contract address is not set
    if (!contractAddress) {
      setError(new Error('Contract address not provided'));
      return;
    }

    try {
      console.log('🔍 CounterReader: Checking providers...');
      console.log('providers object:', providers);
      console.log('providers type:', typeof providers);
      setIsLoading(true);
      setError(null);

      // First check if the contract exists
      const exists = await CounterAPI.contractExists(providers, contractAddress);
      setContractExists(exists);

      if (!exists) {
        throw new Error(`Contract at address ${contractAddress} does not exist or is not a valid counter contract`);
      }

      try {
        // Try to connect to the counter contract for real-time updates
        const api = await CounterAPI.connect(providers, contractAddress);
        setCounterApi(api);
        setHasRealtimeUpdates(true);

        // Get initial counter value
        const value = await api.getCounterValue();
        setCounterValue(value);

        // Subscribe to state changes for real-time updates
        const subscription = api.state$.subscribe({
          next: (state: CounterState) => {
            setCounterState(state);
            setCounterValue(state.counterValue);
          },
          error: (err: Error) => {
            setError(err);
          },
        });

        setIsLoading(false);

        return () => {
          subscription.unsubscribe();
        };
      } catch (subscriptionError) {
        // Use console for debugging - logging fallback to direct read
        console.warn('Failed to subscribe to contract, trying direct read approach:', subscriptionError);

        // Fallback: Try to read the counter value directly from the public state
        try {
          const value: bigint = await getCounterValueSafely();
          setCounterValue(value);
          setCounterApi(null); // No API instance for real-time updates
          setHasRealtimeUpdates(false);
          setIsLoading(false);

          // Note: No real-time updates available in this mode
          console.log(
            'Successfully read counter value directly from public state. Real-time updates are not available.',
          );
        } catch (directError) {
          throw new Error(
            `Unable to read from this contract. It may be incompatible or corrupted. Subscription error: ${subscriptionError instanceof Error ? subscriptionError.message : String(subscriptionError)}. Direct read error: ${directError instanceof Error ? directError.message : String(directError)}`,
          );
        }
      }
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err : new Error('Unknown error loading counter'));
      setContractExists(false);
    }
  };

  useEffect(() => {
    if (providers && contractAddress) {
      void loadCounterValue();
    }
  }, [contractAddress, providers]);

  const refreshValue = async () => {
    if (!providers) {
      setError(new Error('Providers not initialized'));
      return;
    }

    if (!contractAddress) {
      setError(new Error('Contract address not provided'));
      return;
    }

    try {
      setIsLoading(true);
      const value = await getCounterValueSafely();
      setCounterValue(value);
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to refresh counter value'));
      setIsLoading(false);
    }
  };

  const incrementCounter = async () => {
    if (!counterApi) {
      setError(new Error('Counter API not initialized'));
      return;
    }

    // Check if user is verified for this specific contract
    if (!isContractVerified(contractAddress)) {
      setShowAgeVerification(true);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('🔍 CounterReader: Starting increment operation...');
      console.log('🔍 CounterReader: Contract address:', contractAddress);
      console.log('🔍 CounterReader: Current counter value:', counterValue);
      console.log('🔍 CounterReader: Providers available:', !!providers);

      // Check if providers are still valid
      if (!providers || !providers.privateStateProvider || !providers.publicDataProvider) {
        throw new Error('Providers not properly initialized');
      }

      console.log('✅ CounterReader: Providers validation passed');

      await counterApi.increment();
      console.log('✅ CounterReader: Increment operation completed successfully');

      // The state$ observable will update the UI
    } catch (err) {
      console.error('❌ CounterReader: Increment operation failed:', err);

      // Provide more specific error messages based on the error type
      let errorMessage = 'Failed to increment counter';
      if (err instanceof Error) {
        if (err.message.includes('invalid string length')) {
          errorMessage =
            'Transaction failed due to validation error. This may be due to incomplete provider setup or network issues.';
        } else if (err.message.includes('verifier key')) {
          errorMessage =
            'Contract verification failed. The contract version may be incompatible with the current network.';
        } else if (err.message.includes('proof')) {
          errorMessage = 'Proof generation failed. Please check your connection to the proof server.';
        } else {
          errorMessage = err.message;
        }
      }

      setError(new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CounterReaderContext.Provider
      value={{
        counterState,
        counterValue,
        isLoading,
        error,
        contractExists,
        refreshValue,
        hasRealtimeUpdates,
        incrementCounter,
        showAgeVerification,
        isVerificationLoading,
        updateCredentialSubject,
        closeAgeVerification,
      }}
    >
      {children}
    </CounterReaderContext.Provider>
  );
};

export const CounterReaderDisplay: React.FC<{
  walletPublicKey?: string;
}> = ({ walletPublicKey }) => {
  const {
    counterValue,
    isLoading,
    error,
    contractExists,
    refreshValue,
    incrementCounter,
    showAgeVerification,
    isVerificationLoading,
    updateCredentialSubject,
    closeAgeVerification,
  } = useCounterReader();

  const handleAgeVerification = async (credentialData: CredentialSubjectData) => {
    await updateCredentialSubject(credentialData);
  };

  if (isLoading) {
    return (
      <div className="counter-reader-container">
        <div className="loading-indicator" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CircularProgress size={18} />
          Loading counter value...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="counter-reader-container">
        <div
          className="error-message"
          style={{
            color: '#d32f2f',
            padding: '16px',
            backgroundColor: '#ffebee',
            borderRadius: '8px',
            border: '1px solid #ffcdd2',
            marginBottom: '16px',
          }}
        >
          <strong>Error:</strong> {error.message}
        </div>
        <button
          className="retry-button"
          onClick={() => {
            void refreshValue();
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!contractExists) {
    return (
      <div className="counter-reader-container">
        <div
          className="warning-message"
          style={{
            color: '#ed6c02',
            padding: '16px',
            backgroundColor: '#fff3e0',
            borderRadius: '8px',
            border: '1px solid #ffcc02',
          }}
        >
          Contract not found or is not a valid counter contract.
        </div>
      </div>
    );
  }

  return (
    <div
      className="counter-reader-container"
      style={{
        padding: '24px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
        maxWidth: '400px',
        margin: '0 auto',
      }}
    >
      {/* Age Verification Modal */}
      {showAgeVerification && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div style={{ position: 'relative' }}>
            <button
              onClick={closeAgeVerification}
              style={{
                position: 'absolute',
                top: -10,
                right: -10,
                background: '#ff1744',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: 30,
                height: 30,
                cursor: 'pointer',
                zIndex: 1001,
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ×
            </button>
            <AgeVerificationForm
              onSubmit={handleAgeVerification}
              isLoading={isVerificationLoading}
              error={error}
              walletPublicKey={walletPublicKey}
            />
          </div>
        </div>
      )}

      <h2
        style={{
          margin: '0 0 20px 0',
          color: '#333',
          textAlign: 'center',
        }}
      >
        Counter Reader
      </h2>

      <div
        className="counter-value-display"
        style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          border: '2px solid #1976d2',
          textAlign: 'center',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            fontSize: '14px',
            color: '#666',
            marginBottom: '8px',
          }}
        >
          Current Counter Value:
        </div>
        <div
          style={{
            fontSize: '36px',
            fontWeight: 'bold',
            color: '#1976d2',
            fontFamily: 'monospace',
          }}
        >
          {counterValue?.toString() || '0'}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          className="increment-button"
          onClick={() => {
            void incrementCounter();
          }}
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '12px',
            fontSize: '16px',
            backgroundColor: isLoading ? '#cccccc' : '#2e7d32',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
          }}
        >
          {isLoading ? 'Incrementing...' : 'Increment Counter'}
        </button>

        <button
          className="refresh-button"
          onClick={() => {
            void refreshValue();
          }}
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '12px',
            fontSize: '16px',
            backgroundColor: isLoading ? '#cccccc' : '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
          }}
        >
          {isLoading ? 'Refreshing...' : 'Refresh Value'}
        </button>
      </div>
    </div>
  );
};

export const CounterAddressInput: React.FC<{
  // eslint-disable-next-line no-unused-vars
  onAddressSubmit: (_address: ContractAddress) => void;
  initialAddress?: string;
}> = ({ onAddressSubmit, initialAddress = '' }) => {
  const [addressInput, setAddressInput] = useState<string>(initialAddress);
  const [error, setError] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!addressInput.trim()) {
      setError('Please enter a contract address');
      return;
    }

    try {
      // Remove spaces and validate - contract addresses should be hex strings
      const cleanAddress = addressInput.trim().replace(/\s+/g, '');
      if (!/^[a-fA-F0-9]+$/.test(cleanAddress)) {
        setError('Invalid contract address format. Address should be a hexadecimal string.');
        return;
      }

      onAddressSubmit(cleanAddress as ContractAddress);
    } catch (err) {
      console.error('Invalid contract address:', err);
      setError('Invalid contract address');
    }
  };

  return (
    <div
      className="counter-address-input"
      style={{
        padding: '24px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
        maxWidth: '500px',
        margin: '0 auto',
      }}
    >
      <h2
        style={{
          margin: '0 0 20px 0',
          color: '#333',
          textAlign: 'center',
        }}
      >
        Load Counter Contract
      </h2>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: 'bold',
              color: '#333',
            }}
          >
            Contract Address:
          </label>
          <input
            type="text"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            placeholder="Enter contract address (hex string)"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontFamily: 'monospace',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {error && (
          <div
            style={{
              color: '#d32f2f',
              backgroundColor: '#ffebee',
              padding: '8px 12px',
              borderRadius: '4px',
              marginBottom: '16px',
              border: '1px solid #ffcdd2',
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
        >
          Load Counter
        </button>
      </form>
    </div>
  );
};

// Helper to format contract address for display
function formatContractAddress(address: string, groupSize = 4): string {
  return address.replace(new RegExp(`(.{${groupSize}})`, 'g'), '$1 ').trim();
}

// Main application component that combines address input and counter reader
export const CounterReaderApplication: React.FC<{
  providers: CounterProviders;
  initialAddress?: ContractAddress;
  walletPublicKey?: string;
}> = ({ providers, initialAddress, walletPublicKey }) => {
  const [contractAddress, setContractAddress] = useState<ContractAddress | undefined>(initialAddress);

  // Show loading state if providers are not ready
  if (!providers) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <div>Loading providers...</div>
      </div>
    );
  }

  if (!contractAddress) {
    return (
      <CounterAddressInput onAddressSubmit={(address) => setContractAddress(address)} initialAddress={initialAddress} />
    );
  }

  return (
    <div>
      <div
        style={{
          marginBottom: '24px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'inline-block',
            background: '#f8fafc',
            border: '1.5px solid #1976d2',
            borderRadius: '6px',
            padding: '12px 18px',
            fontFamily: 'monospace',
            fontSize: '1.1rem',
            letterSpacing: '1px',
            color: '#222',
            minWidth: '540px', // fits 64 hex chars in monospace
            maxWidth: '100%',
            wordBreak: 'break-all',
            boxShadow: '0 2px 8px 0 rgba(25, 118, 210, 0.07)',
            marginBottom: '8px',
          }}
        >
          <span style={{ color: '#1976d2', fontWeight: 600 }}>Contract Address:</span>
          <br />
          <span style={{ userSelect: 'all', fontWeight: 500 }}>{formatContractAddress(contractAddress)}</span>
        </div>
        <br />
        <button
          onClick={() => setContractAddress(undefined)}
          style={{
            marginTop: '10px',
            padding: '4px 12px',
            fontSize: '13px',
            backgroundColor: '#666',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            marginLeft: '8px',
          }}
        >
          Change Address
        </button>
      </div>

      <CounterReaderProvider contractAddress={contractAddress} providers={providers}>
        <CounterReaderDisplay walletPublicKey={walletPublicKey} />
      </CounterReaderProvider>
    </div>
  );
};
