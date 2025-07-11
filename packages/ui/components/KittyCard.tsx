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

/* global console, window */
import React, { useState, useEffect } from 'react';
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

  return (
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
      <div style={{ marginBottom: '12px' }}>
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

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {onTransfer && (
          <button
            onClick={() => onTransfer(kitty.id)}
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '12px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#0056b3';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#007bff';
            }}
          >
            Transfer
          </button>
        )}

        {onSetPrice && (
          <button
            onClick={() => {
              const priceInput = window.prompt('Enter new price (0 to remove from sale):');
              if (priceInput !== null) {
                const price = BigInt(priceInput || '0');
                onSetPrice(kitty.id, price);
              }
            }}
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '12px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#1e7e34';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#28a745';
            }}
          >
            Set Price
          </button>
        )}
      </div>

      {/* For Sale Badge */}
      {kitty.forSale && (
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            backgroundColor: '#28a745',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '12px',
            fontSize: '10px',
            fontWeight: 'bold',
          }}
        >
          FOR SALE
        </div>
      )}
    </div>
  );
};

export default KittyCard;
