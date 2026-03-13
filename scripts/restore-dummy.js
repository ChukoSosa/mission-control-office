#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");

function loadEnvValue(targetKey) {
  const envPath = path.join(rootDir, ".env");
  if (!fs.existsSync(envPath)) {
    throw new Error(`.env not found. Run setup first or create .env with ${targetKey}.`);
  }

  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;

    const key = trimmed.slice(0, idx).trim();
    const raw = trimmed.slice(idx + 1).trim();
    if (key === targetKey) {
      return raw.replace(/^['"]|['"]$/g, "");
    }
  }

  throw new Error(`${targetKey} not found in .env`);
}

function run(cmd, label, env) {
  console.log(`\n[restore-dummy] ${label}`);
  execSync(cmd, {
    stdio: "inherit",
    cwd: rootDir,
    env: {
      ...process.env,
      ...(env || {}),
    },
  });
}

function runPrismaGenerateWithFallback() {
  console.log("\n[restore-dummy] Generating Prisma client");

  try {
    execSync("npm run db:generate", {
      stdio: "inherit",
      cwd: rootDir,
      env: { ...process.env },
    });
    return;
  } catch (_error) {
    console.warn(
      "\n[restore-dummy] Prisma client generate failed (usually Windows engine lock while dev server is running).",
    );
    console.warn("[restore-dummy] Continuing with existing client. Close dev servers if you need a fresh generate.");
  }
}

function main() {
  const localDatabaseUrl = loadEnvValue("DATABASE_URL");
  const demoDatabaseUrl = loadEnvValue("DEMO_DATABASE_URL");

  runPrismaGenerateWithFallback();
  run("npx prisma db push --skip-generate", "Syncing local schema", {
    DATABASE_URL: localDatabaseUrl,
  });
  run("npx tsx scripts/seed-demo-db.ts", "Seeding local DummySet snapshot", {
    SEED_DATABASE_URL: localDatabaseUrl,
  });
  run("npx prisma db push --skip-generate", "Syncing demo schema", {
    DATABASE_URL: demoDatabaseUrl,
  });
  run("npx tsx scripts/seed-demo-db.ts", "Seeding demo DummySet snapshot", {
    SEED_DATABASE_URL: demoDatabaseUrl,
  });
  run("npx tsx scripts/verify-demo.ts", "Verifying demo snapshot and read-only guard");

  console.log("\n[restore-dummy] Done. DummySet snapshot restored to local and demo databases.");
}

try {
  main();
} catch (error) {
  console.error("\n[restore-dummy] Failed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
}
