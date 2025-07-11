/**
 * @file MyKittiesGallery.tsx
 * @author Ricardo Rius
 * @license GPL-3.0
 */

/* global console, window */
import React, { useState, useEffect } from 'react';
import { CircularProgress } from '@mui/material';
import { KittyCard, type KittyData } from './KittyCard';
import { parseAddress } from '@repo/kitties-api';

interface MyKittiesGalleryProps {
  kittiesApi: any; // API instance
  walletPublicKey?: string;
  isLoading?: boolean;
}

export const MyKittiesGallery: React.FC<MyKittiesGalleryProps> = ({
  kittiesApi,
  walletPublicKey,
  isLoading: externalLoading = false,
}) => {
  const [myKitties, setMyKitties] = useState<KittyData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

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

  useEffect(() => {
    if (kittiesApi && !externalLoading && walletPublicKey) {
      void loadMyKitties();
    }
  }, [kittiesApi, externalLoading, walletPublicKey]);

  const handleTransferKitty = async (kittyId: bigint) => {
    const toAddress = window.prompt('Enter recipient address (hex):');
    if (!toAddress || !kittiesApi) return;

    try {
      setIsLoading(true);
      // Convert hex string to bytes
      const toBytes = new Uint8Array(Buffer.from(toAddress, 'hex'));
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

  if (externalLoading || isLoading) {
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
        <div style={{ color: '#666', fontSize: '16px' }}>
          {externalLoading ? 'Loading contract...' : 'Loading your kitties...'}
        </div>
      </div>
    );
  }

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
          <div
            style={{
              fontSize: '48px',
              marginBottom: '16px',
              opacity: 0.5,
            }}
          >
            🐱
          </div>
          <h3
            style={{
              margin: '0 0 8px 0',
              color: '#495057',
              fontSize: '24px',
            }}
          >
            No kitties yet!
          </h3>
          <p
            style={{
              margin: '0 0 24px 0',
              color: '#6c757d',
              fontSize: '16px',
            }}
          >
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

export default MyKittiesGallery;
