export function shouldUseMockData(): boolean {
  const override = process.env.NEXT_PUBLIC_USE_MOCK_DATA;

  if (override === "true") return true;
  if (override === "false") return false;

  // Default behavior: mock in development, real API in production.
  return process.env.NODE_ENV !== "production";
}
