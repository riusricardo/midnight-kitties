/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable no-unused-vars */
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
import { MyKittiesGallery } from './MyKittiesGallery';
import { type KittiesProviders } from '@repo/kitties-api';

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
  const [kittiesApi, setKittiesApi] = useState<any>(null);
  const [contractExists, setContractExists] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Initialize API connection
  useEffect(() => {
    const initializeAPI = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Import and use KittiesAPI using dynamic import to avoid compilation issues
        const kittiesApiModule = await import('@repo/kitties-api');
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const KittiesApiClass = (kittiesApiModule as any).KittiesAPI;

        // Connect to the real contract using KittiesAPI
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const connectedAPI = await KittiesApiClass.connect(providers, contractAddress);
        if (connectedAPI) {
          setKittiesApi(connectedAPI);
          setContractExists(true);
          console.log('Successfully connected to KittiesAPI');
        } else {
          setContractExists(false);
          setError(new Error('Failed to connect to contract'));
        }
      } catch (err) {
        console.error('Error connecting to KittiesAPI:', err);
        setError(err instanceof Error ? err : new Error('Failed to connect to API'));
        setContractExists(false);
      } finally {
        setIsLoading(false);
      }
    };

    if (providers && contractAddress) {
      void initializeAPI();
    }
  }, [contractAddress, providers]);

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
        <div style={{ color: '#666', fontSize: '16px' }}>Connecting to contract...</div>
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
          onClick={() => window.location.reload()}
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

  return <MyKittiesGallery kittiesApi={kittiesApi} walletPublicKey={walletPublicKey} isLoading={isLoading} />;
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
      // Validate that it's a proper hex string
      if (!/^[0-9a-fA-F]+$/.test(addressInput.replace(/^0x/, ''))) {
        setError('Invalid contract address format');
        return;
      }

      const contractAddress = addressInput as ContractAddress;
      onAddressSubmit(contractAddress);
    } catch (err) {
      console.debug('Error parsing contract address:', err);
      setError('Invalid contract address');
    }
  };

  return (
    <div
      style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '40px 24px',
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h2 style={{ margin: '0 0 16px 0', color: '#333', fontSize: '2rem' }}>🐱 Connect to Kitties Contract</h2>
        <p style={{ color: '#666', fontSize: '1.1rem', margin: 0 }}>
          Enter the contract address to view and manage your crypto kitties collection
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ marginBottom: '24px' }}>
        <div style={{ marginBottom: '16px' }}>
          <label
            htmlFor="address"
            style={{
              display: 'block',
              marginBottom: '8px',
              color: '#555',
              fontWeight: 'bold',
              fontSize: '14px',
            }}
          >
            Contract Address
          </label>
          <input
            id="address"
            type="text"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            placeholder="Enter contract address (hex format)"
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '16px',
              border: error ? '2px solid #f44336' : '2px solid #e0e0e0',
              borderRadius: '8px',
              fontFamily: 'monospace',
              backgroundColor: '#fafafa',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => {
              if (!error) {
                e.target.style.borderColor = '#1976d2';
              }
            }}
            onBlur={(e) => {
              if (!error) {
                e.target.style.borderColor = '#e0e0e0';
              }
            }}
          />
          {error && (
            <div style={{ color: '#f44336', fontSize: '14px', marginTop: '8px', fontWeight: 'bold' }}>{error}</div>
          )}
        </div>

        <button
          type="submit"
          style={{
            width: '100%',
            padding: '14px 24px',
            fontSize: '16px',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            transition: 'all 0.2s',
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
          Connect to Contract
        </button>
      </form>

      <div
        style={{
          padding: '16px',
          backgroundColor: '#e3f2fd',
          borderRadius: '8px',
          border: '1px solid #bbdefb',
        }}
      >
        <div style={{ color: '#1976d2', fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>
          📝 How to find your contract address:
        </div>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#555', fontSize: '14px' }}>
          <li>Deploy a new kitties contract using the CLI tools</li>
          <li>Or get the address from an existing deployment</li>
          <li>The address should be a hexadecimal string</li>
        </ul>
      </div>
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
