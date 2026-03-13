"use client";

import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faCopy } from "@fortawesome/free-solid-svg-icons";
import { Card } from "@/components/ui";

export default function ThankYouPage() {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [origin, setOrigin] = useState("https://your-domain.com");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const openClawPrompt = useMemo(
    () =>
      [
        "You are my installation agent. Your goal is to install MC Lucy (Mission Control) on this machine and complete the onboarding flow end-to-end.",
        "",
        "This is a two-phase mission:",
        "  Phase 1 - Install MC Lucy",
        "  Phase 2 - Onboarding: read the system, connect as an agent, and close the first task",
        "",
        "PHASE 1 - INSTALLATION",
        "",
        "Prerequisites:",
        "  - Node.js >= 18 (https://nodejs.org)",
        "  - PostgreSQL running locally",
        "",
        "Step 1 - Download the installation package:",
        `  curl -L "${origin}/downloads/mclucy-latest.zip" -o mclucy-latest.zip`,
        "",
        "Step 2 - Extract the package:",
        "  unzip mclucy-latest.zip -d mclucy",
        "  cd mclucy",
        "",
        "Step 3 - Run the installer:",
        "  macOS / Linux:  bash install.sh",
        "  Windows:        install.bat",
        "",
        "  The installer will:",
        "  - Create a .env file (press ENTER for defaults or provide a custom DATABASE_URL)",
        "  - Push the database schema via Prisma",
        "  - Seed initial data (your onboarding task will be ready)",
        "  - Start MC Lucy on http://localhost:3001",
        "  - Open the browser automatically",
        "",
        "Step 4 - Verify installation:",
        '  curl http://localhost:3001/api/health',
        '  Expected: { "status": "ok" }',
        "",
        "  If health check fails: check mc-lucy.log in the extracted folder.",
        "",
        "PHASE 2 - ONBOARDING (execute via API)",
        "",
        "Once MC Lucy is running, execute this onboarding flow. Do not skip steps.",
        "",
        "All requests:  Content-Type: application/json",
        "Base URL:      http://localhost:3001",
        "",
        "Step 1 - Wait for system ready:",
        "  GET /api/system/state",
        '  Wait until: { "state": "READY" }',
        "  Retry every 5 seconds if BOOTSTRAPPING",
        "",
        "Step 2 - Discover your agent identity:",
        "  GET /api/agents",
        '  Find your agent record (name: "OpenClaw")',
        "  Note your agentId for all subsequent requests",
        "",
        "Step 3 - Find and read the onboarding task:",
        "  GET /api/tasks?status=IN_PROGRESS",
        '  Find the task titled "Installation / Onboarding"',
        "  Note the taskId",
        "",
        "  GET /api/tasks/{taskId}/comments",
        "  Read the system comment body - it contains your full operating instructions",
        "",
        "Step 4 - Register your heartbeat:",
        "  POST /api/agents/heartbeat",
        '  { "agentId": "<your-agent-id>", "status": "WORKING", "statusMessage": "Onboarding in progress" }',
        "",
        "Step 5 - Connect to the event stream:",
        "  GET /api/events",
        "  Accept: text/event-stream",
        "  Keep this connection open throughout your operation",
        "",
        "Step 6 - Execute each subtask:",
        "  GET /api/tasks/{taskId}/subtasks",
        "  For each subtask (in order), perform the described action, then mark it done:",
        '  PATCH /api/subtasks/{subtaskId}  =>  { "status": "DONE" }',
        "",
        "Step 7 - Mark onboarding complete:",
        "  PATCH /api/tasks/{taskId}",
        '  { "status": "DONE", "statusMessage": "Onboarding complete. Endpoints verified, SSE active, ready to operate." }',
        "",
        "Step 8 - Final heartbeat:",
        "  POST /api/agents/heartbeat",
        '  { "agentId": "<your-agent-id>", "status": "IDLE", "statusMessage": "Onboarding complete. Awaiting instructions." }',
        "",
        "COMPLETION REPORT",
        "",
        "Return a final report with:",
        "  - Installation status: OK or FAIL",
        "  - MC Lucy URL confirmed: http://localhost:3001",
        "  - Onboarding task: DONE or in-progress state",
        "  - Any errors encountered and how they were resolved",
        "  - Confirmation that the event stream is connected",
      ].join("\n"),
    [origin],
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(openClawPrompt);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2200);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 2600);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-950 px-4 py-10 text-slate-100">
      <div className="w-full max-w-4xl space-y-5">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">MC Lucy</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-100 sm:text-3xl">
            Thanks for trusting the project.
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Copy the prompt below and paste it into OpenClaw to install MC Lucy locally.
          </p>
        </div>

        <Card
          title="OpenClaw Installation Prompt"
          titleRight={
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-2 rounded border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-200 transition hover:bg-cyan-500/25"
              type="button"
            >
              <FontAwesomeIcon icon={copyState === "copied" ? faCheck : faCopy} />
              {copyState === "copied" ? "Copied" : "Copy Prompt"}
            </button>
          }
          className="mx-auto w-full max-w-3xl"
          bodyClassName="space-y-3"
        >
          <p className="text-sm text-slate-300">
            Paste this exact prompt in OpenClaw. It will download, install, and onboard MC Lucy automatically.
          </p>
          <pre className="max-h-[520px] overflow-auto rounded-md border border-surface-700 bg-surface-950 p-4 text-xs leading-relaxed text-slate-200">
            {openClawPrompt}
          </pre>
          {copyState === "error" && (
            <p className="text-xs text-rose-300">
              Could not copy automatically. Select the prompt text manually and copy it.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}