/**
 * @file KittiesReader.tsx
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

/* global console */
import React, { useState, useEffect } from 'react';
import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import { KittiesAPI, type KittiesState, type KittiesProviders } from '@repo/kitties-api/common-api';
import { CircularProgress } from '@mui/material';
import { AgeVerificationForm, type CredentialSubjectData } from './AgeVerificationForm';

interface KittiesReaderProviderProps {
  contractAddress: ContractAddress;
  providers: KittiesProviders;
  children: React.ReactNode;
}

interface KittiesReaderContextType {
  kittiesState: KittiesState | null;
  kittiesValue: bigint | null;
  isLoading: boolean;
  error: Error | null;
  contractExists: boolean;
  refreshValue: () => Promise<void>;
  hasRealtimeUpdates: boolean;
  incrementKitties: () => Promise<void>;
  showAgeVerification: boolean;
  isVerificationLoading: boolean;
  updateCredentialSubject: (credentialData: any) => Promise<void>;
  closeAgeVerification: () => void;
}

const KittiesReaderContext = React.createContext<KittiesReaderContextType>({
  kittiesState: null,
  kittiesValue: null,
  isLoading: false,
  error: null,
  contractExists: false,
  refreshValue: async () => {},
  hasRealtimeUpdates: false,
  incrementKitties: async () => {},
  showAgeVerification: false,
  isVerificationLoading: false,
  updateCredentialSubject: async () => {},
  closeAgeVerification: () => {},
});

export const useKittiesReader = () => {
  const context = React.useContext(KittiesReaderContext);
  if (context === undefined) {
    throw new Error('useKittiesReader must be used within a KittiesReaderProvider');
  }
  return context;
};

