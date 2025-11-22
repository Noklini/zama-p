import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { getFheInstance } from "../core/fhevm";

export interface HandleContractPair {
  handle: string;
  contractAddress: string;
}

export interface UseDecryptReturn {
  decrypt: (
    handles: HandleContractPair[],
    signer: ethers.Signer,
    userAddress: string,
    contractAddresses: string[]
  ) => Promise<Map<string, bigint>>;
  decryptToStrings: (
    handles: HandleContractPair[],
    signer: ethers.Signer,
    userAddress: string,
    contractAddresses: string[]
  ) => Promise<Map<string, string>>;
  isDecrypting: boolean;
  error: string | null;
}

/**
 * Convert BigInt to string (reverse of stringToBigInt)
 */
function bigIntToString(value: bigint): string {
  const hex = value.toString(16).padStart(64, "0");
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  // Find the end of the message (null terminator or end of bytes)
  let endIndex = bytes.findIndex((b) => b === 0);
  if (endIndex === -1) endIndex = 32;
  return new TextDecoder().decode(bytes.slice(0, endIndex));
}

export function useDecrypt(): UseDecryptReturn {
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decrypt = useCallback(
    async (
      handles: HandleContractPair[],
      signer: ethers.Signer,
      userAddress: string,
      contractAddresses: string[]
    ): Promise<Map<string, bigint>> => {
      const instance = getFheInstance();
      if (!instance) {
        setError("FHEVM not initialized");
        return new Map();
      }

      if (handles.length === 0) {
        return new Map();
      }

      setIsDecrypting(true);
      setError(null);

      try {
        // Generate keypair for decryption
        const keypair = instance.generateKeypair();

        // Current timestamp and duration (7 days validity)
        const startTimestamp = Math.floor(Date.now() / 1000);
        const durationDays = 7;

        // Create EIP-712 message for signing
        const eip712Message = instance.createEIP712(
          keypair.publicKey,
          contractAddresses,
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
          handles,
          keypair.privateKey,
          keypair.publicKey,
          signature,
          contractAddresses,
          userAddress,
          startTimestamp,
          durationDays
        );

        // Convert to Map
        const result = new Map<string, bigint>();
        for (const [handle, value] of Object.entries(decryptedResults)) {
          if (typeof value === "bigint") {
            result.set(handle, value);
          } else {
            result.set(handle, BigInt(String(value)));
          }
        }

        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error("Decryption failed:", errorMsg);
        setError("Failed to decrypt: " + errorMsg);
        return new Map();
      } finally {
        setIsDecrypting(false);
      }
    },
    []
  );

  const decryptToStrings = useCallback(
    async (
      handles: HandleContractPair[],
      signer: ethers.Signer,
      userAddress: string,
      contractAddresses: string[]
    ): Promise<Map<string, string>> => {
      const decryptedBigInts = await decrypt(
        handles,
        signer,
        userAddress,
        contractAddresses
      );

      const result = new Map<string, string>();
      for (const [handle, value] of decryptedBigInts) {
        result.set(handle, bigIntToString(value));
      }
      return result;
    },
    [decrypt]
  );

  return {
    decrypt,
    decryptToStrings,
    isDecrypting,
    error,
  };
}
