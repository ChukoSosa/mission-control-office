import { cn } from "@/lib/utils/cn";
import type { MissionSystemLifecycleState } from "@/lib/mission/systemState";

interface SystemStateBadgeProps {
  state?: MissionSystemLifecycleState;
}

export function SystemStateBadge({ state }: SystemStateBadgeProps) {
  if (!state) {
    return (
      <span className="inline-flex items-center rounded border border-surface-600 bg-surface-800 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        Unknown
      </span>
    );
  }

  const styles = {
    BOOTSTRAPPING: "border-cyan-500/40 bg-cyan-500/15 text-cyan-300",
    CONFIGURING: "border-amber-500/40 bg-amber-500/15 text-amber-300",
    READY: "border-green-500/40 bg-green-500/15 text-green-300",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
        styles[state],
      )}
    >
      {state}
    </span>
  );
}
