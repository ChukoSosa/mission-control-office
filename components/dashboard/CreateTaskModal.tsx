"use client";

import { useState, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faXmark,
  faBolt,
  faPlus,
  faCircleCheck,
  faCircleXmark,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils/cn";
import {
  decideMainAgentFlow,
  buildMainAgentResponseDraft,
  type MissionMainAgentDecision,
  type MissionMainAgentResponseDraft,
} from "@/lib/mission/mainAgentPolicy";
import {
  type MissionRawIntakeRequest,
  type MissionIntakeSourceChannel,
  type MissionDraftTaskPayload,
} from "@/lib/mission/intake";
import {
  evaluateTaskDecomposition,
  type MissionTaskDecompositionResult,
} from "@/lib/mission/decomposition";
import {
  toTaskCreationPlan,
  type MissionTaskCreationPlan,
} from "@/lib/mission/apiPayloads";
import {
  executeTaskCreation,
  type MissionTaskCreationExecutionResult,
} from "@/lib/mission/executor";
import type { MissionTaskDetail, MissionSubtask } from "@/types/mission";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface AnalysisResult {
  decision: MissionMainAgentDecision;
  draftTask: MissionDraftTaskPayload | null;
  creationPlan: MissionTaskCreationPlan | null;
  decomposition: MissionTaskDecompositionResult | null;
  responseDraft: MissionMainAgentResponseDraft;
}

export interface CreateTaskModalProps {
  onClose: () => void;
  onCreated?: (taskId: string) => void;
}

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const SOURCE_CHANNEL_OPTIONS: { value: MissionIntakeSourceChannel; label: string }[] = [
  { value: "manual-ui", label: "Manual UI" },
  { value: "telegram", label: "Telegram" },
  { value: "openclaw-chat", label: "OpenClaw Chat" },
  { value: "system", label: "System" },
];

const PRIORITY_OPTIONS: { value: "" | "1" | "2" | "3" | "4" | "5"; label: string }[] = [
  { value: "", label: "Auto (inferred)" },
  { value: "1", label: "P1 — Critical" },
  { value: "2", label: "P2 — High" },
  { value: "3", label: "P3 — Medium" },
  { value: "4", label: "P4 — Low" },
  { value: "5", label: "P5 — Minimal" },
];

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function buildSyntheticTaskDetail(draft: MissionDraftTaskPayload): MissionTaskDetail {
  const subtasks: MissionSubtask[] = draft.draftSubtasks.map((s, i) => ({
    id: `draft-${i}`,
    title: s.title,
    status: "TODO" as const,
    position: s.position,
    ownerAgent: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
  return {
    task: {
      id: "draft",
      title: draft.title,
      description: draft.description,
      status: "BACKLOG" as const,
      priority: (draft.priority ?? 3) as 1 | 2 | 3 | 4 | 5,
      assignedAgent: null,
      updatedAt: new Date().toISOString(),
    },
    subtasks,
    recentActivity: [],
  };
}

function actionabilityVariant(kind: string): "success" | "warning" | "error" | "neutral" {
  if (kind === "actionable") return "success";
  if (kind === "needs_human_review") return "warning";
  return "error";
}

function decisionVariant(d: string): "success" | "warning" | "error" | "neutral" {
  if (d === "create_task_immediately") return "success";
  if (d === "create_draft_task_with_warnings" || d === "ask_for_clarification") return "warning";
  return "error";
}

function decisionLabel(d: string): string {
  const map: Record<string, string> = {
    create_task_immediately: "Create immediately",
    create_draft_task_with_warnings: "Create w/ warnings",
    ask_for_clarification: "Needs clarification",
    ignore_or_log_only: "Ignore / log only",
  };
  return map[d] ?? d;
}

function toneStyle(tone: string): string {
  if (tone === "confirming") return "border-green-500/30 bg-green-500/5";
  if (tone === "warning") return "border-amber-500/30 bg-amber-500/5";
  if (tone === "clarifying") return "border-amber-500/30 bg-amber-500/5";
  return "border-surface-700 bg-surface-800/50";
}

function decompositionColor(level: string): string {
  if (level === "good") return "text-green-400";
  if (level === "warning") return "text-amber-400";
  return "text-red-400";
}

// ──────────────────────────────────────────────
// Shared sub-components
// ──────────────────────────────────────────────

function SectionCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-surface-700 bg-surface-800/50 px-3 py-2.5">
      <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </h4>
      {children}
    </div>
  );
}

function PillBadge({
  children,
  variant = "neutral",
}: {
  children: React.ReactNode;
  variant?: "success" | "warning" | "error" | "neutral";
}) {
  const colorMap = {
    success: "bg-green-500/15 text-green-400 border-green-500/30",
    warning: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    error: "bg-red-500/15 text-red-400 border-red-500/30",
    neutral: "bg-surface-700/60 text-slate-400 border-surface-600",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        colorMap[variant],
      )}
    >
      {children}
    </span>
  );
}

