const requiredEnv = ["DATABASE_URL"] as const;

type RequiredEnv = (typeof requiredEnv)[number];

export function getEnv(): Record<RequiredEnv, string> {
  const env: Partial<Record<RequiredEnv, string>> = {};

  for (const key of requiredEnv) {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Missing required env var: ${key}`);
    }
    env[key] = value;
  }

  return env as Record<RequiredEnv, string>;
}
