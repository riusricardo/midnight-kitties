# 🌙 Midnight Counter App Playground

<div align="center">

[![Midnight Network](https://img.shields.io/badge/Midnight-Network-purple?style=for-the-badge)](https://midnight.network)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)

*A comprehensive monorepo template for building privacy-preserving applications on the Midnight blockchain*

</div>

## 🚀 Overview

The **Midnight Counter App Template** is a full-featured monorepo showcasing how to build privacy-preserving decentralized applications on the Midnight blockchain. This template demonstrates smart contract development, wallet integration, credential management, and age verification using zero-knowledge proofs.

### ✨ Key Features

- 🔒 **Privacy-Preserving Smart Contracts** - Built with Compact language for zero-knowledge computations
- 👤 **Age Verification System** - Credential management with ZK proofs
- 🌐 **Multi-Platform Support** - Web UI, CLI tools, and API libraries
- 🔐 **Wallet Integration** - Seamless integration with Midnight Lace wallet
- 🧪 **Testing Framework** - Comprehensive unit tests and simulation tools
- 🛠️ **Developer Tools** - CLI utilities for contract deployment and testing

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Web App UI    │    │   CLI Tools      │    │  Smart Contract │
│                 │    │                  │    │                 │
│ • React Frontend│    │ • Contract Deploy│    │ • Counter Logic │
│ • Wallet Connect│◄──►│ • Credential Mgmt│◄──►│ • Age Verify    │
│ • Age Verify    │    │ • Testing Utils  │    │ • ZK Proofs     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                        ┌──────────────────┐
                        │   Counter API    │
                        │                  │
                        │ • Core Logic     │
                        │ • Provider Setup │
                        │ • Type Defs      │
                        └──────────────────┘
```

## 📦 Project Structure

### 🎯 Applications

- **`apps/web/`** - React web application with Material-UI
  - Interactive counter interface
  - Midnight Lace wallet integration
  - Age verification forms
  - Real-time contract state updates

### 📚 Core Packages

- **`packages/contracts/counter/`** - Smart contract implementation
  - Compact language source code
  - Unit tests and simulators
  - ZK circuit generation

- **`packages/api/counter/`** - Unified API layer
  - Browser and Node.js compatibility
  - Provider abstractions
  - Contract interaction utilities

- **`packages/cli/counter/`** - Command-line interface
  - Contract deployment tools
  - Credential management system
  - Development and testing utilities

### 🛠️ Supporting Packages

- **`packages/ui/`** - Reusable React components
- **`packages/eslint-config/`** - Shared linting configuration
- **`packages/typescript-config/`** - TypeScript configurations
- **`packages/compact/`** - Smart contract compilation tools

## 🎮 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **Yarn** package manager
- **Midnight Lace Wallet** (for web UI)

### Installation

```bash
# Install dependencies
yarn install

# Build all packages
yarn build
```

### 🌐 Running the Web Application

```bash
# Start the React web app
yarn start
```

The web application will be available at `http://localhost:3000`

### 💻 Using the CLI

#### Basic Counter Operations

```bash
# Run CLI on testnet (without proof server)
yarn counter-cli-remote

# Run CLI with integrated proof server
yarn counter-cli-remote-ps
```

#### CLI Features

The CLI provides an interactive menu with the following options:

1. **🚀 Deploy Contract** - Deploy a new counter contract
2. **🔗 Connect to Contract** - Connect to an existing contract
3. **➕ Increment Counter** - Increment the counter value (requires age verification)
4. **📊 View Counter** - Display current counter value
5. **👤 Set Credentials** - Configure your age verification credentials
6. **✅ Check Verification** - View your verification status

#### Credential Management

The CLI includes a comprehensive credential management system:

```bash
# Set your credentials (interactive prompts)
Enter your first name: John
Enter your last name: Doe
Enter your birth year (YYYY): 1990
Enter your birth month (1-12): 5
Enter your birth day (1-31): 15
```

**Note**: You must be at least 21 years old to increment the counter, as verified through zero-knowledge proofs.

## 🔐 Smart Contract Details

### Contract Features

The counter contract demonstrates:

- **Public State Management** - Maintains a counter value on the blockchain
- **Age Verification** - Requires proof of being 21+ to increment
- **Credential Storage** - Securely stores user credentials in private state
- **Zero-Knowledge Proofs** - Verifies age without revealing exact birthdate

### Contract Source

```compact
// Public ledger state
export ledger round: Counter;

// Private state for credentials
circuit privateState: CredentialSubject;

// Increment function with age verification
export circuit increment(): [] {
  // Verify user is at least 21 years old
  require(isAtLeast21(privateState.birth_timestamp));
  
  // Increment the counter
  round.increment(1);
}
```

### Building the Contract

```bash
# Compile the smart contract
yarn compact

# Run contract tests
yarn test-contract

# Generate ZK circuits (production)
yarn compact --zk
```

## 🧪 Testing

### Integration Tests

```bash
# Run API integration tests
yarn test-api

# Run contract simulation tests
yarn test-contract
```

## 🔧 Development

### Building

```bash
# Build all packages
yarn build

# Build specific package
yarn workspace @midnight-ntwrk/counter-contract build
```

### Linting

```bash
# Lint all packages
yarn lint

# Fix linting issues
yarn lint:fix
```

### Type Checking

```bash
# Type check all packages
yarn typecheck
```

## 🌟 Key Concepts

### Privacy-Preserving Credentials

This template showcases how to implement privacy-preserving credential management:

- **Private State Storage** - User credentials stored securely in contract private state
- **Zero-Knowledge Age Verification** - Prove you're 21+ without revealing exact age
- **Wallet-Based Identity** - Credentials tied to wallet public keys for security

### Midnight Blockchain Integration

- **Compact Smart Contracts** - Privacy-focused smart contract language
- **ZK Circuit Generation** - Automatic zero-knowledge proof generation
- **Wallet Provider Integration** - Seamless wallet connectivity
- **State Management** - Both public and private state handling

## 📖 Documentation

- [Contract Development Guide](packages/contracts/counter/README.md)
- [API Reference](packages/api/counter/README.md)
- [CLI Usage Guide](packages/cli/counter/README.md)
- [Environment Abstraction](packages/api/counter/ENVIRONMENT_ABSTRACTION.md)
- [Path Resolution](packages/api/counter/PATH_RESOLUTION.md)

## 🤝 Contributing

We welcome contributions! Please read our contribution guidelines and:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Add tests for new features
- Update documentation as needed
- Ensure all linting passes

## 📄 License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Comprehensive guides in each package
- **Issues**: Report bugs and request features via GitHub Issues
- **Community**: Join the Midnight Network community for discussions

---

<div align="center">

**Built with ❤️ for the Midnight Network ecosystem**

[🌐 Website](https://midnight.network) • [📚 Docs](https://docs.midnight.network) • [💬 Community](https://discord.gg/midnight)

</div>
yarn counter-cli-remote-ps
```

## The Counter Contract

The [counter-contract](packages/contracts/counter) subdirectory contains:

- the [smart contract](packages/contracts/counter/src/counter.compact)
- some [unit tests](packages/contracts/counter/src/test/counter.test.ts) to test the smart contract

### Building the Smart Contract

Compile the contract:

```bash
yarn compact
```

You should see the following output from npm and the Compact compiler:

```bash
> compact
> compactc --skip-zk packages/contracts/counter/src/counter.compact packages/contracts/counter/src/managed/counter

Compactc version: 0.24.0
```

The compiler will complete very quickly because we've instructed it to skip ZK key generation with the option `--skip-zk`. The compiler's output files will be placed in the directory `packages/contracts/counter/src/managed/counter`.

**Run contract's tests:**

```bash
yarn test-contract
```

Test Files 1 passed (1) - Tests 3 passed (3)

## Contributing

Contributions are welcome! Please open issues or pull requests as needed.

---

For more details, see the README files in each package or app directory.
