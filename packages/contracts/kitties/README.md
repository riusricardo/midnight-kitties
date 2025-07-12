# Kitties Contract Development Guide

This directory contains the Compact smart contract implementation for the CryptoKitties-inspired NFT system.

## Contract Overview

The [`kitties.compact`](src/kitties.compact) contract demonstrates:
- Integration with external NFT modules from [`midnight-contracts`](https://github.com/riusricardo/midnight-contracts)
- CryptoKitties-specific breeding and marketplace functionality
- Complex data structures and state management in Compact

## File Structure

```
src/
├── kitties.compact          # Main contract source code
├── index.ts                 # TypeScript exports
├── witnesses.ts             # Witness functions
├── test/
│   ├── kitties.test.ts     # Contract unit tests
│   └── kitties-simulator.ts # Test simulator
└── managed/                # Compiled contract output
    └── kitties/
        └── contract/       # Generated contract code
```

## Building the Contract

### Prerequisites
- Node.js v18+
- Yarn package manager
- Compact compiler (`compactc`)

### Compilation
```bash
# Compile the contract (skips ZK key generation for development)
yarn compact

# With ZK key generation (for production)
yarn compact --zk
```

The compiler outputs generated code to `src/managed/kitties/contract/`.

### Testing
```bash
# Run contract simulation tests
yarn test

# Run with coverage
yarn test --coverage
```

## Contract Architecture

### External Module Integration

The contract imports standard NFT functionality:

```compact
import "midnight-contracts/contracts/tokens/nft/src/modules/Nft";

// Export standard NFT operations
export {
  balanceOf,
  ownerOf,
  approve,
  getApproved,
  setApprovalForAll,
  isApprovedForAll
};
```

### Data Structures

**Kitty Structure:**
```compact
export struct Kitty {
  dna: Field,                // 32-byte unique identifier
  gender: Gender,            // Male/Female enum
  owner: ZswapCoinPublicKey, // Owner's public key
  price: Uint<64>,           // Sale price (0 = not for sale)
  forSale: Boolean,          // Sale status flag
  generation: Uint<32>       // Breeding generation
}
```

**Offer Structure:**
```compact
export struct Offer {
  kittyId: Uint<64>,         // Target kitty ID
  buyer: ZswapCoinPublicKey, // Buyer's public key  
  price: Uint<64>            // Offered price
}
```

### State Management

**Contract Ledgers:**
- `kitties: Map<Uint<64>, Kitty>` - All kitty data
- `allKittiesCount: Counter` - Total kitties minted
- `genderSelector: Boolean` - Alternates gender assignment
- `buyOffers: Map<Uint<64>, Map<ZswapCoinPublicKey, Offer>>` - Marketplace offers

## Core Operations

### Kitty Management
- `createKitty()` - Mint new kitty with random DNA
- `transferKitty(to, kittyId)` - Transfer ownership
- `getKitty(kittyId)` - Query kitty details
- `getAllKittiesCount()` - Get total kitty count

### Marketplace
- `setPrice(kittyId, price)` - List kitty for sale
- `createBuyOffer(kittyId, bidPrice)` - Make purchase offer
- `approveOffer(kittyId, buyer)` - Accept offer and transfer
- `getOffer(kittyId, buyer)` - Query offer details

### Breeding System
- `breedKitty(kittyId1, kittyId2)` - Create offspring from two parents
- DNA combination using pseudo-random algorithm
- Generation tracking (offspring = max(parent generations) + 1)

## Testing Framework

### Simulator Pattern

The [`kitties-simulator.ts`](src/test/kitties-simulator.ts) provides a test harness:

```typescript
const simulator = new KittiesSimulator();

// Create test users
const alice = simulator.createPublicKey("Alice");
const bob = simulator.createPublicKey("Bob");

// Test operations
simulator.createKitty();
simulator.setPrice(1n, 100n);
simulator.switchUser(bob);
simulator.createBuyOffer(1n, 120n);
```

### Test Categories

1. **Basic Operations** - Minting, transfers, ownership
2. **Marketplace** - Pricing, offers, approvals
3. **Breeding System** - Genetic inheritance, generation tracking
4. **NFT Standard** - ERC-721 compliance via external module
5. **Edge Cases** - Error conditions, boundary testing

## Development Workflow

### 1. Contract Changes
```bash
# Compile
yarn compact
yarn build
# Test
yarn test
```

```bash
 ✓ src/test/kitties.test.ts (16 tests) 716ms
   ✓ Kitties Contract Tests > should create a new kitty 46ms
   ✓ Kitties Contract Tests > should transfer kitty between users 37ms
   ✓ Kitties Contract Tests > should set price and make kitty for sale 20ms
   ✓ Kitties Contract Tests > should allow transferring a kitty 37ms
   ✓ Kitties Contract Tests > should handle offer-based buying system 72ms
   ✓ Kitties Contract Tests > should handle multiple offers for the same kitty 87ms
   ✓ Kitties Contract Tests > should handle offer rejection scenarios 65ms
   ✓ Kitties Contract Tests > should enforce minimum price for offers 34ms
   ✓ Kitties Contract Tests > should enforce for-sale requirement for offers 32ms
   ✓ Kitties Contract Tests > should breed two kitties 39ms
   ✓ Kitties Contract Tests > should handle multiple generations of breeding 55ms
   ✓ Kitties Contract Tests > should handle NFT approvals 28ms
   ✓ Kitties Contract Tests > should handle operator approvals 10ms
   ✓ Kitties Contract Tests > should handle zero balance correctly 17ms
   ✓ Kitties Contract Tests > should handle large token IDs 103ms
   ✓ Kitties Contract Tests > should generate different DNA for each kitty 33ms

 Test Files  1 passed (1)
      Tests  16 passed (16)

```

### 2. Adding New Features
1. Update contract source code
2. Add corresponding tests
3. Update TypeScript exports if needed
4. Verify all tests pass

### 3. Integration Testing
```bash
# Test against API layer
cd ../../api/kitties
yarn test-api
```

## Deployment Considerations

### Local Development
- Uses `--skip-zk` flag for faster compilation
- Test against local Midnight node

### Testnet Deployment
- Generate full ZK circuits with `yarn compact --zk`
- Test thoroughly before mainnet

## Common Issues

### Compilation Errors
- Check Compact compiler version compatibility
- Verify import paths
- Set the `COMPACT_PATH` environment variable before compiling
    - Ensure midnight-contracts dependency is available

## Further Reading

- [Compact Language Documentation](https://docs.midnight.network)
- [midnight-contracts Repository](https://github.com/riusricardo/midnight-contracts)
- [Midnight Network Developer Guide](https://docs.midnight.network)
