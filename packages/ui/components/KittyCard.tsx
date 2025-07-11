/**
 * @file KittyCard.tsx
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
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Chip,
  IconButton,
  Divider,
  CircularProgress,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import { Close as CloseIcon, Settings as SettingsIcon } from '@mui/icons-material';
import { CatGenerator } from 'cryptokitty-generator';

// Type declaration for the kitty data structure
export interface KittyData {
  id: bigint;
  dna: bigint;
  gender: number; // 0 = Male, 1 = Female
  owner: { bytes: Uint8Array };
  price: bigint;
  forSale: boolean;
  generation: bigint;
}

interface KittyCardProps {
  kitty: KittyData;
  onTransfer?: (kittyId: bigint, toAddress: string) => void;
  onSetPrice?: (kittyId: bigint, price: bigint) => void;
  onBreedKitty?: (parentKitty1Id: bigint, parentKitty2Id: bigint) => void;
  onApproveOffer?: (kittyId: bigint, offerId: string) => void;
  offers?: Array<{
    id: string;
    amount: bigint;
    buyer: string;
    buyerBytes: { bytes: Uint8Array };
    timestamp: Date;
  }>;
}

export const KittyCard: React.FC<KittyCardProps> = ({
  kitty,
  onTransfer,
  onSetPrice,
  onBreedKitty,
  onApproveOffer,
  offers = [],
}) => {
  const [catSvg, setCatSvg] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [priceInput, setPriceInput] = useState<string>('');
  const [transferAddress, setTransferAddress] = useState<string>('');
  const [breedKittyId, setBreedKittyId] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executingAction, setExecutingAction] = useState<string>('');
  const [tabValue, setTabValue] = useState<number>(0);

  useEffect(() => {
    const generateKittySvg = async () => {
      try {
        setIsLoading(true);
        setError('');

        // Use the actual CatGenerator to create responsive SVG from DNA
        const generator = new CatGenerator();
        const dnaString = kitty.dna.toString();

        // Generate responsive cat using the proper configuration
        const responsiveCat = generator.generateCat(dnaString);

        setCatSvg(responsiveCat.svgData);
      } catch {
        setError('Failed to generate kitty image');
      } finally {
        setIsLoading(false);
      }
    };

    void generateKittySvg();
  }, [kitty.dna]);

  const formatPrice = (price: bigint): string => {
    if (price === 0n) return 'Not for sale';
    return `${price.toString()} tokens`;
  };

  const getGenderEmoji = (gender: any): string => {
    // Assuming Gender enum: 0 = Male, 1 = Female
    return gender === 0 ? '♂️' : '♀️';
  };

  const handleOpenModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPriceInput(kitty.price.toString());
    setTransferAddress('');
    setBreedKittyId('');
    setTabValue(0);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setPriceInput('');
    setTransferAddress('');
    setBreedKittyId('');
    setTabValue(0);
  };

  const handleTransfer = async () => {
    if (onTransfer) {
      setIsExecuting(true);
      setExecutingAction('Transferring kitty...');
      try {
        await onTransfer(kitty.id, transferAddress.trim());
        handleCloseModal();
      } catch {
        // Transfer failed - error is handled by the parent component
      } finally {
        setIsExecuting(false);
        setExecutingAction('');
      }
    }
  };

  const handleSetPrice = async () => {
    if (onSetPrice) {
      setIsExecuting(true);
      setExecutingAction('Setting price...');
      try {
        const price = BigInt(priceInput || '0');
        await onSetPrice(kitty.id, price);
        handleCloseModal();
      } catch {
        // Set price failed - error is handled by the parent component
      } finally {
        setIsExecuting(false);
        setExecutingAction('');
      }
    }
  };

  const handleBreedKitty = async () => {
    if (onBreedKitty && breedKittyId.trim()) {
      setIsExecuting(true);
      setExecutingAction('Breeding kitties...');
      try {
        const parentKitty2Id = BigInt(breedKittyId.trim());
        await onBreedKitty(kitty.id, parentKitty2Id);
        handleCloseModal();
      } catch {
        // Breeding failed - error is handled by the parent component
      } finally {
        setIsExecuting(false);
        setExecutingAction('');
      }
    }
  };

  const handleApproveOffer = async (offerId: string) => {
    if (onApproveOffer) {
      setIsExecuting(true);
      setExecutingAction('Approving offer...');
      try {
        await onApproveOffer(kitty.id, offerId);
        // Don't close modal, just refresh the state
      } catch {
        // Approve offer failed - error is handled by the parent component
      } finally {
        setIsExecuting(false);
        setExecutingAction('');
      }
    }
  };

  return (
    <>
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e0e0e0',
          transition: 'transform 0.2s, box-shadow 0.2s',
          cursor: 'pointer',
          width: '100%',
          minWidth: '280px', // Minimum width to ensure cards don't get too small
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
        }}
      >
        {/* Kitty Image */}
        <div
          style={{
            width: '100%', // Use full available width of the card
            aspectRatio: '4/5', // Maintain 400:500 aspect ratio
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '12px',
            border: '2px solid #e9ecef',
            position: 'relative',
            overflow: 'hidden', // Ensure content doesn't overflow
          }}
        >
          {isLoading ? (
            <div style={{ color: '#6c757d', fontSize: '14px' }}>Generating kitty...</div>
          ) : error ? (
            <div style={{ color: '#dc3545', fontSize: '12px', textAlign: 'center' }}>{error}</div>
          ) : (
            <div
              className="kitty-svg-container"
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                dangerouslySetInnerHTML={{
                  __html: catSvg.replace(
                    '<svg',
                    '<svg style="width: 100%; height: 100%; max-width: 100%; max-height: 100%; object-fit: contain;"',
                  ),
                }}
              />
            </div>
          )}
        </div>

        {/* Kitty Info */}
        <div style={{ marginBottom: '12px', flex: 1 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#2c3e50',
              }}
            >
              Kitty #{kitty.id.toString()}
            </h3>
            <span style={{ fontSize: '20px' }}>{getGenderEmoji(kitty.gender)}</span>
          </div>

          <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>
            <strong>Generation:</strong> {kitty.generation.toString()}
          </div>

          <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>
            <strong>DNA:</strong>{' '}
            <span style={{ fontFamily: 'monospace', fontSize: '10px' }}>{kitty.dna.toString().slice(0, 20)}...</span>
          </div>

          <div
            style={{
              fontSize: '12px',
              color: kitty.forSale ? '#28a745' : '#6c757d',
              fontWeight: kitty.forSale ? 'bold' : 'normal',
            }}
          >
            <strong>Price:</strong> {formatPrice(kitty.price)}
          </div>
        </div>

        {/* Manage Button */}
        {(onTransfer || onSetPrice) && (
          <Button
            variant="contained"
            startIcon={<SettingsIcon />}
            onClick={handleOpenModal}
            sx={{
              mt: 1,
              backgroundColor: '#6c5ce7',
              '&:hover': {
                backgroundColor: '#5a52d5',
              },
            }}
            fullWidth
          >
            Manage Kitty
          </Button>
        )}

        {/* For Sale Badge */}
        {kitty.forSale && (
          <Chip
            label="FOR SALE"
            size="small"
            sx={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              backgroundColor: '#28a745',
              color: 'white',
              fontSize: '10px',
              fontWeight: 'bold',
            }}
          />
        )}
      </div>

      {/* Management Modal */}
      <Dialog
        open={modalOpen}
        onClose={handleCloseModal}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            boxShadow:
              '0 24px 38px 3px rgba(0,0,0,0.14), 0 9px 46px 8px rgba(0,0,0,0.12), 0 11px 15px -7px rgba(0,0,0,0.20)',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
            overflow: 'hidden',
          },
        }}
        TransitionProps={{
          timeout: 300,
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #6c5ce7 0%, #74b9ff 100%)',
            color: 'white',
            py: 2.5,
            '& .MuiTypography-root': {
              fontWeight: 700,
              fontSize: '1.25rem',
            },
          }}
        >
          <Typography variant="h6">Manage Kitty #{kitty.id.toString()}</Typography>
          <IconButton
            onClick={handleCloseModal}
            size="small"
            sx={{
              color: 'white',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent
          sx={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
            py: 3,
          }}
        >
          <Box sx={{ mb: 3 }}>
            {/* Kitty Image in Modal */}
            <Box
              sx={{
                width: '200px',
                height: '250px',
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
                border: '3px solid #e9ecef',
                boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
                },
              }}
            >
              {isLoading ? (
                <Typography color="textSecondary">Generating kitty...</Typography>
              ) : error ? (
                <Typography color="error" variant="body2" align="center">
                  {error}
                </Typography>
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  dangerouslySetInnerHTML={{
                    __html: catSvg.replace(
                      '<svg',
                      '<svg style="width: 100%; height: 100%; max-width: 100%; max-height: 100%; object-fit: contain;"',
                    ),
                  }}
                />
              )}
            </Box>

            {/* Kitty Details */}
            <Box
              sx={{
                textAlign: 'center',
                mb: 4,
                p: 3,
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                borderRadius: '12px',
                border: '1px solid rgba(108, 92, 231, 0.1)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <Typography
                variant="h6"
                gutterBottom
                sx={{
                  fontWeight: 700,
                  color: '#2d3436',
                  mb: 2,
                }}
              >
                Kitty #{kitty.id.toString()} {getGenderEmoji(kitty.gender)}
              </Typography>

              <Box sx={{ display: 'flex', justifyContent: 'space-around', mb: 2 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" display="block" color="textSecondary">
                    Generation
                  </Typography>
                  <Typography variant="body1" fontWeight={600} color="primary.main">
                    {kitty.generation.toString()}
                  </Typography>
                </Box>

                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" display="block" color="textSecondary">
                    Status
                  </Typography>
                  <Typography variant="body1" fontWeight={600} color={kitty.forSale ? 'success.main' : 'textSecondary'}>
                    {kitty.forSale ? 'For Sale' : 'Not Listed'}
                  </Typography>
                </Box>
              </Box>

              <Typography
                variant="body2"
                color="textSecondary"
                gutterBottom
                sx={{
                  fontFamily: 'monospace',
                  backgroundColor: 'rgba(0, 0, 0, 0.05)',
                  padding: '8px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                }}
              >
                DNA: {kitty.dna.toString().slice(0, 40)}...
              </Typography>

              <Typography
                variant="h6"
                color={kitty.forSale ? 'success.main' : 'textSecondary'}
                sx={{ fontWeight: 700, mt: 2 }}
              >
                {formatPrice(kitty.price)}
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Tabs */}
            <Box sx={{ width: '100%' }}>
              <Tabs
                value={tabValue}
                onChange={(_, newValue: number) => setTabValue(newValue)}
                indicatorColor="primary"
                textColor="primary"
                variant="fullWidth"
                sx={{
                  borderBottom: 1,
                  borderColor: 'divider',
                  mb: 3,
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    minHeight: 48,
                    '&.Mui-selected': {
                      color: '#6c5ce7',
                    },
                  },
                  '& .MuiTabs-indicator': {
                    backgroundColor: '#6c5ce7',
                    height: 3,
                    borderRadius: '3px 3px 0 0',
                  },
                }}
              >
                {onTransfer && <Tab label="Transfer" />}
                {onSetPrice && <Tab label="Selling" />}
                <Tab label={`Offers (${offers?.length || 0})`} />
                <Tab label="Breeding" />
              </Tabs>

              {/* Tab Content */}
              <Box
                sx={{
                  minHeight: '240px',
                  p: 3,
                  backgroundColor: 'rgba(255, 255, 255, 0.6)',
                  borderRadius: '12px',
                  border: '1px solid rgba(108, 92, 231, 0.1)',
                  backdropFilter: 'blur(5px)',
                }}
              >
                {/* Transfer Tab */}
                {onTransfer && tabValue === 0 && (
                  <Box>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 700, color: '#2d3436' }}>
                      Transfer Kitty
                    </Typography>
                    <Typography variant="body2" color="textSecondary" gutterBottom sx={{ mb: 3 }}>
                      Transfer this kitty to another wallet address
                    </Typography>
                    
                    <Typography variant="body1" sx={{ fontWeight: 600, mb: 1, color: '#2d3436' }}>
                      Recipient Address:
                    </Typography>
                    <TextField
                      fullWidth
                      label="Recipient Address (hex)"
                      value={transferAddress}
                      onChange={(e) => setTransferAddress(e.target.value)}
                      placeholder="Enter wallet address..."
                      helperText="Enter the recipient's wallet address in hexadecimal format"
                      sx={{
                        mb: 3,
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '12px',
                        },
                      }}
                    />
                    <Button
                      variant="contained"
                      onClick={handleTransfer}
                      disabled={isExecuting}
                      startIcon={
                        isExecuting && executingAction.includes('Transfer') ? <CircularProgress size={16} /> : undefined
                      }
                      fullWidth
                      sx={{
                        py: 1.5,
                        borderRadius: '12px',
                        fontWeight: 600,
                        textTransform: 'none',
                        background: 'linear-gradient(135deg, #fd79a8 0%, #fdcb6e 100%)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #e84393 0%, #f39c12 100%)',
                        },
                      }}
                    >
                      {isExecuting && executingAction.includes('Transfer') ? 'Transferring...' : 'Transfer Kitty'}
                    </Button>
                  </Box>
                )}

                {/* Selling Tab */}
                {onSetPrice && tabValue === (onTransfer ? 1 : 0) && (
                  <Box>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 700, color: '#2d3436' }}>
                      Set Selling Price
                    </Typography>
                    <Typography variant="body2" color="textSecondary" gutterBottom sx={{ mb: 3 }}>
                      Set a price to list this kitty for sale or set to 0 to remove from sale
                    </Typography>
                    
                    <Typography variant="body1" sx={{ fontWeight: 600, mb: 1, color: '#2d3436' }}>
                      Price (tokens):
                    </Typography>
                    <TextField
                      fullWidth
                      label="Price (tokens)"
                      type="number"
                      value={priceInput}
                      onChange={(e) => setPriceInput(e.target.value)}
                      placeholder="0"
                      helperText="Set to 0 to remove from sale"
                      sx={{
                        mb: 3,
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '12px',
                        },
                      }}
                    />
                    <Button
                      variant="contained"
                      onClick={handleSetPrice}
                      disabled={isExecuting}
                      startIcon={
                        isExecuting && executingAction.includes('Setting') ? <CircularProgress size={16} /> : undefined
                      }
                      fullWidth
                      sx={{
                        py: 1.5,
                        borderRadius: '12px',
                        fontWeight: 600,
                        textTransform: 'none',
                        background: 'linear-gradient(135deg, #fd79a8 0%, #fdcb6e 100%)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #e84393 0%, #f39c12 100%)',
                        },
                      }}
                    >
                      {isExecuting && executingAction.includes('Setting') ? 'Setting...' : 'Update Price'}
                    </Button>
                  </Box>
                )}

                {/* Offers Tab */}
                {tabValue === (onTransfer && onSetPrice ? 2 : onTransfer || onSetPrice ? 1 : 0) && (
                  <Box>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 700, color: '#2d3436' }}>
                      Offers for this Kitty ({offers?.length || 0})
                    </Typography>
                    {!offers || offers.length === 0 ? (
                      <Box
                        sx={{
                          textAlign: 'center',
                          py: 6,
                          color: 'text.secondary',
                          backgroundColor: 'rgba(108, 92, 231, 0.05)',
                          borderRadius: '12px',
                          border: '2px dashed rgba(108, 92, 231, 0.2)',
                        }}
                      >
                        <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>
                          No offers yet
                        </Typography>
                        <Typography variant="body2">
                          This kitty hasn't received any offers from other players.
                        </Typography>
                      </Box>
                    ) : (
                      <List sx={{ maxHeight: '300px', overflow: 'auto' }}>
                        {offers.map((offer) => (
                          <ListItem
                            key={offer.id}
                            sx={{
                              backgroundColor: 'white',
                              border: '2px solid #1976d2',
                              borderRadius: '12px',
                              padding: '20px 24px',
                              fontFamily: 'monospace',
                              fontSize: '1.1rem',
                              letterSpacing: '1px',
                              color: '#222',
                              boxShadow: '0 4px 12px rgba(25, 118, 210, 0.15)',
                              mb: 2,
                            }}
                          >
                            <ListItemText
                              primary={`${formatPrice(offer.amount)} tokens`}
                              primaryTypographyProps={{
                                sx: {
                                  color: '#1976d2',
                                  fontWeight: 700,
                                  fontSize: '1.1rem',
                                  fontFamily: 'monospace',
                                },
                              }}
                              secondary={
                                <Box>
                                  <Typography
                                    variant="caption"
                                    display="block"
                                    sx={{
                                      color: '#1976d2',
                                      fontWeight: 600,
                                      fontSize: '14px',
                                      fontFamily: 'monospace',
                                    }}
                                  >
                                    From: {offer.buyer.slice(0, 8)}...{offer.buyer.slice(-8)}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: '#666',
                                      fontWeight: 500,
                                      fontSize: '12px',
                                    }}
                                  >
                                    {offer.timestamp.toLocaleDateString()}
                                  </Typography>
                                </Box>
                              }
                            />
                            <ListItemSecondaryAction>
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => handleApproveOffer(offer.id)}
                                disabled={isExecuting}
                                startIcon={
                                  isExecuting && executingAction.includes('Approving') ? (
                                    <CircularProgress size={14} />
                                  ) : undefined
                                }
                                sx={{
                                  py: 1,
                                  px: 2,
                                  borderRadius: '12px',
                                  textTransform: 'none',
                                  fontWeight: 600,
                                  background: 'linear-gradient(135deg, #fd79a8 0%, #fdcb6e 100%)',
                                  '&:hover': {
                                    background: 'linear-gradient(135deg, #e84393 0%, #f39c12 100%)',
                                  },
                                }}
                              >
                                {isExecuting && executingAction.includes('Approving') ? 'Approving...' : 'Accept'}
                              </Button>
                            </ListItemSecondaryAction>
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </Box>
                )}

                {/* Breeding Tab */}
                {tabValue === (onTransfer ? 1 : 0) + (onSetPrice ? 1 : 0) + 1 && (
                  <Box>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 700, color: '#2d3436' }}>
                      Breed Kitty
                    </Typography>
                    <Typography variant="body2" color="textSecondary" gutterBottom sx={{ mb: 3 }}>
                      Breed this kitty (#{kitty.id.toString()}) with another kitty to create offspring
                    </Typography>

                    {!onBreedKitty ? (
                      <Box
                        sx={{
                          textAlign: 'center',
                          py: 6,
                          color: 'text.secondary',
                          backgroundColor: 'rgba(108, 92, 231, 0.05)',
                          borderRadius: '12px',
                          border: '2px dashed rgba(108, 92, 231, 0.2)',
                        }}
                      >
                        <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>
                          Breeding not available
                        </Typography>
                        <Typography variant="body2">Breeding functionality is not enabled for this kitty.</Typography>
                      </Box>
                    ) : (
                      <>
                        <TextField
                          fullWidth
                          label="Second Parent Kitty ID"
                          type="number"
                          value={breedKittyId}
                          onChange={(e) => setBreedKittyId(e.target.value)}
                          placeholder="Enter the ID of the second parent kitty"
                          helperText="Both kitties must be owned by you to breed them"
                          sx={{
                            mb: 3,
                            '& .MuiOutlinedInput-root': {
                              borderRadius: '12px',
                            },
                          }}
                        />
                        <Button
                          variant="contained"
                          onClick={handleBreedKitty}
                          disabled={!breedKittyId.trim() || isExecuting}
                          startIcon={
                            isExecuting && executingAction.includes('Breeding') ? (
                              <CircularProgress size={16} />
                            ) : undefined
                          }
                          fullWidth
                          sx={{
                            py: 1.5,
                            borderRadius: '12px',
                            fontWeight: 600,
                            textTransform: 'none',
                            background: 'linear-gradient(135deg, #fd79a8 0%, #fdcb6e 100%)',
                            '&:hover': {
                              background: 'linear-gradient(135deg, #e84393 0%, #f39c12 100%)',
                            },
                          }}
                        >
                          {isExecuting && executingAction.includes('Breeding') ? 'Breeding...' : 'Breed Kitties'}
                        </Button>
                      </>
                    )}
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            px: 4,
            py: 3,
            background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
            borderTop: '1px solid rgba(108, 92, 231, 0.1)',
          }}
        >
          <Button
            onClick={handleCloseModal}
            color="inherit"
            disabled={isExecuting}
            sx={{
              fontWeight: 600,
              textTransform: 'none',
              px: 3,
              py: 1,
              borderRadius: '8px',
              color: 'text.secondary',
              '&:hover': {
                backgroundColor: 'rgba(108, 92, 231, 0.04)',
                color: 'primary.main',
              },
            }}
          >
            Cancel
          </Button>
        </DialogActions>

        {/* Loading Overlay for Modal */}
        {isExecuting && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
              borderRadius: 1,
            }}
          >
            <CircularProgress size={40} sx={{ mb: 2 }} />
            <Typography variant="h6" color="primary">
              {executingAction}
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Please wait...
            </Typography>
          </Box>
        )}
      </Dialog>
    </>
  );
};

export default KittyCard;
