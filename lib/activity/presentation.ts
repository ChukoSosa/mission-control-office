import type { ActivityItem } from "@/lib/schemas";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faBolt,
  faBoxArchive,
  faListCheck,
  faTriangleExclamation,
  faUser,
} from "@fortawesome/free-solid-svg-icons";

export interface ActivityVisual {
  icon: IconDefinition;
  label: string;
  toneClassName: string;
  badgeClassName: string;
}

export function getActivityVisual(item: ActivityItem): ActivityVisual {
  const action = (item.action ?? item.type ?? item.event ?? "").toLowerCase();

  if (action.includes("comment.answered")) {
    return {
      icon: faBolt,
      label: "Reply",
      toneClassName: "text-cyan-300",
      badgeClassName: "border-cyan-500/30 bg-cyan-500/10 text-cyan-200",
    };
  }

  if (action.includes("comment")) {
    return {
      icon: faBolt,
      label: "Comment",
      toneClassName: "text-fuchsia-300",
      badgeClassName: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200",
    };
  }

  if (action.includes("subtask.completed")) {
    return {
      icon: faListCheck,
      label: "Subtask Done",
      toneClassName: "text-emerald-300",
      badgeClassName: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    };
  }

  if (action.includes("subtask.blocked")) {
    return {
      icon: faTriangleExclamation,
      label: "Subtask Blocked",
      toneClassName: "text-red-300",
      badgeClassName: "border-red-500/30 bg-red-500/10 text-red-200",
    };
  }

  if (action.includes("subtask")) {
    return {
      icon: faListCheck,
      label: "Subtask",
      toneClassName: "text-amber-300",
      badgeClassName: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    };
  }

  if (action.includes("task.completed")) {
    return {
      icon: faListCheck,
      label: "Task Done",
      toneClassName: "text-emerald-300",
      badgeClassName: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    };
  }

  if (action.includes("task.blocked")) {
    return {
      icon: faTriangleExclamation,
      label: "Task Blocked",
      toneClassName: "text-red-300",
      badgeClassName: "border-red-500/30 bg-red-500/10 text-red-200",
    };
  }

  if (action.includes("task.archived")) {
    return {
      icon: faBoxArchive,
      label: "Archived",
      toneClassName: "text-amber-300",
      badgeClassName: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    };
  }

  if (action.includes("task.moved")) {
    return {
      icon: faBolt,
      label: "Moved",
      toneClassName: "text-cyan-300",
      badgeClassName: "border-cyan-500/30 bg-cyan-500/10 text-cyan-200",
    };
  }

  if (action.includes("task")) {
    return {
      icon: faListCheck,
      label: "Task",
      toneClassName: "text-slate-200",
      badgeClassName: "border-slate-600 bg-surface-800 text-slate-300",
    };
  }

  if (action.includes("agent")) {
    return {
      icon: faUser,
      label: "Agent",
      toneClassName: "text-cyan-300",
      badgeClassName: "border-cyan-500/30 bg-cyan-500/10 text-cyan-200",
    };
  }

  return {
    icon: faBolt,
    label: "Event",
    toneClassName: "text-slate-300",
    badgeClassName: "border-slate-600 bg-surface-800 text-slate-300",
  };
}

export function getActivityActorLabel(item: ActivityItem): string | null {
  if (item.actorName) return item.actorName;
  if (item.actorType === "human") return "Operator";
  if (item.actorType === "system") return "System";
  if (item.actorId) return item.actorId;
  return null;
}