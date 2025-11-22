import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { getFheInstance } from "../core/fhevm";

export interface EncryptedInput {
  handles: string[];  // hex strings (bytes32)
  inputProof: string; // hex string (bytes)
}

/**
 * Convert Uint8Array to hex string
 */
function toHexString(bytes: Uint8Array): string {
  return ethers.hexlify(bytes);
}

export interface UseEncryptReturn {
  encrypt64: (
    contractAddress: string,
    userAddress: string,
    value: bigint
  ) => Promise<EncryptedInput | null>;
  encrypt256: (
    contractAddress: string,
    userAddress: string,
    value: bigint
  ) => Promise<EncryptedInput | null>;
  encryptString: (
    contractAddress: string,
    userAddress: string,
    message: string
  ) => Promise<EncryptedInput | null>;
  isEncrypting: boolean;
  error: string | null;
}

/**
 * Convert a string message to BigInt for euint64 (max 8 bytes)
 */
function stringToBigInt64(message: string): bigint {
  const messageBytes = new TextEncoder().encode(message);
  const paddedBytes = new Uint8Array(8);
  paddedBytes.set(messageBytes.slice(0, 8));
  return BigInt(
    "0x" +
      Array.from(paddedBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
  );
}

export function useEncrypt(): UseEncryptReturn {
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const encrypt64 = useCallback(
    async (
      contractAddress: string,
      userAddress: string,
      value: bigint
    ): Promise<EncryptedInput | null> => {
      const instance = getFheInstance();
      if (!instance) {
        setError("FHEVM not initialized");
        return null;
      }

      setIsEncrypting(true);
      setError(null);

      try {
        const input = instance.createEncryptedInput(contractAddress, userAddress);
        input.add64(value);
        const encrypted = await input.encrypt();

        // Convert Uint8Array handles and proof to hex strings for ethers.js
        return {
          handles: encrypted.handles.map((h: Uint8Array) => toHexString(h)),
          inputProof: toHexString(encrypted.inputProof),
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error("Encryption failed:", errorMsg);
        setError("Failed to encrypt: " + errorMsg);
        return null;
      } finally {
        setIsEncrypting(false);
      }
    },
    []
  );

  const encrypt256 = useCallback(
    async (
      contractAddress: string,
      userAddress: string,
      value: bigint
    ): Promise<EncryptedInput | null> => {
      const instance = getFheInstance();
      if (!instance) {
        setError("FHEVM not initialized");
        return null;
      }

      setIsEncrypting(true);
      setError(null);

      try {
        const input = instance.createEncryptedInput(contractAddress, userAddress);
        input.add256(value);
        const encrypted = await input.encrypt();

        // Convert Uint8Array handles and proof to hex strings for ethers.js
        return {
          handles: encrypted.handles.map((h: Uint8Array) => toHexString(h)),
          inputProof: toHexString(encrypted.inputProof),
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error("Encryption failed:", errorMsg);
        setError("Failed to encrypt: " + errorMsg);
        return null;
      } finally {
        setIsEncrypting(false);
      }
    },
    []
  );

  // encryptString uses euint64 (8 characters max) for this contract
  const encryptString = useCallback(
    async (
      contractAddress: string,
      userAddress: string,
      message: string
    ): Promise<EncryptedInput | null> => {
      if (message.length > 8) {
        console.warn("Message truncated to 8 characters (euint64 limit)");
      }
      const value = stringToBigInt64(message);
      return encrypt64(contractAddress, userAddress, value);
    },
    [encrypt64]
  );

  return {
    encrypt64,
    encrypt256,
    encryptString,
    isEncrypting,
    error,
  };
}
