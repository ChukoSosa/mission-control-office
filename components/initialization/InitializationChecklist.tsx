import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckCircle, faCircleNotch, faCircle, faBolt } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils/cn";
import type { MissionSystemLifecycleState } from "@/lib/mission/systemState";

interface InitializationChecklistProps {
  state?: MissionSystemLifecycleState;
}

type StepStatus = "done" | "active" | "pending";

interface Step {
  key: string;
  label: string;
  status: StepStatus;
}

function resolveSteps(state?: MissionSystemLifecycleState): Step[] {
  const steps = [
    "Reading initialization guide",
    "Creating onboarding task",
    "Creating onboarding subtasks",
    "Discovering host agents",
    "Registering agents in Mission Control",
    "Loading task rules",
    "Validating task methodology",
    "Verifying activity logging",
    "Finalizing system state",
  ];

  let activeIndex = 0;
  let doneThreshold = -1;

  if (state === "BOOTSTRAPPING") {
    doneThreshold = 1;
    activeIndex = 2;
  } else if (state === "CONFIGURING") {
    doneThreshold = 6;
    activeIndex = 7;
  } else if (state === "READY") {
    doneThreshold = steps.length - 1;
    activeIndex = -1;
  }

  return steps.map((label, index) => {
    if (index <= doneThreshold) {
      return { key: label, label, status: "done" };
    }

    if (index === activeIndex) {
      return { key: label, label, status: "active" };
    }

    return { key: label, label, status: "pending" };
  });
}

export function InitializationChecklist({ state }: InitializationChecklistProps) {
  const steps = resolveSteps(state);

  return (
    <div className="space-y-2">
      {steps.map((step) => (
        <div
          key={step.key}
          className={cn(
            "flex items-center gap-2 rounded border px-3 py-2 text-xs",
            step.status === "done" && "border-green-500/20 bg-green-500/5 text-green-300",
            step.status === "active" && "border-cyan-500/25 bg-cyan-500/8 text-cyan-200",
            step.status === "pending" && "border-surface-700 bg-surface-800 text-slate-400",
          )}
        >
          {step.status === "done" && <FontAwesomeIcon icon={faCheckCircle} className="text-green-400" />}
          {step.status === "active" && (
            <FontAwesomeIcon icon={faCircleNotch} className="animate-spin text-cyan-300" />
          )}
          {step.status === "pending" && <FontAwesomeIcon icon={faCircle} className="text-slate-600" />}

          <span className="flex-1">{step.label}</span>

          {step.status === "active" && (
            <span className="inline-flex items-center gap-1 rounded border border-cyan-500/30 bg-cyan-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-cyan-300">
              <FontAwesomeIcon icon={faBolt} className="text-[9px]" />
              Running
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
