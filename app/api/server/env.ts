const requiredEnv = ["DATABASE_URL"] as const;

type RequiredEnv = (typeof requiredEnv)[number];

export interface MissionControlEnv {
  DATABASE_URL: string;
  DEMO_DATABASE_URL?: string;
  MISSION_CONTROL_DEMO_MODE: boolean;
  NEXT_PUBLIC_MISSION_CONTROL_DEMO_MODE: boolean;
}

function parseBooleanEnv(value?: string): boolean {
  return value === "true";
}

export function getEnv(): MissionControlEnv {
  const env: Partial<Record<RequiredEnv, string>> = {};

  for (const key of requiredEnv) {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Missing required env var: ${key}`);
    }
    env[key] = value;
  }

  return {
    DATABASE_URL: env.DATABASE_URL as string,
    DEMO_DATABASE_URL: process.env.DEMO_DATABASE_URL,
    MISSION_CONTROL_DEMO_MODE: parseBooleanEnv(process.env.MISSION_CONTROL_DEMO_MODE),
    NEXT_PUBLIC_MISSION_CONTROL_DEMO_MODE: parseBooleanEnv(process.env.NEXT_PUBLIC_MISSION_CONTROL_DEMO_MODE),
  };
}

export function resolveMissionControlDatabaseUrl(): string {
  const env = getEnv();
  if (!env.MISSION_CONTROL_DEMO_MODE) {
    return env.DATABASE_URL;
  }

  if (!env.DEMO_DATABASE_URL) {
    throw new Error("MISSION_CONTROL_DEMO_MODE=true requires DEMO_DATABASE_URL");
  }

  return env.DEMO_DATABASE_URL;
}
