# Private Messenger - Zama FHEVM

A simple private onchain messenger using Zama's Fully Homomorphic Encryption (FHE) technology. Messages are encrypted end-to-end - only the sender and recipient can decrypt them.

## Project Structure

```
├── contracts/
│   └── PrivateMessenger.sol    # Smart contract
├── scripts/
│   └── deploy.ts               # Deployment script
├── frontend/
│   └── src/
│       ├── App.tsx             # Main app
│       ├── core/
│       │   └── fhevm.ts        # SDK initialization
│       ├── hooks/
│       │   ├── useWallet.ts    # Wallet connection
│       │   ├── useFhevm.ts     # SDK state management
│       │   ├── useEncrypt.ts   # Encryption operations
│       │   ├── useDecrypt.ts   # Decryption operations
│       │   └── useMessenger.ts # Composed hook
│       └── components/
│           ├── SendMessage.tsx
│           └── Inbox.tsx
├── hardhat.config.ts
└── package.json
```

## Deployed Contract

**Network:** Sepolia Testnet
**Contract Address:** `0x4FEb9302Ff4841b699FF96cC52Bc0Bda865C2466`

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
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
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

Create `frontend/.env` (already configured with deployed contract):

```bash
VITE_CONTRACT_ADDRESS=0x4FEb9302Ff4841b699FF96cC52Bc0Bda865C2466
```

### 5. Run Frontend

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

## Usage

1. **Connect Wallet** - Connect MetaMask (auto-switches to Sepolia if needed)
2. **Send Message** - Enter recipient address and message (max 8 chars)
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

- Message content limited to 8 characters (stored as euint64)
- Requires Sepolia testnet
- Experimental - not for production use
