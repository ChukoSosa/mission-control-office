"use client";

import { useCallback, useEffect, useState } from "react";

export const ONBOARDING_STORAGE_KEY = "mc_lucy_onboarding_seen";

export function readOnboardingSeen(): boolean {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeOnboardingSeen(seen: boolean): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, seen ? "true" : "false");
  } catch {
    // Ignore storage write failures; caller state still updates in-memory.
  }
}

export function useOnboardingState() {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setHasSeenOnboarding(readOnboardingSeen());
    setIsReady(true);
  }, []);

  const markOnboardingSeen = useCallback(() => {
    setHasSeenOnboarding(true);
    writeOnboardingSeen(true);
  }, []);

  return {
    hasSeenOnboarding,
    isReady,
    markOnboardingSeen,
    key: ONBOARDING_STORAGE_KEY,
  };
}
