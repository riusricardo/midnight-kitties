# 🐱 Midnight Kitties

<div align="center">

[![Midnight Network](https://midnight.network/brand-hub/logo-dark.svg)](https://midnight.network)

[![Compact](https://img.shields.io/badge/Compact-Language-blue?style=for-the-badge)](https://docs.midnight.network)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org)

*A comprehensive CryptoKitties-inspired NFT implementation showcasing Midnight blockchain capabilities and Compact language innovation*

</div>

## Project Overview

**Midnight Kitties** is a decentralized application that demonstrates the capabilities of the Midnight blockchain ecosystem. This project serves as a showcase of the **Compact programming language**, showing how smart contracts can be built using Midnight's innovative technology stack.

The application implements a CryptoKitties-inspired NFT system with breeding mechanics and marketplace functionality.

### Key Features

- **Compact Language Learning** - A practical example of building with Midnight's Compact programming language
- **NFT Module Integration** - Uses external NFT modules from the midnight-contracts repository
- **Complete NFT System** - Includes breeding, trading, and ownership mechanics
- **Full-Stack Application** - Web UI, CLI tools, APIs, and testing framework
- **Genetic Breeding System** - Basic breeding mechanics with DNA inheritance and generation tracking

## Technical Architecture

This project shows how different components work together in the Midnight ecosystem:

```
  ┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
  │    Web Frontend     │    │    CLI Interface    │    │   Smart Contract    │
  │                     │    │                     │    │                     │
  │ • React + Material  │    │ • Interactive Menu  │    │ • Compact Language  │
  │ • Wallet Connect    │◄──►│ • Contract Deploy   │◄──►│ • NFT Integration   │
  │ • Real-time State   │    │ • Breeding Tools    │    │ • Breeding Logic    │
  │ • Gallery View      │    │ • Market Operations │    │ • Marketplace Logic │
  └─────────────────────┘    └─────────────────────┘    └─────────────────────┘
           │                          │                          │
           └──────────────────────────┼──────────────────────────┘
                                      │
                           ┌─────────────────────┐
                           │   Unified API       │
                           │                     │
                           │ • Ledger Integration│
                           │ • State Management  │
                           │ • Type Safety       │
                           │ • Browser/Node.js   │
                           └─────────────────────┘
```

### External NFT Module Integration

This project demonstrates how to integrate external NFT modules from the [`midnight-contracts`](https://github.com/riusricardo/midnight-contracts) repository. The smart contract imports and extends NFT functionality, showing:

- **Modular Design** - Using pre-built, reusable NFT components
- **Standard Operations** - Full ERC-721-compatible interface through external modules  
- **Code Reuse** - Building on existing implementations rather than starting from scratch
- **Custom Extensions** - Adding CryptoKitties-specific features on top of standard NFT operations

## Project Structure & Components

### Core Applications
- **`apps/web/`** - React web application featuring:
  - Interactive kitty gallery and breeding interface
  - Midnight Lace wallet integration
  - Real-time contract state synchronization
  - Responsive Material-UI design

### Smart Contracts
- **`packages/contracts/kitties/`** - Compact language implementation:
  - CryptoKitties-inspired breeding mechanics
  - Genetic algorithm for DNA inheritance
  - Marketplace with offer/approval system
  - Integration with external NFT standard modules

### API Layer  
- **`packages/api/kitties/`** - Unified API abstraction:
  - Cross-platform compatibility (Browser/Node.js)
  - Provider pattern for blockchain interactions
  - Type-safe contract bindings
  - Transaction management utilities

### Development Tools
- **`packages/cli/kitties/`** - Comprehensive CLI toolkit:
  - Contract deployment and management
  - Interactive breeding and trading operations
  - Development environment utilities
  - Testing and debugging tools

### Supporting Infrastructure
- **`packages/ui/`** - Reusable React component library
- **`packages/compact/`** - Smart contract compilation tools
- **`packages/eslint-config/`** & **`packages/typescript-config/`** - Shared development configurations

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18 or higher
- **Yarn** package manager
- **Midnight Lace Wallet** (for web interface)

### Quick Installation
```bash
# Clone and install dependencies
git clone https://github.com/riusricardo/midnight-kitties.git
cd midnight-kitties
yarn install

# Build all packages
yarn build
```

### 🌐 Web Application
```bash
# Launch the React frontend
yarn start
# Access at http://127.0.0.1:8080/
```

### 💻 CLI Operations  
```bash
# Interactive CLI with testnet (external proof server)
yarn kitties-cli-remote

# CLI with integrated proof server
yarn kitties-cli-remote-ps
```

**CLI Features:**
- 🚀 Deploy new kitty contracts
- 🐱 Create and manage kitties  
- 🧬 Breed kitties with genetic inheritance
- 💰 Marketplace operations (buy/sell/offer)
- 📊 Contract statistics (# of Kitties in existence)
- 🧐​ Query kitty details and ownership
- 🖼️ Direct access to selected NFT module circuits 

## Compact Language & Smart Contract

This project is a practical exploration of the **Compact programming language**. The smart contract demonstrates how to build NFT functionality while integrating external modules.

### Smart Contract Architecture

The [`kitties.compact`](packages/contracts/kitties/src/kitties.compact) contract is built using external NFT modules from [`midnight-contracts`](https://github.com/riusricardo/midnight-contracts):

**1. External NFT Module Import**
```compact
import "midnight-contracts/contracts/tokens/nft/src/modules/Nft";

// Export standard NFT operations directly from the module
export {
  balanceOf,        // Get number of tokens owned by an address
  ownerOf,          // Get owner of a specific token
  approve,          // Approve another address to transfer a token
  getApproved,      // Get approved address for a token
  setApprovalForAll, // Set approval for all tokens
  isApprovedForAll  // Check if address is approved for all tokens
};
```

**2. CryptoKitties Data Structures**
```compact
export struct Kitty {
  dna: Field,                // Unique genetic identifier (32 bytes)
  gender: Gender,            // Male or Female enum
  owner: ZswapCoinPublicKey, // Current owner's public key
  price: Uint<64>,           // Sale price (0 if not for sale)
  forSale: Boolean,          // Whether kitty is available for purchase
  generation: Uint<32>       // Breeding generation (0 = original)
}

export struct Offer {
  kittyId: Uint<64>,         // ID of kitty being offered on
  buyer: ZswapCoinPublicKey, // Address making the offer
  price: Uint<64>            // Offered price
}
```

**3. Contract State Management**
```compact
export ledger kitties: Map<Uint<64>, Kitty>;           // All kitty data
export ledger allKittiesCount: Counter;                // Total kitties created
export ledger genderSelector: Boolean;                 // Alternates gender assignment
export ledger buyOffers: Map<Uint<64>, Map<ZswapCoinPublicKey, Offer>>; // Marketplace offers
```

### Available Operations

**NFT Standard Operations** (from external module):
- `balanceOf(owner)` - Get token count for an address
- `ownerOf(tokenId)` - Get owner of a specific kitty
- `approve(to, tokenId)` - Approve transfer of a kitty
- `getApproved(tokenId)` - Check who's approved for a kitty
- `setApprovalForAll(operator, approved)` - Set operator approval
- `isApprovedForAll(owner, operator)` - Check operator approval status

**CryptoKitties-Specific Operations**:
- `createKitty()` - Mint a new kitty with random DNA
- `transferKitty(to, kittyId)` - Transfer kitty to another address
- `setPrice(kittyId, price)` - Put kitty up for sale
- `createBuyOffer(kittyId, bidPrice)` - Make an offer on a kitty
- `approveOffer(kittyId, buyer)` - Accept an offer (transfers ownership)
- `breedKitty(kittyId1, kittyId2)` - Breed two kitties to create offspring
- `getKitty(kittyId)` - Get kitty details
- `getAllKittiesCount()` - Get total number of kitties
- `getOffer(kittyId, buyer)` - Get specific offer details

### Breeding System

The contract includes a simple breeding mechanism:
- Two kitties can be bred to create a new offspring
- DNA is combined using a pseudo-random algorithm
- Generation number increments from the highest parent generation
- Basic genetic inheritance simulates trait passing

This demonstrates how Compact can handle complex logic while maintaining integration with external modules.

## NFT Module Integration

This project demonstrates how to work with external NFT modules from the [`midnight-contracts`](https://github.com/riusricardo/midnight-contracts) repository:

### What This Approach Provides:
- **Time Saving** - No need to implement standard NFT functionality from scratch
- **Reliability** - Uses tested NFT implementations as a foundation
- **Modularity** - Clean separation between standard and custom functionality  
- **Learning** - Shows how to build on existing Midnight infrastructure

### Integration Benefits:
The external NFT module handles all the standard ERC-721 operations (balanceOf, ownerOf, approve, etc.), while our contract focuses on the CryptoKitties-specific logic like breeding, marketplace, and genetic systems. This demonstrates a practical approach to smart contract development where you can focus on your unique features rather than reimplementing common patterns.

## 🧪 Development & Testing

### Building the Project
```bash
# Compile smart contracts
yarn compact

# Build all packages
yarn build

# Build specific components
yarn build:contracts
yarn build:api
yarn build:cli
yarn build:ui
yarn build:app
```

### Testing Suite
```bash
# Run contract simulation tests
yarn test-contract

# Run API integration tests  
yarn test-api

# Test against live testnet
yarn test-against-testnet
```

### Code Quality
```bash
# Lint all packages
yarn lint

# Format code
yarn format
```

## Why This Project Matters

**Midnight Kitties** serves as a practical example for the Midnight ecosystem:

### Learning Compact Language
- **Hands-on Example** - Shows real-world Compact programming patterns
- **Best Practices** - Demonstrates good patterns for data structures and state management
- **External Modules** - Shows how to integrate and extend existing functionality
- **Reference Implementation** - Provides a foundation for other developers to learn from

### Ecosystem Development  
- **Module Integration** - Demonstrates how to use external contract modules effectively
- **Development Patterns** - Establishes patterns for code reuse in Midnight projects
- **Community Building** - Provides a foundation for other NFT projects on Midnight

## Documentation

- [Contract Development Guide](packages/contracts/kitties/README.md)
- [API Reference](packages/api/kitties/README.md)
- [CLI Usage Guide](packages/cli/kitties/README.md)
- [Environment Abstraction](packages/api/kitties/ENVIRONMENT_ABSTRACTION.md)
- [Path Resolution](packages/api/kitties/PATH_RESOLUTION.md)

## Documentation & Resources

- **[Contract Source Code](packages/contracts/kitties/src/kitties.compact)** - Complete Compact implementation
- **[API Documentation](packages/api/kitties/README.md)** - Comprehensive API reference  
- **[CLI Guide](packages/cli/kitties/README.md)** - Command-line interface documentation
- **[Environment Setup](packages/api/kitties/ENVIRONMENT_ABSTRACTION.md)** - Development environment guide
- **[Path Resolution](packages/api/kitties/PATH_RESOLUTION.md)** - Module resolution documentation

## Contributing

This project welcomes contributions and questions from anyone interested in learning about Midnight development:

### How to Contribute:
- **Ask Questions** - Open issues if anything is unclear
- **Report Bugs** - Help improve the codebase
- **Suggest Improvements** - Ideas for better examples or documentation
- **Add Examples** - More test cases or usage examples
- **Improve UI** - Make the interface more user-friendly

### Development Process:
1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Ensure all checks pass
5. Submit a pull request

---

## 📄 License

This project is licensed under the **GNU General Public License v3.0** - see the [LICENSE](LICENSE) file for details.

### What this means:

- ✅ **Free to use** in open source projects
- ✅ **Free to modify** and distribute
- ⚠️ **Must remain open source** if distributed
- ⚠️ **Must include license notice** in derivative works

---

**Built with ❤️ for the Midnight ecosystem**

_Empowering developers to build privacy-first applications with confidence._

---

<div align="center">

[🌐 Midnight Network](https://midnight.network) • [📚 Documentation](https://docs.midnight.network) • [💬 Community](https://discord.gg/midnight)

</div>