export const KittiesReaderProvider: React.FC<KittiesReaderProviderProps> = ({
  contractAddress,
  providers,
  children,
}) => {
  const [kittiesApi, setKittiesApi] = useState<KittiesAPI | null>(null);
  const [kittiesState, setKittiesState] = useState<KittiesState | null>(null);
  const [kittiesValue, setKittiesValue] = useState<bigint | null>(null);
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
    if (!kittiesApi) {
      throw new Error('Kitties API not initialized');
    }

    try {
      setIsVerificationLoading(true);
      setError(null);

      await (kittiesApi as any).updateCredentialSubject(credentialData);

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

  // Wrapper function to safely call getKittiesState
  const getKittiesValueSafely = async (): Promise<bigint> => {
    if (!contractAddress) {
      throw new Error('Contract address is required');
    }
    const kittiesValue = await KittiesAPI.getKittiesState(providers, contractAddress);
    if (kittiesValue === null) {
      throw new Error('Kitties value is null - contract may not exist or be incompatible');
    }
    return kittiesValue;
  };

  const loadKittiesValue = async () => {
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
      console.log('🔍 KittiesReader: Checking providers...');
      console.log('providers object:', providers);
      console.log('providers type:', typeof providers);
      setIsLoading(true);
      setError(null);

      // First check if the contract exists
      const exists = await KittiesAPI.contractExists(providers, contractAddress);
      setContractExists(exists);

      if (!exists) {
        throw new Error(`Contract at address ${contractAddress} does not exist or is not a valid kitties contract`);
      }

      try {
        // Try to connect to the kitties contract for real-time updates
        const api = await KittiesAPI.connect(providers, contractAddress);
        setKittiesApi(api);
        setHasRealtimeUpdates(true);

        // Get initial kitties value
        const value = await api.getKittiesValue();
        setKittiesValue(value);

        // Subscribe to state changes for real-time updates
        const subscription = api.state$.subscribe({
          next: (state: KittiesState) => {
            setKittiesState(state);
            setKittiesValue(state.kittiesValue);
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

        // Fallback: Try to read the kitties value directly from the public state
        try {
          const value: bigint = await getKittiesValueSafely();
          setKittiesValue(value);
          setKittiesApi(null); // No API instance for real-time updates
          setHasRealtimeUpdates(false);
          setIsLoading(false);

          // Note: No real-time updates available in this mode
          console.log(
            'Successfully read kitties value directly from public state. Real-time updates are not available.',
          );
        } catch (directError) {
          throw new Error(
            `Unable to read from this contract. It may be incompatible or corrupted. Subscription error: ${subscriptionError instanceof Error ? subscriptionError.message : String(subscriptionError)}. Direct read error: ${directError instanceof Error ? directError.message : String(directError)}`,
          );
        }
      }
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err : new Error('Unknown error loading kitties'));
      setContractExists(false);
    }
  };

  useEffect(() => {
    if (providers && contractAddress) {
      void loadKittiesValue();
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
      const value = await getKittiesValueSafely();
      setKittiesValue(value);
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to refresh kitties value'));
      setIsLoading(false);
    }
  };

  const incrementKitties = async () => {
    if (!kittiesApi) {
      setError(new Error('Kitties API not initialized'));
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

      console.log('🔍 KittiesReader: Starting increment operation...');
      console.log('🔍 KittiesReader: Contract address:', contractAddress);
      console.log('🔍 KittiesReader: Current kitties value:', kittiesValue);
      console.log('🔍 KittiesReader: Providers available:', !!providers);

      // Check if providers are still valid
      if (!providers || !providers.privateStateProvider || !providers.publicDataProvider) {
        throw new Error('Providers not properly initialized');
      }

      console.log('✅ KittiesReader: Providers validation passed');

      await kittiesApi.increment();
      console.log('✅ KittiesReader: Increment operation completed successfully');

      // The state$ observable will update the UI
    } catch (err) {
      console.error('❌ KittiesReader: Increment operation failed:', err);

      // Provide more specific error messages based on the error type
      let errorMessage = 'Failed to increment kitties';
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
    <KittiesReaderContext.Provider
      value={{
        kittiesState,
        kittiesValue,
        isLoading,
        error,
        contractExists,
        refreshValue,
        hasRealtimeUpdates,
        incrementKitties,
        showAgeVerification,
        isVerificationLoading,
        updateCredentialSubject,
        closeAgeVerification,
      }}
    >
      {children}
    </KittiesReaderContext.Provider>
  );
};

export const KittiesReaderDisplay: React.FC<{
  walletPublicKey?: string;
}> = ({ walletPublicKey }) => {
  const {
    kittiesValue,
    isLoading,
    error,
    contractExists,
    refreshValue,
    incrementKitties,
    showAgeVerification,
    isVerificationLoading,
    updateCredentialSubject,
    closeAgeVerification,
  } = useKittiesReader();

  const handleAgeVerification = async (credentialData: CredentialSubjectData) => {
    await updateCredentialSubject(credentialData);
  };

  if (isLoading) {
    return (
      <div className="kitties-reader-container">
        <div className="loading-indicator" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CircularProgress size={18} />
          Loading kitties value...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="kitties-reader-container">
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
      <div className="kitties-reader-container">
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
          Contract not found or is not a valid kitties contract.
        </div>
      </div>
    );
  }

  return (
    <div
      className="kitties-reader-container"
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
        Kitties Reader
      </h2>

      <div
        className="kitties-value-display"
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
          Current Kitties Value:
        </div>
        <div
          style={{
            fontSize: '36px',
            fontWeight: 'bold',
            color: '#1976d2',
            fontFamily: 'monospace',
          }}
        >
          {kittiesValue?.toString() || '0'}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          className="increment-button"
          onClick={() => {
            void incrementKitties();
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
          {isLoading ? 'Incrementing...' : 'Increment Kitties'}
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

export const KittiesAddressInput: React.FC<{
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
      className="kitties-address-input"
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
        Load Kitties Contract
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
          Load Kitties
        </button>
      </form>
    </div>
  );
};

// Helper to format contract address for display
function formatContractAddress(address: string, groupSize = 4): string {
  return address.replace(new RegExp(`(.{${groupSize}})`, 'g'), '$1 ').trim();
}

// Main application component that combines address input and kitties reader
export const KittiesReaderApplication: React.FC<{
  providers: KittiesProviders;
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
      <KittiesAddressInput onAddressSubmit={(address) => setContractAddress(address)} initialAddress={initialAddress} />
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

      <KittiesReaderProvider contractAddress={contractAddress} providers={providers}>
        <KittiesReaderDisplay walletPublicKey={walletPublicKey} />
      </KittiesReaderProvider>
    </div>
  );
};
