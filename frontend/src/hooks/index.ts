// Core hooks
export { useWallet } from "./useWallet";
export type { UseWalletReturn } from "./useWallet";

export { useFhevm } from "./useFhevm";
export type { UseFhevmReturn, FhevmStatus } from "./useFhevm";

export { useEncrypt } from "./useEncrypt";
export type { UseEncryptReturn, EncryptedInput } from "./useEncrypt";

export { useDecrypt } from "./useDecrypt";
export type { UseDecryptReturn, HandleContractPair } from "./useDecrypt";

// Composed hook for messenger functionality
export { useMessenger } from "./useMessenger";
export type { Message } from "./useMessenger";
