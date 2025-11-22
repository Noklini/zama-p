import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk/web";
import type { FhevmInstance } from "@zama-fhe/relayer-sdk/web";
import { MESSENGER_ABI, CONTRACT_ADDRESS } from "../contractABI";

// Message type for UI
export interface Message {
  sender: string;
  content: string;
  timestamp: Date;
  encrypted: boolean;
  handle?: string;
}

// Sepolia chain ID
const SEPOLIA_CHAIN_ID = 11155111;

export function useMessenger() {
  const [instance, setInstance] = useState<FhevmInstance | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [userAddress, setUserAddress] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inbox, setInbox] = useState<Message[]>([]);

  // Initialize Relayer SDK instance
  useEffect(() => {
    async function initSDK() {
      try {
        const inst = await createInstance(SepoliaConfig);
        setInstance(inst);
        console.log("Relayer SDK initialized");
      } catch (err) {
        console.error("Failed to initialize Relayer SDK:", err);
        setError("Failed to initialize encryption");
      }
    }
    initSDK();
  }, []);

  // Connect wallet
  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError("Please install MetaMask");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);

      // Check network
      const network = await provider.getNetwork();
      if (network.chainId !== BigInt(SEPOLIA_CHAIN_ID)) {
        setError("Please switch to Sepolia testnet");
        setIsLoading(false);
        return;
      }

      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      setSigner(signer);
      setUserAddress(address);
      setIsConnected(true);
    } catch (err) {
      console.error("Connection failed:", err);
      setError("Failed to connect wallet");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    setSigner(null);
    setUserAddress("");
    setIsConnected(false);
    setInbox([]);
  }, []);

  // Send encrypted message
  const sendMessage = useCallback(
    async (recipient: string, messageContent: string) => {
      if (!instance || !signer || !userAddress) {
        setError("Not connected");
        return false;
      }

      if (!CONTRACT_ADDRESS) {
        setError("Contract address not configured");
        return false;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Convert message to BigInt (max 32 bytes for euint256)
        const messageBytes = new TextEncoder().encode(messageContent);
        const paddedBytes = new Uint8Array(32);
        paddedBytes.set(messageBytes.slice(0, 32));
        const messageValue = BigInt(
          "0x" +
            Array.from(paddedBytes)
              .map((b) => b.toString(16).padStart(2, "0"))
              .join("")
        );

        // Create encrypted input using Relayer SDK
        const input = instance.createEncryptedInput(CONTRACT_ADDRESS, userAddress);
        input.add256(messageValue);
        const encrypted = await input.encrypt();

        // Send transaction
        const contract = new ethers.Contract(CONTRACT_ADDRESS, MESSENGER_ABI, signer);
        const tx = await contract.sendMessage(
          recipient,
          encrypted.handles[0],
          encrypted.inputProof
        );

        await tx.wait();
        return true;
      } catch (err) {
        console.error("Send failed:", err);
        setError("Failed to send message");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [instance, signer, userAddress]
  );

  // Decrypt messages using EIP-712 signature
  const decryptMessages = useCallback(
    async (handles: string[]): Promise<Map<string, string>> => {
      if (!instance || !signer || !userAddress) {
        return new Map();
      }

      try {
        // Generate keypair for decryption
        const keypair = instance.generateKeypair();

        // Create handle-contract pairs
        const handleContractPairs = handles.map((handle) => ({
          handle,
          contractAddress: CONTRACT_ADDRESS,
        }));

        // Current timestamp and duration (7 days validity)
        const startTimestamp = Math.floor(Date.now() / 1000);
        const durationDays = 7;

        // Create EIP-712 message for signing
        const eip712Message = instance.createEIP712(
          keypair.publicKey,
          [CONTRACT_ADDRESS],
          startTimestamp,
          durationDays
        );

        // Sign the message
        const signature = await signer.signTypedData(
          eip712Message.domain,
          eip712Message.types,
          eip712Message.message
        );

        // Decrypt the values
        const decryptedResults = await instance.userDecrypt(
          handleContractPairs,
          keypair.privateKey,
          keypair.publicKey,
          signature,
          [CONTRACT_ADDRESS],
          userAddress,
          startTimestamp,
          durationDays
        );

        // Convert decrypted BigInts back to strings
        const result = new Map<string, string>();
        for (const [handle, value] of Object.entries(decryptedResults)) {
          if (typeof value === "bigint") {
            const hex = value.toString(16).padStart(64, "0");
            const bytes = new Uint8Array(32);
            for (let i = 0; i < 32; i++) {
              bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
            }
            // Find the end of the message (null terminator or end of bytes)
            let endIndex = bytes.findIndex((b) => b === 0);
            if (endIndex === -1) endIndex = 32;
            const messageText = new TextDecoder().decode(bytes.slice(0, endIndex));
            result.set(handle, messageText);
          } else {
            result.set(handle, String(value));
          }
        }

        return result;
      } catch (err) {
        console.error("Decryption failed:", err);
        return new Map();
      }
    },
    [instance, signer, userAddress]
  );

  // Fetch inbox messages
  const refreshInbox = useCallback(async () => {
    if (!signer || !userAddress) {
      return;
    }

    if (!CONTRACT_ADDRESS) {
      setError("Contract address not configured");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, MESSENGER_ABI, signer);
      const count = await contract.getInboxCount(userAddress);

      const messages: Message[] = [];

      for (let i = 0; i < count; i++) {
        const [sender, encryptedContent, timestamp] = await contract.getInboxMessage(
          userAddress,
          i
        );

        messages.push({
          sender,
          content: "[Encrypted - click to decrypt]",
          timestamp: new Date(Number(timestamp) * 1000),
          encrypted: true,
          handle: encryptedContent,
        });
      }

      setInbox(messages);
    } catch (err) {
      console.error("Refresh failed:", err);
      setError("Failed to load messages");
    } finally {
      setIsLoading(false);
    }
  }, [signer, userAddress]);

  // Decrypt a message in the inbox by index
  const decryptInboxMessage = useCallback(
    async (index: number) => {
      if (index < 0 || index >= inbox.length) {
        return;
      }

      const message = inbox[index];
      if (!message.handle || !message.encrypted) {
        return;
      }

      setIsLoading(true);
      try {
        const decryptedMap = await decryptMessages([message.handle]);
        const decryptedContent = decryptedMap.get(message.handle);
        if (decryptedContent) {
          setInbox((prev) =>
            prev.map((msg, i) =>
              i === index
                ? { ...msg, content: decryptedContent, encrypted: false }
                : msg
            )
          );
        }
      } finally {
        setIsLoading(false);
      }
    },
    [inbox, decryptMessages]
  );

  // Decrypt all messages in inbox
  const decryptAllInbox = useCallback(async () => {
    const encryptedMessages = inbox.filter((msg) => msg.encrypted && msg.handle);
    if (encryptedMessages.length === 0) return;

    setIsLoading(true);
    try {
      const handles = encryptedMessages.map((msg) => msg.handle!);
      const decryptedMap = await decryptMessages(handles);

      setInbox((prev) =>
        prev.map((msg) => {
          if (msg.handle && decryptedMap.has(msg.handle)) {
            return {
              ...msg,
              content: decryptedMap.get(msg.handle)!,
              encrypted: false,
            };
          }
          return msg;
        })
      );
    } finally {
      setIsLoading(false);
    }
  }, [inbox, decryptMessages]);

  return {
    // State
    isConnected,
    isLoading,
    error,
    userAddress,
    inbox,
    // Actions
    connect,
    disconnect,
    sendMessage,
    refreshInbox,
    decryptMessages,
    decryptInboxMessage,
    decryptAllInbox,
  };
}

// Window type declaration for ethereum
declare global {
  interface Window {
    ethereum?: ethers.Eip1193Provider;
  }
}