function WarningList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ul className="mt-1.5 space-y-0.5">
      {items.map((w, i) => (
        <li
          key={i}
          className="flex items-start gap-1.5 text-[10px] text-amber-400/80"
        >
          <FontAwesomeIcon
            icon={faTriangleExclamation}
            className="mt-0.5 shrink-0"
          />
          {w}
        </li>
      ))}
    </ul>
  );
}

// ──────────────────────────────────────────────
// Analysis result panels
// ──────────────────────────────────────────────

function ResponseGuidancePanel({
  responseDraft,
}: {
  responseDraft: MissionMainAgentResponseDraft;
}) {
  return (
    <div className={cn("rounded-lg border px-4 py-3", toneStyle(responseDraft.tone))}>
      <p className="text-xs font-semibold text-slate-100">{responseDraft.title}</p>
      <p className="mt-0.5 text-[11px] text-slate-400">{responseDraft.message}</p>
      {responseDraft.bulletPoints.length > 0 && (
        <ul className="mt-2 space-y-1">
          {responseDraft.bulletPoints.map((b, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-400">
              <span className="mt-0.5 shrink-0 text-slate-600">·</span>
              {b}
            </li>
          ))}
        </ul>
      )}
      {responseDraft.followUpQuestions && responseDraft.followUpQuestions.length > 0 && (
        <div className="mt-2 border-t border-surface-700/50 pt-2">
          <p className="mb-1 text-[10px] uppercase tracking-wider text-slate-600">
            Follow-up questions
          </p>
          {responseDraft.followUpQuestions.map((q, i) => (
            <p key={i} className="text-[11px] text-amber-400/80">
              — {q}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function AssessmentAndDecisionRow({
  decision,
}: {
  decision: MissionMainAgentDecision;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <SectionCard label="Actionability">
        <div className="flex items-center justify-between gap-2">
          <PillBadge variant={actionabilityVariant(decision.assessment.kind)}>
            {decision.assessment.kind.replace(/_/g, " ")}
          </PillBadge>
          <span className="text-[10px] text-slate-500">
            {decision.assessment.confidence} conf.
          </span>
        </div>
        {decision.assessment.reasons.length > 0 && (
          <p className="mt-1.5 text-[10px] text-slate-500 line-clamp-2">
            {decision.assessment.reasons[0]}
          </p>
        )}
      </SectionCard>

      <SectionCard label="Decision">
        <PillBadge variant={decisionVariant(decision.decision)}>
          {decisionLabel(decision.decision)}
        </PillBadge>
        {decision.warnings.length > 0 && (
          <p className="mt-1.5 text-[10px] text-amber-400/80 line-clamp-2">
            {decision.warnings[0]}
          </p>
        )}
      </SectionCard>
    </div>
  );
}

function DraftTaskPreview({ draftTask }: { draftTask: MissionDraftTaskPayload }) {
  return (
    <SectionCard label="Draft Task">
      <div className="space-y-1.5">
        <div>
          <span className="text-[10px] text-slate-500">Title</span>
          <p className="text-xs text-slate-200">{draftTask.title}</p>
        </div>
        {draftTask.description && (
          <div>
            <span className="text-[10px] text-slate-500">Description</span>
            <p className="text-[11px] text-slate-400 line-clamp-3">{draftTask.description}</p>
          </div>
        )}
        <div className="flex flex-wrap gap-4 pt-0.5">
          <div>
            <span className="text-[10px] text-slate-500">Priority</span>
            <p className="text-xs text-slate-200">P{draftTask.priority ?? "auto"}</p>
          </div>
          <div>
            <span className="text-[10px] text-slate-500">Channel</span>
            <p className="text-xs text-slate-200">{draftTask.sourceChannel}</p>
          </div>
          <div>
            <span className="text-[10px] text-slate-500">Confidence</span>
            <p className="text-xs text-slate-200">{draftTask.intakeConfidence}</p>
          </div>
        </div>
        <WarningList items={draftTask.warnings} />
      </div>
    </SectionCard>
  );
}

function DraftSubtasksPreview({ draftTask }: { draftTask: MissionDraftTaskPayload }) {
  if (!draftTask.draftSubtasks.length) {
    return (
      <SectionCard label="Draft Subtasks (0)">
        <p className="text-[11px] text-slate-500">No subtasks were inferred from this request.</p>
      </SectionCard>
    );
  }
  return (
    <SectionCard label={`Draft Subtasks (${draftTask.draftSubtasks.length})`}>
      <div className="space-y-1">
        {draftTask.draftSubtasks.map((s, i) => (
          <div
            key={i}
            className="flex items-start gap-2 rounded border border-surface-700 bg-surface-800 px-2.5 py-1.5"
          >
            <span className="mt-0.5 shrink-0 text-[10px] text-slate-600">
              #{i + 1}
            </span>
            <span className="text-[11px] text-slate-300">{s.title}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function DecompositionPanel({
  decomposition,
}: {
  decomposition: MissionTaskDecompositionResult;
}) {
  return (
    <SectionCard label="Decomposition">
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "text-xs font-semibold",
            decompositionColor(decomposition.recommendationLevel),
          )}
        >
          {decomposition.recommendationLevel.toUpperCase()}
        </span>
        <span className="text-[10px] text-slate-500">
          {decomposition.subtaskCount} subtask
          {decomposition.subtaskCount !== 1 ? "s" : ""} · target 5–10
        </span>
      </div>
      <WarningList items={decomposition.warnings} />
    </SectionCard>
  );
}

function CreationPlanPanel({
  creationPlan,
}: {
  creationPlan: MissionTaskCreationPlan;
}) {
  return (
    <SectionCard label="Creation Plan">
      <div className="flex items-center gap-3">
        <PillBadge variant={creationPlan.readiness === "ready" ? "success" : "warning"}>
          {creationPlan.readiness === "ready" ? "Ready" : "Needs review"}
        </PillBadge>
        <span className="text-[10px] text-slate-500">
          {creationPlan.subtaskPayloads.length} subtask payload
          {creationPlan.subtaskPayloads.length !== 1 ? "s" : ""}
        </span>
      </div>
      <WarningList items={creationPlan.warnings} />
    </SectionCard>
  );
}

function ExecutionResultPanel({
  result,
}: {
  result: MissionTaskCreationExecutionResult;
}) {
  const isSuccess = result.success && result.stage === "subtasks_created";
  const isPartial = result.stage === "partial_failure";
  const isFailed = !result.success && result.stage !== "partial_failure";

  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3",
        isSuccess && "border-green-500/30 bg-green-500/5",
        isPartial && "border-amber-500/30 bg-amber-500/5",
        isFailed && "border-red-500/30 bg-red-500/5",
      )}
    >
      <div className="flex items-center gap-2">
        {isSuccess && (
          <FontAwesomeIcon icon={faCircleCheck} className="text-green-400" />
        )}
        {isPartial && (
          <FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-400" />
        )}
        {isFailed && <FontAwesomeIcon icon={faCircleXmark} className="text-red-400" />}
        <span className="text-xs font-semibold text-slate-100">
          {isSuccess && "Task created successfully"}
          {isPartial && "Task created — partial subtask failures"}
          {isFailed && "Task creation failed"}
        </span>
      </div>

      {result.taskId && (
        <p className="mt-1.5 text-[11px] text-slate-400">
          Task ID:{" "}
          <span className="font-mono text-slate-300">{result.taskId}</span>
        </p>
      )}
      {result.subtasksCreatedCount > 0 && (
        <p className="mt-0.5 text-[11px] text-slate-400">
          Subtasks created: {result.subtasksCreatedCount}
        </p>
      )}

      {result.warnings.length > 0 && <WarningList items={result.warnings} />}

      {result.errors.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {result.errors.map((e, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[10px] text-red-400/80">
              <FontAwesomeIcon icon={faCircleXmark} className="mt-0.5 shrink-0" />
              {e}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AnalysisResultSection({
  analysis,
  executionResult,
}: {
  analysis: AnalysisResult;
  executionResult: MissionTaskCreationExecutionResult | null;
}) {
  const { decision, draftTask, creationPlan, decomposition, responseDraft } = analysis;

  return (
    <div className="space-y-3">
      <ResponseGuidancePanel responseDraft={responseDraft} />
      <AssessmentAndDecisionRow decision={decision} />
      {draftTask && <DraftTaskPreview draftTask={draftTask} />}
      {draftTask && <DraftSubtasksPreview draftTask={draftTask} />}
      {decomposition && <DecompositionPanel decomposition={decomposition} />}
      {creationPlan && <CreationPlanPanel creationPlan={creationPlan} />}
      {executionResult && <ExecutionResultPanel result={executionResult} />}
    </div>
  );
}

// ──────────────────────────────────────────────
// Main modal
// ──────────────────────────────────────────────

export function CreateTaskModal({ onClose, onCreated }: CreateTaskModalProps) {
  const [rawText, setRawText] = useState("");
  const [sourceChannel, setSourceChannel] =
    useState<MissionIntakeSourceChannel>("manual-ui");
  const [requestedBy, setRequestedBy] = useState("");
  const [requestedAgentName, setRequestedAgentName] = useState("");
  const [requestedAgentId, setRequestedAgentId] = useState("");
  const [priorityOverride, setPriorityOverride] = useState<
    "" | "1" | "2" | "3" | "4" | "5"
  >("");

  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [executionResult, setExecutionResult] =
    useState<MissionTaskCreationExecutionResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const buildIntakeRequest = useCallback((): MissionRawIntakeRequest => {
    const req: MissionRawIntakeRequest = {
      rawText: rawText.trim(),
      sourceChannel,
    };
    if (requestedBy.trim()) req.requestedBy = requestedBy.trim();
    if (requestedAgentName.trim()) req.requestedAgentName = requestedAgentName.trim();
    if (requestedAgentId.trim()) req.requestedAgentId = requestedAgentId.trim();
    return req;
  }, [rawText, sourceChannel, requestedBy, requestedAgentName, requestedAgentId]);

  const computeAnalysis = useCallback((): AnalysisResult => {
    const request = buildIntakeRequest();
    const decision = decideMainAgentFlow(request);

    // Apply priority override without mutating the domain result
    let draftTask = decision.draftTask ?? null;
    if (draftTask && priorityOverride) {
      const p = Number(priorityOverride) as 1 | 2 | 3 | 4 | 5;
      draftTask = { ...draftTask, priority: p };
    }

    // Recompute plan from (potentially overridden) draft
    const creationPlan = draftTask ? toTaskCreationPlan(draftTask) : null;

    const decomposition = draftTask
      ? evaluateTaskDecomposition(buildSyntheticTaskDetail(draftTask))
      : null;

    const responseDraft = buildMainAgentResponseDraft(decision);

    return { decision, draftTask, creationPlan, decomposition, responseDraft };
  }, [buildIntakeRequest, priorityOverride]);

  const handleAnalyze = useCallback(() => {
    setIsAnalyzing(true);
    try {
      const result = computeAnalysis();
      setAnalysisResult(result);
      setExecutionResult(null);
    } finally {
      setIsAnalyzing(false);
    }
  }, [computeAnalysis]);

  const handleCreate = useCallback(async () => {
    setIsCreating(true);
    try {
      // Auto-run analysis if not done yet
      let analysis = analysisResult;
      if (!analysis) {
        analysis = computeAnalysis();
        setAnalysisResult(analysis);
      }

      const { decision, draftTask, creationPlan } = analysis;

      // Guard: not actionable
      if (!decision.assessment.isActionable) {
        setExecutionResult({
          success: false,
          taskCreated: false,
          subtasksCreatedCount: 0,
          warnings: decision.warnings,
          errors: [
            "Task cannot be created: request is not actionable. Review the analysis and refine the input.",
          ],
          stage: "failed",
        });
        return;
      }

      // Guard: no draft task to work from
      if (!draftTask) {
        setExecutionResult({
          success: false,
          taskCreated: false,
          subtasksCreatedCount: 0,
          warnings: [],
          errors: ["No draft task could be built from this request."],
          stage: "failed",
        });
        return;
      }

      const result = await executeTaskCreation(
        creationPlan ? { creationPlan } : { draftTask },
      );
      setExecutionResult(result);

      if (result.success && result.taskId) {
        onCreated?.(result.taskId);
      }
    } finally {
      setIsCreating(false);
    }
  }, [analysisResult, computeAnalysis, onCreated]);

  const hasRawText = rawText.trim().length > 0;
  const isBusy = isAnalyzing || isCreating;

  // Create is disabled if: no input, busy, or analysis ran and is explicitly not actionable
  const isCreateDisabled =
    !hasRawText ||
    isBusy ||
    (analysisResult !== null && !analysisResult.decision.assessment.isActionable);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-8"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl rounded-xl border border-surface-700 bg-surface-900 shadow-2xl">
        {/* ── Header ── */}
        <div className="flex items-start justify-between border-b border-surface-700 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Create New Task</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Turn a raw request into a structured Mission Control task.
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 shrink-0 rounded border border-surface-700 bg-surface-800 px-2 py-1 text-slate-400 hover:bg-surface-700 hover:text-slate-200"
            aria-label="Close modal"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {/* ── Form ── */}
          <div className="space-y-3">
            {/* Raw request */}
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Raw Request{" "}
                <span className="font-normal normal-case tracking-normal text-red-400">
                  required
                </span>
              </label>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Describe what needs to be done..."
                rows={4}
                className="w-full resize-none rounded border border-surface-700 bg-surface-800 px-3 py-2 text-xs text-slate-200 outline-none placeholder:text-slate-500 focus:border-cyan-500/50"
              />
            </div>

            {/* Source channel + Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Source Channel
                </label>
                <select
                  value={sourceChannel}
                  onChange={(e) =>
                    setSourceChannel(e.target.value as MissionIntakeSourceChannel)
                  }
                  className="w-full rounded border border-surface-700 bg-surface-800 px-2.5 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500/50"
                >
                  {SOURCE_CHANNEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Priority Override
                </label>
                <select
                  value={priorityOverride}
                  onChange={(e) =>
                    setPriorityOverride(
                      e.target.value as "" | "1" | "2" | "3" | "4" | "5",
                    )
                  }
                  className="w-full rounded border border-surface-700 bg-surface-800 px-2.5 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500/50"
                >
                  {PRIORITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Requested by + Agent name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Requested By
                </label>
                <input
                  value={requestedBy}
                  onChange={(e) => setRequestedBy(e.target.value)}
                  placeholder="Name or handle"
                  className="w-full rounded border border-surface-700 bg-surface-800 px-2.5 py-2 text-xs text-slate-200 outline-none placeholder:text-slate-500 focus:border-cyan-500/50"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Requested Agent Name
                </label>
                <input
                  value={requestedAgentName}
                  onChange={(e) => setRequestedAgentName(e.target.value)}
                  placeholder="Agent name (optional)"
                  className="w-full rounded border border-surface-700 bg-surface-800 px-2.5 py-2 text-xs text-slate-200 outline-none placeholder:text-slate-500 focus:border-cyan-500/50"
                />
              </div>
            </div>

            {/* Agent ID */}
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Requested Agent ID{" "}
                <span className="font-normal normal-case tracking-normal text-slate-600">
                  optional
                </span>
              </label>
              <input
                value={requestedAgentId}
                onChange={(e) => setRequestedAgentId(e.target.value)}
                placeholder="Agent UUID (optional)"
                className="w-full rounded border border-surface-700 bg-surface-800 px-2.5 py-2 text-xs text-slate-200 outline-none placeholder:text-slate-500 focus:border-cyan-500/50"
              />
            </div>
          </div>

          {/* ── Analysis results ── */}
          {analysisResult ? (
            <AnalysisResultSection
              analysis={analysisResult}
              executionResult={executionResult}
            />
          ) : (
            <div className="rounded-lg border border-surface-700 bg-surface-800/40 px-4 py-6 text-center">
              <p className="text-[11px] text-slate-500">
                Click{" "}
                <span className="font-semibold text-cyan-400">Analyze Request</span> to
                preview the task structure and decision before creating.
              </p>
            </div>
          )}

          {/* ── Footer actions ── */}
          <div className="flex items-center justify-between border-t border-surface-700 pt-4">
            <button
              onClick={onClose}
              className="rounded border border-surface-700 bg-surface-800 px-3 py-2 text-xs text-slate-400 hover:bg-surface-700 hover:text-slate-200"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleAnalyze}
                disabled={!hasRawText || isBusy}
                className={cn(
                  "flex items-center gap-1.5 rounded border px-3 py-2 text-xs font-medium transition-colors",
                  hasRawText && !isBusy
                    ? "border-surface-600 bg-surface-800 text-slate-200 hover:bg-surface-700"
                    : "cursor-not-allowed border-surface-700 bg-surface-800 text-slate-600",
                )}
              >
                <FontAwesomeIcon icon={faBolt} className="text-cyan-400" />
                {isAnalyzing ? "Analyzing…" : "Analyze Request"}
              </button>

              <button
                onClick={handleCreate}
                disabled={isCreateDisabled}
                className={cn(
                  "flex items-center gap-1.5 rounded border px-3 py-2 text-xs font-semibold transition-colors",
                  !isCreateDisabled
                    ? "border-cyan-500/50 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30"
                    : "cursor-not-allowed border-surface-700 bg-surface-800 text-slate-600",
                )}
              >
                <FontAwesomeIcon icon={faPlus} />
                {isCreating ? "Creating…" : "Create Task"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
