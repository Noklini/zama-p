# Private Messenger - Zama FHEVM

A simple private onchain messenger using Zama's Fully Homomorphic Encryption (FHE) technology. Messages are encrypted end-to-end - only the sender and recipient can decrypt them.

## Project Structure

```
messenger/
├── contracts/
│   └── PrivateMessenger.sol    # Smart contract
├── scripts/
│   └── deploy.ts               # Deployment script
├── frontend/
│   └── src/
│       ├── App.tsx             # Main app
│       ├── hooks/
│       │   └── useMessenger.ts # SDK integration
│       └── components/
│           ├── SendMessage.tsx
│           └── Inbox.tsx
├── hardhat.config.ts
└── package.json
```

## Prerequisites

- Node.js >= 18
- MetaMask wallet with Sepolia ETH
- Sepolia testnet configured in MetaMask

## Setup

### 1. Install Contract Dependencies

```bash
cd messenger
npm install
```

### 2. Configure Environment

Create `.env` file:

```bash
SEPOLIA_RPC_URL=https://eth-sepolia.public.blastapi.io
PRIVATE_KEY=your_private_key_here
```

### 3. Compile & Deploy Contract

```bash
npm run compile
npm run deploy:sepolia
```

Save the deployed contract address from the output.

### 4. Setup Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```bash
VITE_CONTRACT_ADDRESS=0x_your_deployed_contract_address
```

### 5. Run Frontend

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

## Usage

1. **Connect Wallet** - Connect MetaMask (must be on Sepolia)
2. **Send Message** - Enter recipient address and message (max 32 chars)
3. **Receive Messages** - Click "Refresh" to load and decrypt your inbox

## How It Works

1. Messages are encrypted client-side using Zama's Relayer SDK
2. The encrypted message is stored on-chain
3. ACL permissions are granted to sender and recipient
4. Recipients decrypt messages by signing an EIP-712 request

## Tech Stack

- **Smart Contract**: Solidity 0.8.24 + @fhevm/solidity
- **Deployment**: Hardhat + @fhevm/hardhat-plugin
- **Frontend**: React 18 + Vite + TypeScript
- **Encryption SDK**: @zama-fhe/relayer-sdk
- **Network**: Ethereum Sepolia Testnet

## Limitations

- Message content limited to 32 characters (stored as euint256)
- Requires Sepolia testnet
- Experimental - not for production use
