import { useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";

// Sepolia chain ID
const SEPOLIA_CHAIN_ID = 11155111;
const SEPOLIA_CHAIN_ID_HEX = "0xaa36a7";

export interface UseWalletReturn {
  address: string;
  isConnected: boolean;
  chainId: number | null;
  isConnecting: boolean;
  error: string | null;
  signer: ethers.Signer | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export function useWallet(): UseWalletReturn {
  const [address, setAddress] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);

  // Handle account changes
  const handleAccountsChanged = useCallback((accounts: unknown) => {
    const accountsArray = accounts as string[];
    if (accountsArray.length === 0) {
      setAddress("");
      setIsConnected(false);
      setSigner(null);
    } else {
      setAddress(accountsArray[0]);
      setIsConnected(true);
    }
  }, []);

  // Handle chain changes
  const handleChainChanged = useCallback((chainIdHex: unknown) => {
    const newChainId = parseInt(chainIdHex as string, 16);
    setChainId(newChainId);
    if (newChainId !== SEPOLIA_CHAIN_ID) {
      setError("Please switch to Sepolia testnet");
    } else {
      setError(null);
    }
  }, []);

  // Setup event listeners
  useEffect(() => {
    if (!window.ethereum) return;

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener("chainChanged", handleChainChanged);
    };
  }, [handleAccountsChanged, handleChainChanged]);

  // Connect wallet
  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError("MetaMask not found. Please install MetaMask.");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Request accounts first
      await window.ethereum.request({ method: "eth_requestAccounts" });

      // Get chain ID directly from provider (more reliable)
      const chainIdHex = await window.ethereum.request({ method: "eth_chainId" }) as string;
      const currentChainId = parseInt(chainIdHex, 16);
      console.log("Connected to chain:", currentChainId, "(hex:", chainIdHex, ") Expected:", SEPOLIA_CHAIN_ID);
      setChainId(currentChainId);

      // Compare as numbers - if wrong chain, try to switch
      if (currentChainId !== SEPOLIA_CHAIN_ID) {
        console.log("Wrong chain, attempting to switch to Sepolia...");
        try {
          await window.ethereum!.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
          });
          // Re-check after switch
          const newChainIdHex = await window.ethereum!.request({ method: "eth_chainId" }) as string;
          const newChainId = parseInt(newChainIdHex, 16);
          setChainId(newChainId);
          if (newChainId !== SEPOLIA_CHAIN_ID) {
            setError("Failed to switch to Sepolia testnet");
            setIsConnecting(false);
            return;
          }
        } catch (switchError: unknown) {
          // Chain not added to MetaMask, try to add it
          const err = switchError as { code?: number };
          if (err.code === 4902) {
            try {
              await window.ethereum!.request({
                method: "wallet_addEthereumChain",
                params: [{
                  chainId: SEPOLIA_CHAIN_ID_HEX,
                  chainName: "Sepolia Testnet",
                  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                  rpcUrls: ["https://ethereum-sepolia-rpc.publicnode.com"],
                  blockExplorerUrls: ["https://sepolia.etherscan.io"],
                }],
              });
            } catch {
              setError("Please add Sepolia network to MetaMask");
              setIsConnecting(false);
              return;
            }
          } else {
            setError("Please switch to Sepolia testnet in MetaMask");
            setIsConnecting(false);
            return;
          }
        }
      }

      // Create provider and signer after chain is confirmed
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      console.log("Connected address:", address);

      setSigner(signer);
      setAddress(address);
      setIsConnected(true);
      setError(null);
    } catch (err) {
      console.error("Connection failed:", err);
      setError("Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    setAddress("");
    setIsConnected(false);
    setChainId(null);
    setSigner(null);
    setError(null);
  }, []);

  return {
    address,
    isConnected,
    chainId,
    isConnecting,
    error,
    signer,
    connect,
    disconnect,
  };
}

// Window type declaration for ethereum
declare global {
  interface Window {
    ethereum?: ethers.Eip1193Provider & {
      on: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
    };
  }
}
