import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

const OPENCLAW_AGENT_ID = "agent-openclaw";
const ONBOARDING_TASK_ID = "task-onboarding-installation";

const DISCOVERY_PIPELINE_ID = "pipeline-discovery";
const DISCOVERY_STAGES = [
  { id: "stage-discovery-backlog",      name: "Backlog",     position: 1 },
  { id: "stage-discovery-in-progress",  name: "In Progress", position: 2 },
  { id: "stage-discovery-review",       name: "Review",      position: 3 },
  { id: "stage-discovery-done",         name: "Done",        position: 4 },
];

function loadAgentPrompt(): string {
  const promptPath = path.join(__dirname, "../docs/OPENCLAW-AGENT-PROMPT.md");
  if (fs.existsSync(promptPath)) {
    return fs.readFileSync(promptPath, "utf-8");
  }
  return "Read docs/OPENCLAW-AGENT-PROMPT.md for full operating instructions.";
}

async function main() {
  const operator = await prisma.operator.upsert({
    where: { id: "operator-root" },
    update: {},
    create: {
      id: "operator-root",
      name: "Mission Operator",
      email: "operator@mission.control",
    },
  });

  // Keep seed deterministic: one visible agent and one onboarding task.
  await prisma.systemEvent.deleteMany();
  await prisma.run.deleteMany();
  await prisma.taskComment.deleteMany();
  await prisma.subtask.deleteMany();
  await prisma.taskActivity.deleteMany();
  await prisma.task.deleteMany();
  await prisma.agentRoutine.deleteMany();
  await prisma.agent.deleteMany({});
  await prisma.pipelineStage.deleteMany();
  await prisma.pipeline.deleteMany();

  // ── Discovery Pipeline ───────────────────────────────────────────────────
  await prisma.pipeline.upsert({
    where: { id: DISCOVERY_PIPELINE_ID },
    update: { name: "Discovery", type: "discovery", description: "Standard discovery workflow for new initiatives" },
    create: {
      id: DISCOVERY_PIPELINE_ID,
      name: "Discovery",
      type: "discovery",
      description: "Standard discovery workflow for new initiatives",
    },
  });

  for (const stage of DISCOVERY_STAGES) {
    await prisma.pipelineStage.upsert({
      where: { id: stage.id },
      update: { name: stage.name, position: stage.position, pipelineId: DISCOVERY_PIPELINE_ID },
      create: { id: stage.id, name: stage.name, position: stage.position, pipelineId: DISCOVERY_PIPELINE_ID },
    });
  }

  const openClaw = await prisma.agent.upsert({
    where: { id: OPENCLAW_AGENT_ID },
    update: {
      name: "OpenClaw",
      role: "Primary Mission Operator",
      status: "WORKING",
      statusMessage: "Handling installation onboarding",
      heartbeatAt: new Date(),
    },
    create: {
      id: OPENCLAW_AGENT_ID,
      name: "OpenClaw",
      role: "Primary Mission Operator",
      status: "WORKING",
      statusMessage: "Handling installation onboarding",
      heartbeatAt: new Date(),
    },
  });

  await prisma.task.upsert({
    where: { id: ONBOARDING_TASK_ID },
    update: {
      title: "Installation / Onboarding",
      description:
        "This is your first task. Execute each subtask in order to complete the onboarding flow. " +
        "Your operating instructions are in the system comment on this task. " +
        "When all subtasks are DONE, move this card to DONE.",
      status: "IN_PROGRESS",
      priority: 1,
      createdById: operator.id,
      createdByType: "operator",
      assignedAgentId: openClaw.id,
    },
    create: {
      id: ONBOARDING_TASK_ID,
      title: "Installation / Onboarding",
      description:
        "This is your first task. Execute each subtask in order to complete the onboarding flow. " +
        "Your operating instructions are in the system comment on this task. " +
        "When all subtasks are DONE, move this card to DONE.",
      status: "IN_PROGRESS",
      priority: 1,
      createdById: operator.id,
      createdByType: "operator",
      assignedAgentId: openClaw.id,
    },
  });

  // Post the agent operating prompt as the first comment on the onboarding task.
  // OpenClaw reads this on first access and learns how to operate MC Lucy.
  await prisma.taskComment.upsert({
    where: { id: "comment-onboarding-agent-prompt" },
    update: {
      body: loadAgentPrompt(),
    },
    create: {
      id: "comment-onboarding-agent-prompt",
      taskId: ONBOARDING_TASK_ID,
      authorType: "system",
      authorId: "system",
      body: loadAgentPrompt(),
      requiresResponse: false,
      status: "open",
    },
  });

  await prisma.subtask.createMany({
    data: [
      {
        id: "subtask-onboarding-1",
        taskId: ONBOARDING_TASK_ID,
        title: "Verify connectivity — GET /api/system/state (wait for READY) then GET /api/health",
        status: "TODO",
        position: 1,
        ownerAgentId: openClaw.id,
      },
      {
        id: "subtask-onboarding-2",
        taskId: ONBOARDING_TASK_ID,
        title: "Read your operating instructions — GET /api/tasks/{id}/comments and read the system comment body",
        status: "TODO",
        position: 2,
        ownerAgentId: openClaw.id,
      },
      {
        id: "subtask-onboarding-3",
        taskId: ONBOARDING_TASK_ID,
        title: "Send initial heartbeat — POST /api/agents/heartbeat with status IDLE",
        status: "TODO",
        position: 3,
        ownerAgentId: openClaw.id,
      },
      {
        id: "subtask-onboarding-4",
        taskId: ONBOARDING_TASK_ID,
        title: "Connect to event stream — open persistent SSE connection to GET /api/events",
        status: "TODO",
        position: 4,
        ownerAgentId: openClaw.id,
      },
      {
        id: "subtask-onboarding-5",
        taskId: ONBOARDING_TASK_ID,
        title: "Complete onboarding — PATCH this task to DONE with evidence: endpoints verified, SSE active, ready to operate",
        status: "TODO",
        position: 5,
        ownerAgentId: openClaw.id,
      },
    ],
  });

  // ── Discovery pipeline seed tasks ─────────────────────────────────────────
  const discoveryTasks: Array<{
    id: string;
    title: string;
    description: string;
    status: "BACKLOG" | "IN_PROGRESS" | "REVIEW" | "DONE";
    priority: number;
    pipelineStageId: string;
  }> = [
    {
      id: "task-discovery-1",
      title: "Define product vision and goals",
      description: "Align stakeholders on the product vision, target users, and success metrics.",
      status: "BACKLOG",
      priority: 1,
      pipelineStageId: "stage-discovery-backlog",
    },
    {
      id: "task-discovery-2",
      title: "User research interviews",
      description: "Conduct 5–8 structured interviews with target personas to surface pain points.",
      status: "IN_PROGRESS",
      priority: 2,
      pipelineStageId: "stage-discovery-in-progress",
    },
    {
      id: "task-discovery-3",
      title: "Competitive landscape analysis",
      description: "Map existing solutions, identify whitespace, and document differentiators.",
      status: "IN_PROGRESS",
      priority: 2,
      pipelineStageId: "stage-discovery-in-progress",
    },
    {
      id: "task-discovery-4",
      title: "Problem statement synthesis",
      description: "Synthesize research findings into a clear, validated problem statement.",
      status: "REVIEW",
      priority: 1,
      pipelineStageId: "stage-discovery-review",
    },
    {
      id: "task-discovery-5",
      title: "Opportunity sizing",
      description: "Estimate TAM/SAM and validate market size assumptions with data.",
      status: "DONE",
      priority: 3,
      pipelineStageId: "stage-discovery-done",
    },
  ];

  for (const t of discoveryTasks) {
    await prisma.task.upsert({
      where: { id: t.id },
      update: {
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        pipelineStageId: t.pipelineStageId,
        assignedAgentId: openClaw.id,
      },
      create: {
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        pipelineStageId: t.pipelineStageId,
        createdByType: "operator",
        createdById: operator.id,
        assignedAgentId: openClaw.id,
      },
    });
  }

}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
