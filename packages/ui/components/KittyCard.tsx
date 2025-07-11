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
  onTransfer?: (kittyId: bigint) => void;
  onSetPrice?: (kittyId: bigint, price: bigint) => void;
}

export const KittyCard: React.FC<KittyCardProps> = ({ kitty, onTransfer, onSetPrice }) => {
  const [catSvg, setCatSvg] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [priceInput, setPriceInput] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executingAction, setExecutingAction] = useState<string>('');

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
      } catch (err) {
        console.error('Error generating kitty SVG:', err);
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
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setPriceInput('');
  };

  const handleTransfer = async () => {
    if (onTransfer) {
      setIsExecuting(true);
      setExecutingAction('Transferring kitty...');
      try {
        await onTransfer(kitty.id);
        handleCloseModal();
      } catch (error) {
        console.error('Transfer failed:', error);
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
      } catch (error) {
        console.error('Set price failed:', error);
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
      <Dialog open={modalOpen} onClose={handleCloseModal} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Manage Kitty #{kitty.id.toString()}</Typography>
          <IconButton onClick={handleCloseModal} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ mb: 3 }}>
            {/* Kitty Image in Modal */}
            <Box
              sx={{
                width: '200px',
                height: '250px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
                border: '2px solid #e9ecef',
                overflow: 'hidden',
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
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Kitty #{kitty.id.toString()} {getGenderEmoji(kitty.gender)}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Generation: {kitty.generation.toString()}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                DNA: {kitty.dna.toString().slice(0, 30)}...
              </Typography>
              <Typography variant="body2" color={kitty.forSale ? 'success.main' : 'textSecondary'}>
                Current Price: {formatPrice(kitty.price)}
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Price Management */}
            {onSetPrice && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Set Price
                </Typography>
                <TextField
                  fullWidth
                  label="Price (tokens)"
                  type="number"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  helperText="Set to 0 to remove from sale"
                  sx={{ mb: 2 }}
                />
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleCloseModal} color="inherit" disabled={isExecuting}>
            Cancel
          </Button>

          {onTransfer && (
            <Button
              variant="outlined"
              color="primary"
              onClick={handleTransfer}
              disabled={isExecuting}
              startIcon={
                isExecuting && executingAction.includes('Transfer') ? <CircularProgress size={16} /> : undefined
              }
            >
              {isExecuting && executingAction.includes('Transfer') ? 'Transferring...' : 'Transfer Kitty'}
            </Button>
          )}

          {onSetPrice && (
            <Button
              variant="contained"
              color="primary"
              onClick={handleSetPrice}
              disabled={isExecuting}
              startIcon={
                isExecuting && executingAction.includes('Setting') ? <CircularProgress size={16} /> : undefined
              }
            >
              {isExecuting && executingAction.includes('Setting') ? 'Setting...' : 'Update Price'}
            </Button>
          )}
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
