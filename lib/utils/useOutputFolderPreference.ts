"use client";

import { useCallback, useEffect, useState } from "react";

export const OUTPUT_FOLDER_STORAGE_KEY = "mc_lucy_output_folder_path";

/**
 * Validates an output folder path for security and platform compatibility.
 * Returns validation result with optional error message.
 */
export function validateOutputFolderPath(path: string): { valid: boolean; error?: string } {
  const normalized = path.trim();

  // Empty is technically valid (but shouldn't be saved)
  if (!normalized) {
    return { valid: false, error: "Path cannot be empty" };
  }

  // Check max length (Windows MAX_PATH is 260)
  if (normalized.length > 260) {
    return { valid: false, error: "Path too long (maximum 260 characters)" };
  }

  // Reject Windows invalid characters
  const invalidCharsRegex = /[<>:"|?*\x00-\x1f]/g;
  if (invalidCharsRegex.test(normalized)) {
    return { valid: false, error: "Path contains invalid characters: < > : \" | ? *" };
  }

  // Reject path traversal attempts
  if (normalized.includes("..")) {
    return { valid: false, error: "Path traversal (..) is not allowed" };
  }

  // Reject absolute paths
  if (normalized.startsWith("/") || normalized.startsWith("\\\\")) {
    return { valid: false, error: "Absolute paths not allowed. Use relative paths like 'mcmonkeys'" };
  }

  // Reject environment variable references
  if (normalized.includes("$") || normalized.includes("%")) {
    return { valid: false, error: "Environment variable references not allowed" };
  }

  return { valid: true };
}

export function readOutputFolderPath(): string {
  if (typeof window === "undefined") return "";

  try {
    return window.localStorage.getItem(OUTPUT_FOLDER_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function writeOutputFolderPath(path: string): void {
  if (typeof window === "undefined") return;

  try {
    const normalized = path.trim();
    const validation = validateOutputFolderPath(normalized);

    if (!validation.valid) {
      console.warn(`Invalid output folder path: ${validation.error}`);
      return;
    }

    if (!normalized) {
      window.localStorage.removeItem(OUTPUT_FOLDER_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(OUTPUT_FOLDER_STORAGE_KEY, normalized);
  } catch {
    // Ignore storage write failures; caller state still updates in-memory.
  }
}

export function useOutputFolderPreference() {
  const [outputFolderPath, setOutputFolderPathState] = useState("");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setOutputFolderPathState(readOutputFolderPath());
    setIsReady(true);
  }, []);

  const setOutputFolderPath = useCallback((path: string) => {
    const normalized = path.trim();
    setOutputFolderPathState(normalized);
    writeOutputFolderPath(normalized);
  }, []);

  return {
    outputFolderPath,
    setOutputFolderPath,
    isReady,
    key: OUTPUT_FOLDER_STORAGE_KEY,
  };
}
