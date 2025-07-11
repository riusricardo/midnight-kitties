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

/* global console, window */
import React, { useState, useEffect } from 'react';
import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import { CircularProgress } from '@mui/material';
import { KittyCard, type KittyData } from './KittyCard';
import { KittiesAPI, type KittiesProviders } from '@repo/kitties-api';

// Helper function to convert hex string to Uint8Array
const hexToUint8Array = (hex: string): Uint8Array => {
  const cleanHex = hex.replace(/^0x/, '');
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
  }
  return bytes;
};

interface KittiesReaderProps {
  contractAddress: ContractAddress;
  providers: KittiesProviders;
  walletPublicKey?: { bytes: Uint8Array };
}

export const KittiesReader: React.FC<KittiesReaderProps> = ({ contractAddress, providers, walletPublicKey }) => {
  const [kittiesApi, setKittiesApi] = useState<KittiesAPI | null>(null);
  const [myKitties, setMyKitties] = useState<KittyData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [contractExists, setContractExists] = useState<boolean>(false);

  // Initialize the API connection
  useEffect(() => {
    const initializeAPI = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Connect to the real contract using KittiesAPI
        console.log('Connecting to contract at:', contractAddress);
        const connectedAPI = await KittiesAPI.connect(providers, contractAddress);

        if (connectedAPI) {
          setKittiesApi(connectedAPI);
          setContractExists(true);
          console.log('Successfully connected to KittiesAPI');
        } else {
          throw new Error('Failed to connect to contract');
        }
      } catch (err) {
        console.error('Error connecting to contract:', err);
        setError(err instanceof Error ? err : new Error('Failed to connect to contract'));
        setContractExists(false);
      } finally {
        setIsLoading(false);
      }
    };

    if (providers && contractAddress) {
      void initializeAPI();
    }
  }, [contractAddress, providers]);

  // Load user's kitties
  const loadMyKitties = async (showLoader = true) => {
    if (!kittiesApi) {
      setError(new Error('API not initialized'));
      return;
    }

    if (!walletPublicKey) {
      setError(new Error('Wallet not connected'));
      return;
    }

    try {
      if (showLoader) {
        setIsLoading(true);
      }
      setError(null);

      // Convert wallet public key to bytes format
      const kitties = await kittiesApi.getMyKitties(walletPublicKey);
      setMyKitties(kitties);
    } catch (err) {
      console.error('Error loading my kitties:', err);
      setError(err instanceof Error ? err : new Error('Failed to load kitties'));
    } finally {
      if (showLoader) {
        setIsLoading(false);
      }
    }
  };

  // Load kitties when API is ready
  useEffect(() => {
    if (kittiesApi && contractExists && walletPublicKey) {
      void loadMyKitties();
    }
  }, [kittiesApi, contractExists, walletPublicKey]);

  const handleCreateKitty = async () => {
    if (!kittiesApi) return;

    try {
      setIsLoading(true);
      setError(null);
      await kittiesApi.createKitty();
      // Reload kitties after creation without showing loader again
      await loadMyKitties(false);
    } catch (err) {
      console.error('Error creating kitty:', err);
      setError(err instanceof Error ? err : new Error('Failed to create kitty'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransferKitty = async (kittyId: bigint) => {
    if (!kittiesApi) return;

    const recipientAddress = window.prompt('Enter recipient address (hex format):');
    if (!recipientAddress) return;

    try {
      setIsLoading(true);
      setError(null);

      // Convert hex string to bytes format
      const recipientBytes = new Uint8Array(recipientAddress.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []);

      await kittiesApi.transferKitty({
        to: { bytes: recipientBytes },
        kittyId: kittyId,
      });

      // Reload kitties after transfer
      await loadMyKitties(false);
    } catch (err) {
      console.error('Error transferring kitty:', err);
      setError(err instanceof Error ? err : new Error('Failed to transfer kitty'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPrice = async (kittyId: bigint, price: bigint) => {
    if (!kittiesApi) return;

    try {
      setIsLoading(true);
      setError(null);

      await kittiesApi.setPrice({
        kittyId: kittyId,
        price: price,
      });

      // Reload kitties after price change
      await loadMyKitties(false);
    } catch (err) {
      console.error('Error setting price:', err);
      setError(err instanceof Error ? err : new Error('Failed to set price'));
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (isLoading && !kittiesApi) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <CircularProgress size={40} />
        <div style={{ color: '#666', fontSize: '16px' }}>Loading contract...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        style={{
          padding: '24px',
          backgroundColor: '#ffebee',
          borderRadius: '8px',
          border: '1px solid #ffcdd2',
          margin: '16px 0',
        }}
      >
        <div style={{ color: '#d32f2f', fontWeight: 'bold', marginBottom: '8px' }}>Error loading kitties</div>
        <div style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>{error.message}</div>
        <button
          onClick={() => void loadMyKitties()}
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

  // Contract not found
  if (!contractExists) {
    return (
      <div
        style={{
          padding: '24px',
          backgroundColor: '#fff3e0',
          borderRadius: '8px',
          border: '1px solid #ffcc02',
          margin: '16px 0',
        }}
      >
        <div style={{ color: '#ed6c02', fontWeight: 'bold' }}>
          Contract not found or is not a valid kitties contract.
        </div>
      </div>
    );
  }

  // Main gallery view
  return (
    <div style={{ width: '100%' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
          padding: '24px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div>
          <h2 style={{ margin: '0 0 8px 0', color: '#333', fontSize: '2rem' }}>My Kitties Collection</h2>
          <div style={{ color: '#666', fontSize: '16px' }}>
            {myKitties.length} kitties owned
            {walletPublicKey && (
              <span
                style={{
                  marginLeft: '16px',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  backgroundColor: '#f5f5f5',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  border: '1px solid #e0e0e0',
                }}
              >
                {(() => {
                  const hexString = Array.from(walletPublicKey.bytes)
                    .map((byte) => byte.toString(16).padStart(2, '0'))
                    .join('');
                  return `${hexString.slice(0, 8)}...${hexString.slice(-8)}`;
                })()}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => void handleCreateKitty()}
          disabled={isLoading}
          style={{
            padding: '14px 28px',
            fontSize: '16px',
            backgroundColor: isLoading ? '#cccccc' : '#2e7d32',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            transition: 'all 0.2s',
            boxShadow: isLoading ? 'none' : '0 2px 4px rgba(46, 125, 50, 0.3)',
          }}
        >
          {isLoading ? 'Creating...' : '+ Create New Kitty'}
        </button>
      </div>

      {/* Kitties Grid */}
      {myKitties.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '80px 40px',
            backgroundColor: 'white',
            borderRadius: '16px',
            border: '2px dashed #dee2e6',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
          }}
        >
          <div style={{ fontSize: '64px', marginBottom: '24px', opacity: 0.6 }}>🐱</div>
          <h3 style={{ margin: '0 0 12px 0', color: '#495057', fontSize: '28px' }}>No kitties yet!</h3>
          <p
            style={{
              margin: '0 0 32px 0',
              color: '#6c757d',
              fontSize: '18px',
              maxWidth: '400px',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            Create your first kitty to start your collection and watch your digital companions come to life.
          </p>
          <button
            onClick={() => void handleCreateKitty()}
            disabled={isLoading}
            style={{
              padding: '18px 36px',
              fontSize: '18px',
              backgroundColor: isLoading ? '#cccccc' : '#2e7d32',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              transition: 'all 0.2s',
              boxShadow: isLoading ? 'none' : '0 4px 8px rgba(46, 125, 50, 0.3)',
            }}
          >
            {isLoading ? 'Creating...' : 'Create My First Kitty'}
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px',
            padding: '0',
            width: '100%',
          }}
        >
          {myKitties.map((kitty) => (
            <KittyCard
              key={kitty.id.toString()}
              kitty={kitty}
              onTransfer={handleTransferKitty}
              onSetPrice={handleSetPrice}
            />
          ))}
        </div>
      )}

      {/* Refresh Button */}
      <div
        style={{
          textAlign: 'center',
          marginTop: '40px',
          paddingTop: '32px',
          borderTop: '1px solid #e0e0e0',
        }}
      >
        <button
          onClick={() => void loadMyKitties()}
          disabled={isLoading}
          style={{
            padding: '12px 32px',
            fontSize: '14px',
            backgroundColor: isLoading ? '#cccccc' : '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            boxShadow: isLoading ? 'none' : '0 2px 4px rgba(25, 118, 210, 0.3)',
          }}
        >
          {isLoading ? 'Refreshing...' : 'Refresh Collection'}
        </button>
      </div>
    </div>
  );
};

// Address input component for selecting a contract
export const KittiesAddressInput: React.FC<{
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
      style={{
        padding: '40px 24px',
        backgroundColor: 'white',
        borderRadius: '16px',
        border: '1px solid #e0e0e0',
        maxWidth: '600px',
        margin: '0 auto',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🐱</div>
        <h2 style={{ margin: '0 0 12px 0', color: '#333', fontSize: '2rem' }}>Load Kitties Contract</h2>
        <p style={{ margin: 0, color: '#666', fontSize: '16px' }}>
          Enter your contract address to start exploring your kitties collection
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '12px',
              fontWeight: 'bold',
              color: '#333',
              fontSize: '16px',
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
              padding: '16px',
              fontSize: '16px',
              border: '2px solid #e0e0e0',
              borderRadius: '8px',
              fontFamily: 'monospace',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#1976d2';
              e.target.style.outline = 'none';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e0e0e0';
            }}
          />
        </div>

        {error && (
          <div
            style={{
              color: '#d32f2f',
              backgroundColor: '#ffebee',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '20px',
              border: '1px solid #ffcdd2',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          style={{
            width: '100%',
            padding: '16px',
            fontSize: '16px',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontWeight: 'bold',
            boxShadow: '0 2px 4px rgba(25, 118, 210, 0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#1565c0';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#1976d2';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          Load Kitties Collection
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
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-block',
            background: 'white',
            border: '2px solid #1976d2',
            borderRadius: '12px',
            padding: '20px 24px',
            fontFamily: 'monospace',
            fontSize: '1.1rem',
            letterSpacing: '1px',
            color: '#222',
            minWidth: '600px',
            maxWidth: '100%',
            wordBreak: 'break-all',
            boxShadow: '0 4px 12px rgba(25, 118, 210, 0.15)',
            marginBottom: '16px',
          }}
        >
          <div style={{ color: '#1976d2', fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>
            📋 CONTRACT ADDRESS
          </div>
          <span style={{ userSelect: 'all', fontWeight: 500 }}>{formatContractAddress(contractAddress)}</span>
        </div>
        <br />
        <button
          onClick={() => setContractAddress(undefined)}
          style={{
            padding: '8px 20px',
            fontSize: '14px',
            backgroundColor: '#666',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontWeight: 'bold',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#555';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#666';
          }}
        >
          Change Contract Address
        </button>
      </div>

      <KittiesReader
        contractAddress={contractAddress}
        providers={providers}
        walletPublicKey={walletPublicKey ? { bytes: hexToUint8Array(walletPublicKey) } : undefined}
      />
    </div>
  );
};

export default KittiesReader;
