import { useState, useCallback } from "react";
import { getFheInstance } from "../core/fhevm";

export interface EncryptedInput {
  handles: Uint8Array[];
  inputProof: Uint8Array;
}

export interface UseEncryptReturn {
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
 * Convert a string message to BigInt (max 32 bytes for euint256)
 */
function stringToBigInt(message: string): bigint {
  const messageBytes = new TextEncoder().encode(message);
  const paddedBytes = new Uint8Array(32);
  paddedBytes.set(messageBytes.slice(0, 32));
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
        return {
          handles: encrypted.handles,
          inputProof: encrypted.inputProof,
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

  const encryptString = useCallback(
    async (
      contractAddress: string,
      userAddress: string,
      message: string
    ): Promise<EncryptedInput | null> => {
      const value = stringToBigInt(message);
      return encrypt256(contractAddress, userAddress, value);
    },
    [encrypt256]
  );

  return {
    encrypt256,
    encryptString,
    isEncrypting,
    error,
  };
}
