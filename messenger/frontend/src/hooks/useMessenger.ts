import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk";
import { MESSENGER_ABI, CONTRACT_ADDRESS } from "../contractABI";

// Message type for UI
export interface Message {
  sender: string;
  content: string;
  timestamp: Date;
  encrypted: boolean;
}

// SDK instance type
type FhevmInstance = Awaited<ReturnType<typeof createInstance>>;

export function useMessenger() {
  const [instance, setInstance] = useState<FhevmInstance | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [userAddress, setUserAddress] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inbox, setInbox] = useState<Message[]>([]);

  // Initialize SDK
  useEffect(() => {
    async function initSDK() {
      try {
        const inst = await createInstance(SepoliaConfig);
        setInstance(inst);
      } catch (err) {
        console.error("Failed to initialize SDK:", err);
        setError("Failed to initialize encryption SDK");
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
      if (network.chainId !== BigInt(11155111)) {
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
        // Convert message to number (simplified - in production use proper encoding)
        const messageBytes = new TextEncoder().encode(messageContent);
        const messageValue = BigInt(
          "0x" +
            Array.from(messageBytes.slice(0, 32))
              .map((b) => b.toString(16).padStart(2, "0"))
              .join("")
        );

        // Create encrypted input
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

  // Fetch and decrypt inbox messages
  const refreshInbox = useCallback(async () => {
    if (!instance || !signer || !userAddress) {
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
        const [sender, encryptedHandle, timestamp] = await contract.getInboxMessage(
          userAddress,
          i
        );

        // Try to decrypt the message
        let content = "[Encrypted]";
        let encrypted = true;

        try {
          // Generate keypair for decryption
          const keypair = instance.generateKeyPair();

          // Create EIP712 message
          const eip712Message = instance.createEIP712Message(
            encryptedHandle,
            keypair.publicKey
          );

          // Sign the message
          const signature = await signer.signTypedData(
            eip712Message.domain,
            eip712Message.types,
            eip712Message.message
          );

          // Decrypt
          const decrypted = await instance.userDecrypt(
            keypair,
            signature,
            encryptedHandle
          );

          // Convert BigInt back to string
          const hexString = decrypted.toString(16).padStart(64, "0");
          const bytes = [];
          for (let j = 0; j < hexString.length; j += 2) {
            const byte = parseInt(hexString.substr(j, 2), 16);
            if (byte !== 0) bytes.push(byte);
          }
          content = new TextDecoder().decode(new Uint8Array(bytes));
          encrypted = false;
        } catch (decryptErr) {
          console.warn("Could not decrypt message:", decryptErr);
        }

        messages.push({
          sender,
          content,
          timestamp: new Date(Number(timestamp) * 1000),
          encrypted,
        });
      }

      setInbox(messages);
    } catch (err) {
      console.error("Refresh failed:", err);
      setError("Failed to load messages");
    } finally {
      setIsLoading(false);
    }
  }, [instance, signer, userAddress]);

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
  };
}

// Window type declaration for ethereum
declare global {
  interface Window {
    ethereum?: ethers.Eip1193Provider;
  }
}
