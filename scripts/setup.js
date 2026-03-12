#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");

const LOG = {
  info: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`),
  warn: (msg) => console.warn(`⚠️  ${msg}`),
};

function checkEnvFile() {
  const envPath = path.join(rootDir, ".env");
  const envExamplePath = path.join(rootDir, ".env.example");

  if (!fs.existsSync(envPath)) {
    if (fs.existsSync(envExamplePath)) {
      LOG.warn(".env not found, copying from .env.example");
      fs.copyFileSync(envExamplePath, envPath);
      LOG.info(".env created from .env.example");
    } else {
      LOG.error(".env and .env.example not found");
      process.exit(1);
    }
  }

  const envContent = fs.readFileSync(envPath, "utf-8");
  const lines = envContent.split("\n");
  for (const line of lines) {
    const [key, ...valueParts] = line.split("=");
    if (key && !key.startsWith("#")) {
      const value = valueParts.join("=").replace(/^["']|["']$/g, "");
      if (value) {
        process.env[key] = value;
      }
    }
  }

  if (!process.env.DATABASE_URL) {
    LOG.error("DATABASE_URL not set in .env");
    LOG.info("Set DATABASE_URL=postgresql://user:password@localhost:5432/mission_control");
    process.exit(1);
  }

  const maskedUrl = process.env.DATABASE_URL.replace(/:[^:]*@/, ":***@");
  LOG.info(`Using DATABASE_URL: ${maskedUrl}`);
}

function runCommand(cmd, desc) {
  try {
    LOG.info(`Running: ${desc}`);
    execSync(cmd, { stdio: "inherit", cwd: rootDir, shell: "cmd.exe" });
    LOG.info(`✓ ${desc}`);
  } catch (error) {
    LOG.error(`✗ ${desc}`);
    throw error;
  }
}

async function setup() {
  try {
    LOG.info("Starting Mission Control Office setup...\n");

    LOG.warn("Step 1/4: Checking environment...");
    checkEnvFile();

    LOG.warn("\nStep 2/4: Generating Prisma types...");
    runCommand("npx prisma generate", "Generating Prisma client");

    LOG.warn("\nStep 3/4: Setting up database schema...");
    runCommand("npx prisma db push --skip-generate", "Pushing database schema");

    LOG.warn("\nStep 4/4: Seeding initial data...");
    runCommand("npx prisma db seed", "Seeding database");

    LOG.info("\n" + "=".repeat(50));
    LOG.info("✨ Setup complete!");
    LOG.info("=".repeat(50));
    LOG.info("Next steps:");
    LOG.info("  1. Start the app: npm run dev");
    LOG.info("  2. Open http://localhost:3001");
    LOG.info("=".repeat(50));
  } catch (error) {
    LOG.error(`Setup failed: ${error.message}`);
    process.exit(1);
  }
}

setup();
