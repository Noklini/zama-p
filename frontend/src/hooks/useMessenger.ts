import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "./useWallet";
import { useFhevm } from "./useFhevm";
import { useEncrypt } from "./useEncrypt";
import { useDecrypt } from "./useDecrypt";
import { MESSENGER_ABI, CONTRACT_ADDRESS } from "../contractABI";

// Message type for UI
export interface Message {
  sender: string;
  content: string;
  timestamp: Date;
  encrypted: boolean;
  handle?: string;
}

export function useMessenger() {
  // Compose the modular hooks
  const {
    address: userAddress,
    isConnected,
    isConnecting,
    error: walletError,
    signer,
    connect: connectWallet,
    disconnect: disconnectWallet,
  } = useWallet();

  const {
    status: fhevmStatus,
    error: fhevmError,
    initialize: initializeFhevm,
    isInitialized,
  } = useFhevm();

  const { encryptString, isEncrypting, error: encryptError } = useEncrypt();
  const { decryptToStrings, isDecrypting, error: decryptError } = useDecrypt();

  // Local state
  const [inbox, setInbox] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);

  // Combine errors
  const error = walletError || fhevmError || encryptError || decryptError || messageError;

  // Combined loading state
  const isLoading = isConnecting || isEncrypting || isDecrypting || isLoadingMessages;

  // Initialize FHEVM when wallet connects
  useEffect(() => {
    if (isConnected && fhevmStatus === "idle") {
      initializeFhevm();
    }
  }, [isConnected, fhevmStatus, initializeFhevm]);

  // Connect wallet (wrapper for consistency)
  const connect = useCallback(async () => {
    await connectWallet();
  }, [connectWallet]);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    disconnectWallet();
    setInbox([]);
    setMessageError(null);
  }, [disconnectWallet]);

  // Send encrypted message
  const sendMessage = useCallback(
    async (recipient: string, messageContent: string) => {
      if (!isInitialized || !signer || !userAddress) {
        setMessageError("Not connected or FHEVM not ready");
        return false;
      }

      if (!CONTRACT_ADDRESS) {
        setMessageError("Contract address not configured");
        return false;
      }

      setMessageError(null);

      try {
        // Encrypt the message using the modular hook
        const encrypted = await encryptString(
          CONTRACT_ADDRESS,
          userAddress,
          messageContent
        );

        if (!encrypted) {
          return false;
        }

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
        setMessageError("Failed to send message");
        return false;
      }
    },
    [isInitialized, signer, userAddress, encryptString]
  );

  // Decrypt messages helper
  const decryptMessages = useCallback(
    async (handles: string[]): Promise<Map<string, string>> => {
      if (!isInitialized || !signer || !userAddress) {
        return new Map();
      }

      const handlePairs = handles.map((handle) => ({
        handle,
        contractAddress: CONTRACT_ADDRESS,
      }));

      return decryptToStrings(handlePairs, signer, userAddress, [CONTRACT_ADDRESS]);
    },
    [isInitialized, signer, userAddress, decryptToStrings]
  );

  // Fetch inbox messages
  const refreshInbox = useCallback(async () => {
    if (!signer || !userAddress) {
      return;
    }

    if (!CONTRACT_ADDRESS) {
      setMessageError("Contract address not configured");
      return;
    }

    setIsLoadingMessages(true);
    setMessageError(null);

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
      setMessageError("Failed to load messages");
    } finally {
      setIsLoadingMessages(false);
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
      } catch (err) {
        console.error("Decrypt message failed:", err);
      }
    },
    [inbox, decryptMessages]
  );

  // Decrypt all messages in inbox
  const decryptAllInbox = useCallback(async () => {
    const encryptedMessages = inbox.filter((msg) => msg.encrypted && msg.handle);
    if (encryptedMessages.length === 0) return;

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
    } catch (err) {
      console.error("Decrypt all failed:", err);
    }
  }, [inbox, decryptMessages]);

  return {
    // State
    isConnected,
    isLoading,
    error,
    userAddress,
    inbox,
    fhevmStatus,
    isInitialized,
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

// Re-export types and hooks for convenience
export { useWallet } from "./useWallet";
export { useFhevm } from "./useFhevm";
export { useEncrypt } from "./useEncrypt";
export { useDecrypt } from "./useDecrypt";
