/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/**
 * @file MyKittiesGallery.tsx
 * @author Ricardo Rius
 * @license GPL-3.0
 */

/* global console */
import React, { useState, useEffect, useRef } from 'react';
import { CircularProgress, Backdrop, Typography, Box } from '@mui/material';
import { KittyCard, type KittyData } from './KittyCard';

interface MyKittiesGalleryProps {
  kittiesApi: any; // API instance
  walletPublicKey?: { bytes: Uint8Array } | Uint8Array;
  isLoading?: boolean;
}

export const MyKittiesGallery: React.FC<MyKittiesGalleryProps> = ({
  kittiesApi,
  walletPublicKey,
  isLoading: externalLoading = false,
}) => {
  const [myKitties, setMyKitties] = useState<KittyData[]>([]);
  const [kittyOffers, setKittyOffers] = useState<Map<string, any[]>>(new Map());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<Error | null>(null);
  const [isRealTimeConnected, setIsRealTimeConnected] = useState<boolean>(false);

  // Add subscription refs for cleanup
  const stateSubscriptionRef = useRef<any>(null);
  const lastUpdateRef = useRef<number>(0);

  // Set up real-time subscription to contract state changes
  useEffect(() => {
    if (!kittiesApi || !walletPublicKey) {
      setIsRealTimeConnected(false);
      return;
    }

    setIsRealTimeConnected(true);

    // Subscribe to the contract state observable for real-time updates
    stateSubscriptionRef.current = kittiesApi.state$.subscribe({
      next: () => {
        // Debounce rapid updates (max one update per second)
        const now = Date.now();
        if (now - lastUpdateRef.current < 1000) {
          return;
        }
        lastUpdateRef.current = now;

        // Silently refresh kitties when state changes (no loading spinner)
        void loadMyKitties(true);
      },
      error: () => {
        setIsRealTimeConnected(false);
        // Try to reconnect after a delay
        setTimeout(() => {
          if (kittiesApi && walletPublicKey) {
            void loadMyKitties();
          }
        }, 5000);
      },
    });

    // Initial load
    void loadMyKitties();

    // Cleanup subscription on unmount or dependencies change
    return () => {
      if (stateSubscriptionRef.current) {
        stateSubscriptionRef.current.unsubscribe();
        stateSubscriptionRef.current = null;
      }
      setIsRealTimeConnected(false);
    };
  }, [kittiesApi, walletPublicKey]);

  const loadMyKitties = async (silent = false) => {
    if (!kittiesApi) {
      setError(new Error('API not initialized'));
      return;
    }

    if (!walletPublicKey) {
      setError(new Error('Wallet not connected'));
      return;
    }

    try {
      if (!silent) {
        setIsLoading(true);
        setError(null);
      }

      // Pass wallet public key directly to API
      // Normalize walletPublicKey to the expected format
      const normalizedWalletKey = walletPublicKey instanceof Uint8Array ? { bytes: walletPublicKey } : walletPublicKey;

      // Call the API with the normalized wallet public key object
      const kitties = await kittiesApi.getMyKitties(normalizedWalletKey);
      // Sort kitties by ID in ascending order
      const sortedKitties = kitties.sort((a: KittyData, b: KittyData) => {
        return Number(a.id) - Number(b.id);
      });
      setMyKitties(sortedKitties);

      // Fetch offers for each kitty
      setLoadingMessage('Loading offers...');
      const offersMap = new Map<string, any[]>();

      for (const kitty of sortedKitties) {
        try {
          const offers = await kittiesApi.getOffersForKitty(kitty.id);

          if (!Array.isArray(offers)) {
            offersMap.set(kitty.id.toString(), []);
            continue;
          }

          // Convert offer format to match the expected interface
          const formattedOffers = offers.map((offer: any) => {
            // Handle different possible offer structures
            let buyerBytes = null;
            let buyerHex = 'unknown';
            let offerAmount = 0;

            try {
              // Try to extract buyer information from various possible fields
              if (offer.from) {
                if (offer.from.bytes) {
                  buyerBytes = offer.from;
                  buyerHex = Buffer.from(offer.from.bytes).toString('hex');
                } else if (offer.from instanceof Uint8Array) {
                  buyerBytes = { bytes: offer.from };
                  buyerHex = Buffer.from(offer.from).toString('hex');
                }
              } else if (offer.buyer) {
                if (offer.buyer.bytes) {
                  buyerBytes = offer.buyer;
                  buyerHex = Buffer.from(offer.buyer.bytes).toString('hex');
                } else if (offer.buyer instanceof Uint8Array) {
                  buyerBytes = { bytes: offer.buyer };
                  buyerHex = Buffer.from(offer.buyer).toString('hex');
                }
              } else if (offer.bidder) {
                // Another possible field name
                if (offer.bidder.bytes) {
                  buyerBytes = offer.bidder;
                  buyerHex = Buffer.from(offer.bidder.bytes).toString('hex');
                } else if (offer.bidder instanceof Uint8Array) {
                  buyerBytes = { bytes: offer.bidder };
                  buyerHex = Buffer.from(offer.bidder).toString('hex');
                }
              }

              // Try to extract amount from various possible fields
              offerAmount = offer.amount || offer.price || offer.bid || offer.value || 0;

              // If we still don't have buyer info, check if the offer itself is a structured object
              if (!buyerBytes && typeof offer === 'object') {
                // If offer has bytes directly
                if (offer.bytes) {
                  buyerBytes = offer;
                  buyerHex = Buffer.from(offer.bytes).toString('hex');
                }
              }
            } catch {
              // Error processing offer - skip it
            }

            return {
              id: `${kitty.id}_${buyerHex}_${Date.now()}`,
              amount: offerAmount,
              buyer: buyerHex,
              buyerBytes: buyerBytes,
              timestamp: new Date(),
            };
          });

          // Filter out any malformed offers
          const validOffers = formattedOffers.filter((offer) => offer.buyer !== 'unknown' && offer.buyerBytes !== null);

          offersMap.set(kitty.id.toString(), validOffers);
        } catch {
          offersMap.set(kitty.id.toString(), []);
        }
      }

      setKittyOffers(offersMap);
    } catch (err) {
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

  const handleTransferKitty = async (kittyId: bigint, toAddress: string) => {
    if (!kittiesApi) return;

    try {
      // Convert hex string to bytes
      const toBytes = new Uint8Array(Buffer.from(toAddress, 'hex'));
      await kittiesApi.transferKitty({ to: { bytes: toBytes }, kittyId });
      // Note: KittyCard will handle its own loading state and UI updates
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to transfer kitty'));
    }
  };

  const handleSetPrice = async (kittyId: bigint, price: bigint) => {
    try {
      await kittiesApi.setPrice({ kittyId, price });
      // Note: KittyCard will handle its own loading state and UI updates
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to set price'));
    }
  };

  const handleCreateKitty = async () => {
    if (!kittiesApi) return;

    try {
      setIsLoading(true);
      setLoadingMessage('Creating kitty...');
      await kittiesApi.createKitty();
      // Note: No manual reload needed - state subscription will handle updates
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create kitty'));
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleBreedKitty = async (parentKitty1Id: bigint, parentKitty2Id: bigint) => {
    if (!kittiesApi) return;

    try {
      await kittiesApi.breedKitty({ kittyId1: parentKitty1Id, kittyId2: parentKitty2Id });
      // Note: No manual reload needed - state subscription will handle updates
      // Individual KittyCard components handle their own loading states
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to breed kitties'));
    }
  };

  const handleApproveOffer = async (kittyId: bigint, offerId: string) => {
    if (!kittiesApi) return;

    try {
      // Extract buyer bytes from the stored offer data
      const offers = kittyOffers.get(kittyId.toString()) || [];
      const offer = offers.find((o) => o.id === offerId);

      if (!offer || !offer.buyerBytes) {
        throw new Error('Offer not found or invalid buyer data');
      }

      await kittiesApi.approveOffer({ kittyId, buyer: offer.buyerBytes });
      // Note: KittyCard will handle its own loading state and UI updates
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to approve offer'));
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
    <>
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
            <div style={{ color: '#666', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span>
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
                    {(() => {
                      const bytes = walletPublicKey instanceof Uint8Array ? walletPublicKey : walletPublicKey.bytes;
                      const hex = Array.from(bytes)
                        .map((b: number) => b.toString(16).padStart(2, '0'))
                        .join('');
                      return `${hex.slice(0, 8)}...${hex.slice(-8)}`;
                    })()}
                  </span>
                )}
              </span>
              {/* Real-time connection indicator */}
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  color: isRealTimeConnected ? '#4caf50' : '#ff9800',
                  fontWeight: 500,
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: isRealTimeConnected ? '#4caf50' : '#ff9800',
                    display: 'inline-block',
                  }}
                />
                {isRealTimeConnected ? 'Live Updates' : 'Connecting...'}
              </span>
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
            {isLoading ? 'Executing...' : '+ Create New Kitty'}
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
              {isLoading ? 'Executing...' : 'Create My First Kitty'}
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
                onTransfer={kittiesApi ? handleTransferKitty : undefined}
                onSetPrice={kittiesApi ? handleSetPrice : undefined}
                onBreedKitty={kittiesApi ? handleBreedKitty : undefined}
                onApproveOffer={kittiesApi ? handleApproveOffer : undefined}
                offers={kittyOffers.get(kitty.id.toString()) || []}
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

      {/* Loading Backdrop */}
      <Backdrop
        sx={{
          color: '#fff',
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
        }}
        open={isLoading}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <CircularProgress color="inherit" size={60} />
          <Typography variant="h6" component="div">
            {loadingMessage || 'Processing...'}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            Please wait while we process your request
          </Typography>
        </Box>
      </Backdrop>
    </>
  );
};

export default MyKittiesGallery;
