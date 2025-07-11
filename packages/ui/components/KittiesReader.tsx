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
import { parseAddress } from '@repo/kitties-api';

// Simple types for the API - matching actual MidnightProviders structure
interface KittiesProviders {
  publicDataProvider: any;
  privateStateProvider: any;
  // Note: prover is not available in the actual MidnightProviders type
}

interface KittiesAPI {
  getMyKitties(from: { bytes: Uint8Array }): Promise<KittyData[]>;
  createKitty(): Promise<void>;
  transferKitty(params: { to: { bytes: Uint8Array }; kittyId: bigint }): Promise<void>;
  setPrice(params: { kittyId: bigint; price: bigint }): Promise<void>;
}

interface KittiesReaderProps {
  contractAddress: ContractAddress;
  providers: KittiesProviders;
  walletPublicKey?: string;
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

        // For now, we'll create a mock API implementation
        // TODO: Replace with actual KittiesAPI when imports are fixed
        const mockAPI: KittiesAPI = {
          async getMyKitties(from: { bytes: Uint8Array }): Promise<KittyData[]> {
            // Return mock data for now - ignoring the 'from' parameter in mock
            console.log('Mock getMyKitties called with:', from);
            return [
              {
                id: 1n,
                dna: 12345678901234567890n,
                gender: 0,
                owner: { bytes: new Uint8Array([1, 2, 3, 4]) },
                price: 0n,
                forSale: false,
                generation: 0n,
              },
              {
                id: 2n,
                dna: 98765432109876543210n,
                gender: 1,
                owner: { bytes: new Uint8Array([1, 2, 3, 4]) },
                price: 100n,
                forSale: true,
                generation: 0n,
              },
            ];
          },
          async createKitty(): Promise<void> {
            console.log('Creating kitty...');
            // Mock implementation
            await new Promise((resolve) => setTimeout(resolve, 1000));
          },
          async transferKitty(): Promise<void> {
            console.log('Transferring kitty...');
            await new Promise((resolve) => setTimeout(resolve, 1000));
          },
          async setPrice(): Promise<void> {
            console.log('Setting price...');
            await new Promise((resolve) => setTimeout(resolve, 1000));
          },
        };

        setKittiesApi(mockAPI);
        setContractExists(true);
      } catch (err) {
        console.error('Error initializing API:', err);
        setError(err instanceof Error ? err : new Error('Failed to initialize API'));
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
  const loadMyKitties = async () => {
    if (!kittiesApi) {
      setError(new Error('API not initialized'));
      return;
    }

    if (!walletPublicKey) {
      setError(new Error('Wallet not connected'));
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Convert wallet public key to bytes format
      const walletBytes = parseAddress(walletPublicKey);
      const walletAddress = { bytes: walletBytes };

      const kitties = await kittiesApi.getMyKitties(walletAddress);
      setMyKitties(kitties);
    } catch (err) {
      console.error('Error loading my kitties:', err);
      setError(err instanceof Error ? err : new Error('Failed to load kitties'));
    } finally {
      setIsLoading(false);
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
      await kittiesApi.createKitty();
      // Reload kitties after creation
      await loadMyKitties();
    } catch (err) {
      console.error('Error creating kitty:', err);
      setError(err instanceof Error ? err : new Error('Failed to create kitty'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransferKitty = async (kittyId: bigint) => {
    const toAddress = window.prompt('Enter recipient address (hex):');
    if (!toAddress || !kittiesApi) return;

    try {
      setIsLoading(true);
      // Convert hex string to bytes
      const toBytes = new Uint8Array(toAddress.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []);
      await kittiesApi.transferKitty({ to: { bytes: toBytes }, kittyId });
      // Reload kitties after transfer
      await loadMyKitties();
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
      await kittiesApi.setPrice({ kittyId, price });
      // Reload kitties after price change
      await loadMyKitties();
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
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <div>
          <h2 style={{ margin: '0 0 8px 0', color: '#333' }}>My Kitties Collection</h2>
          <div style={{ color: '#666', fontSize: '14px' }}>
            {myKitties.length} kitties owned
            {walletPublicKey && (
              <span
                style={{
                  marginLeft: '16px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  backgroundColor: '#f5f5f5',
                  padding: '2px 8px',
                  borderRadius: '4px',
                }}
              >
                {walletPublicKey.slice(0, 8)}...{walletPublicKey.slice(-8)}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => void handleCreateKitty()}
          disabled={isLoading}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: isLoading ? '#cccccc' : '#2e7d32',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            transition: 'background-color 0.2s',
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
            padding: '60px 20px',
            backgroundColor: '#f8f9fa',
            borderRadius: '12px',
            border: '2px dashed #dee2e6',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>🐱</div>
          <h3 style={{ margin: '0 0 8px 0', color: '#495057', fontSize: '24px' }}>No kitties yet!</h3>
          <p style={{ margin: '0 0 24px 0', color: '#6c757d', fontSize: '16px' }}>
            Create your first kitty to start your collection.
          </p>
          <button
            onClick={() => void handleCreateKitty()}
            disabled={isLoading}
            style={{
              padding: '16px 32px',
              fontSize: '18px',
              backgroundColor: isLoading ? '#cccccc' : '#2e7d32',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              transition: 'background-color 0.2s',
            }}
          >
            {isLoading ? 'Creating...' : 'Create My First Kitty'}
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '24px',
            marginTop: '24px',
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
          marginTop: '32px',
          paddingTop: '24px',
          borderTop: '1px solid #e0e0e0',
        }}
      >
        <button
          onClick={() => void loadMyKitties()}
          disabled={isLoading}
          style={{
            padding: '12px 24px',
            fontSize: '14px',
            backgroundColor: isLoading ? '#cccccc' : '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
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
  onAddressSubmit: (address: ContractAddress) => void;
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
        padding: '24px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
        maxWidth: '500px',
        margin: '0 auto',
      }}
    >
      <h2 style={{ margin: '0 0 20px 0', color: '#333', textAlign: 'center' }}>Load Kitties Contract</h2>

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
      <div style={{ marginBottom: '24px', textAlign: 'center' }}>
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
            minWidth: '540px',
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

      <KittiesReader contractAddress={contractAddress} providers={providers} walletPublicKey={walletPublicKey} />
    </div>
  );
};

export default KittiesReader;
