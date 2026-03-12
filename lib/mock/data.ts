import type { ActivityItem, Agent, Comment, Subtask, SupervisorKpis, Task } from "@/lib/schemas";

export const MOCK_AGENTS: Agent[] = [
  {
    id: "agent-codi",
    name: "Codi",
    role: "Frontend Engineer",
    status: "WORKING",
    statusMessage: "Implementing dashboard filters",
    avatarUrl: "https://api.dicebear.com/9.x/bottts/svg?seed=Codi",
    heartbeatAt: new Date().toISOString(),
  },
  {
    id: "agent-ninja",
    name: "Ninja",
    role: "Backend Engineer",
    status: "THINKING",
    statusMessage: "Designing run pipeline",
    avatarUrl: "https://api.dicebear.com/9.x/bottts/svg?seed=Ninja",
    heartbeatAt: new Date().toISOString(),
  },
  {
    id: "agent-lucy",
    name: "Lucy",
    role: "Product Lead",
    status: "IDLE",
    statusMessage: "Prioritizing backlog",
    avatarUrl: "https://api.dicebear.com/9.x/bottts/svg?seed=Lucy",
    heartbeatAt: new Date().toISOString(),
  },
  {
    id: "agent-claudio",
    name: "Claudio",
    role: "Ops",
    status: "BLOCKED",
    statusMessage: "Waiting for staging credentials",
    avatarUrl: "https://api.dicebear.com/9.x/bottts/svg?seed=Claudio",
    heartbeatAt: new Date().toISOString(),
  },
];

export const MOCK_TASKS: Task[] = [
  {
    id: "task-001",
    title: "Refactor mission summary cards",
    description: "Improve KPI rendering performance and responsive behavior.",
    status: "IN_PROGRESS",
    priority: 4,
    assignedAgentId: "agent-codi",
    assignedAgent: { id: "agent-codi", name: "Codi" },
    updatedAt: new Date().toISOString(),
  },
  {
    id: "task-002",
    title: "Implement agent heartbeat retries",
    description: "Add exponential backoff when posting heartbeat updates.",
    status: "REVIEW",
    priority: 3,
    assignedAgentId: "agent-ninja",
    assignedAgent: { id: "agent-ninja", name: "Ninja" },
    updatedAt: new Date().toISOString(),
  },
  {
    id: "task-003",
    title: "Define onboarding runbook",
    description: "Document first-use flow for new operator and agents.",
    status: "BACKLOG",
    priority: 2,
    assignedAgentId: null,
    assignedAgent: null,
    updatedAt: new Date().toISOString(),
  },
];

const SUBTASKS_BY_TASK: Record<string, Subtask[]> = {
  "task-001": [
    {
      id: "subtask-001-1",
      title: "Measure current render timings",
      status: "DONE",
      ownerAgent: { id: "agent-codi", name: "Codi" },
      position: 1,
      updatedAt: new Date().toISOString(),
    },
    {
      id: "subtask-001-2",
      title: "Virtualize KPI card list",
      status: "DOING",
      ownerAgent: { id: "agent-codi", name: "Codi" },
      position: 2,
      updatedAt: new Date().toISOString(),
    },
  ],
  "task-002": [
    {
      id: "subtask-002-1",
      title: "Retry helper utility",
      status: "DONE",
      ownerAgent: { id: "agent-ninja", name: "Ninja" },
      position: 1,
      updatedAt: new Date().toISOString(),
    },
  ],
};

const COMMENTS_BY_TASK: Record<string, Comment[]> = {
  "task-001": [
    {
      id: "comment-001",
      taskId: "task-001",
      authorType: "agent",
      authorId: "agent-codi",
      body: "Initial optimization done, validating on mobile.",
      requiresResponse: false,
      status: "open",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      resolvedAt: null,
    },
  ],
  "task-002": [
    {
      id: "comment-002",
      taskId: "task-002",
      authorType: "human",
      authorId: "operator-root",
      body: "Please include jitter in backoff strategy.",
      requiresResponse: true,
      status: "open",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      resolvedAt: null,
    },
  ],
};

export function getMockSubtasks(taskId: string): Subtask[] {
  return SUBTASKS_BY_TASK[taskId] ?? [];
}

export function getMockComments(taskId: string): Comment[] {
  return COMMENTS_BY_TASK[taskId] ?? [];
}

export const MOCK_ACTIVITY: ActivityItem[] = [
  {
    id: "activity-001",
    kind: "task",
    action: "task.updated",
    summary: "Task 'Refactor mission summary cards' moved to IN_PROGRESS",
    taskId: "task-001",
    agentId: "agent-codi",
    runId: null,
    occurredAt: new Date().toISOString(),
  },
  {
    id: "activity-002",
    kind: "agent",
    action: "agent.status",
    summary: "Ninja: Designing run pipeline",
    taskId: null,
    agentId: "agent-ninja",
    runId: null,
    occurredAt: new Date().toISOString(),
  },
];

export const MOCK_KPIS: SupervisorKpis = {
  totalTasks: 3,
  inProgressTasks: 1,
  reviewTasks: 1,
  backlogTasks: 1,
  blockedTasks: 0,
  doneTasks: 0,
  totalAgents: 4,
  workingAgents: 1,
  thinkingAgents: 1,
  idleAgents: 1,
  blockedAgents: 1,
  activeRuns: 2,
  completionRate: 0,
  updatedAt: new Date().toISOString(),
};
