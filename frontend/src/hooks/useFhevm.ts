import { useState, useCallback } from "react";
import type { FhevmInstance } from "@zama-fhe/relayer-sdk/web";
import { initializeFheInstance, getFheInstance } from "../core/fhevm";

export type FhevmStatus = "idle" | "loading" | "ready" | "error";

export interface UseFhevmReturn {
  instance: FhevmInstance | null;
  status: FhevmStatus;
  error: string | null;
  initialize: () => Promise<void>;
  isInitialized: boolean;
}

export function useFhevm(): UseFhevmReturn {
  const [instance, setInstance] = useState<FhevmInstance | null>(getFheInstance());
  const [status, setStatus] = useState<FhevmStatus>(
    getFheInstance() ? "ready" : "idle"
  );
  const [error, setError] = useState<string | null>(null);

  const initialize = useCallback(async () => {
    // Skip if already initialized or loading
    if (status === "loading" || status === "ready") {
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      console.log("Initializing FHEVM...");
      const inst = await initializeFheInstance();
      setInstance(inst);
      setStatus("ready");
      console.log("FHEVM ready");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("FHEVM initialization failed:", errorMsg);
      setError(errorMsg);
      setStatus("error");
    }
  }, [status]);

  return {
    instance,
    status,
    error,
    initialize,
    isInitialized: status === "ready",
  };
}
