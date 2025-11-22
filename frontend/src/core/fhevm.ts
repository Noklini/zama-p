import { createInstance, SepoliaConfig, initSDK } from "@zama-fhe/relayer-sdk/web";
import type { FhevmInstance } from "@zama-fhe/relayer-sdk/web";

// Module-level instance storage
let fheInstance: FhevmInstance | null = null;
let isInitialized = false;

/**
 * Initialize the FHEVM instance with browser provider
 */
export async function initializeFheInstance(): Promise<FhevmInstance> {
  // Return existing instance if already initialized
  if (fheInstance && isInitialized) {
    return fheInstance;
  }

  if (typeof window === "undefined") {
    throw new Error("FHEVM SDK requires a browser environment");
  }

  if (!window.ethereum) {
    throw new Error(
      "Ethereum provider not found. Please install MetaMask or connect a wallet."
    );
  }

  try {
    // Initialize WASM modules first
    await initSDK();
    console.log("WASM modules initialized");

    // Create instance with network provider
    const config = {
      ...SepoliaConfig,
      network: window.ethereum,
    };

    fheInstance = await createInstance(config);
    isInitialized = true;
    console.log("FHEVM instance initialized");

    return fheInstance;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (
      errorMsg.includes("Relayer") ||
      errorMsg.includes("fetch") ||
      errorMsg.includes("network")
    ) {
      throw new Error(
        "Cannot connect to Zama relayer. Check your network connection or try disabling VPN/proxy."
      );
    }
    throw new Error("Failed to initialize FHEVM: " + errorMsg);
  }
}

/**
 * Get the current FHEVM instance
 */
export function getFheInstance(): FhevmInstance | null {
  return fheInstance;
}

/**
 * Check if FHEVM is initialized
 */
export function isFheInitialized(): boolean {
  return isInitialized && fheInstance !== null;
}

/**
 * Reset the FHEVM instance (useful for testing or reconnection)
 */
export function resetFheInstance(): void {
  fheInstance = null;
  isInitialized = false;
}
