import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  CheckCircle2,
  Circle,
  Clock,
  Users,
  Target,
  MessageSquare,
  Loader2,
} from "lucide-react";
import {
  POC_PHASES,
  POC_TOTAL_STAGES,
  POC_REQUIREMENTS,
} from "@/lib/mockData";
import type { POCPhase, POCStage } from "@/lib/mockData";
import { usePocProgress, useUpdatePocStage } from "@/hooks/usePocProgress";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  teamId: string;
  isAdmin: boolean;
}

/* ── Icon map for requirements ─────────────────────── */
const REQUIREMENT_ICONS = [
  <Target className="w-4 h-4" />,
  <Users className="w-4 h-4" />,
  <CheckCircle2 className="w-4 h-4" />,
  <MessageSquare className="w-4 h-4" />,
];

/* ── Helpers ───────────────────────────────────────── */
function getPhaseForStage(stageId: number): POCPhase {
  return POC_PHASES.find((p) => p.stages.some((s) => s.id === stageId)) ?? POC_PHASES[0];
}

function getPhaseProgress(phase: POCPhase, currentStage: number) {
  const first = phase.stages[0].id;
  const last = phase.stages[phase.stages.length - 1].id;

  if (currentStage > last) return 1; // whole phase done
  if (currentStage < first) return 0; // not started
  return (currentStage - first) / (last - first + 1);
}

/* ── Main Component ────────────────────────────────── */
const POCJourneyTab = ({ teamId, isAdmin }: Props) => {
  const auth = useAuth();
  const { data: progress, isLoading } = usePocProgress(teamId);
  const updateStage = useUpdatePocStage();

  const currentStage = progress?.stage ?? 0;

  const [expandedStages, setExpandedStages] = useState<Set<number>>(
    new Set([currentStage])
  );

  const handleStageChange = (newStage: number) => {
    if (!isAdmin) return;
    updateStage.mutate({
      teamId,
      stage: newStage,
      updatedBy: auth.user?.id,
    });
  };

  const toggleExpand = (stageId: number) => {
    setExpandedStages((prev) => {
      const next = new Set(prev);
      if (next.has(stageId)) next.delete(stageId);
      else next.add(stageId);
      return next;
    });
  };

  const currentPhase = getPhaseForStage(currentStage);
  const overallProgress = ((currentStage + 1) / POC_TOTAL_STAGES) * 100;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading journey…
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 pb-16">
      {/* ── Header ─────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold mb-1">Partnership Journey</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {isAdmin && (
            <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
              Click a stage to update
            </span>
          )}
        </p>

        {/* Overall progress bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${overallProgress}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
          <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
            {currentStage + 1} / {POC_TOTAL_STAGES}
          </span>
        </div>

        {/* Current phase badge */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs font-mono text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-md">
            {currentPhase.id === "pre-kickoff" ? "Phase 1" : "Phase 2"}
          </span>
          <span className="text-xs text-muted-foreground">
            {currentPhase.label}
            {currentPhase.subtitle && (
              <span className="text-muted-foreground/60 ml-1">
                ({currentPhase.subtitle})
              </span>
            )}
          </span>
        </div>
      </div>

      {/* ── Phase Sections ─────────────────────────── */}
      {POC_PHASES.map((phase, phaseIdx) => {
        const phaseProgress = getPhaseProgress(phase, currentStage);
        const phaseComplete = phaseProgress === 1;
        const phaseActive = phase.stages.some(
          (s) => s.id === currentStage
        );
        const phaseFuture = phase.stages[0].id > currentStage;

        const phaseColor = phase.id === "pre-kickoff" ? "primary" : "accent";
        const phaseNum = phaseIdx + 1;

        return (
          <motion.section
            key={phase.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: phaseIdx * 0.15 }}
          >
            {/* Phase header */}
            <div
              className={`rounded-lg border p-4 mb-4 transition-all ${
                phaseActive
                  ? `bg-${phaseColor}/5 border-${phaseColor}/30`
                  : phaseComplete
                  ? "bg-success/5 border-success/20"
                  : "bg-card border-border opacity-60"
              }`}
              style={
                phaseActive
                  ? {
                      backgroundColor: `hsl(var(--${phaseColor}) / 0.05)`,
                      borderColor: `hsl(var(--${phaseColor}) / 0.3)`,
                    }
                  : phaseComplete
                  ? {
                      backgroundColor: "hsl(var(--success) / 0.05)",
                      borderColor: "hsl(var(--success) / 0.2)",
                    }
                  : undefined
              }
            >
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    phaseComplete
                      ? "bg-success/15 text-success"
                      : phaseActive
                      ? phase.id === "pre-kickoff"
                        ? "bg-primary/15 text-primary"
                        : "bg-accent/15 text-accent"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  PHASE {phaseNum}
                </span>
                <h3 className="text-sm font-semibold">
                  {phase.label}
                  {phase.subtitle && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {phase.subtitle}
                    </span>
                  )}
                </h3>
                {phaseComplete && (
                  <CheckCircle2 className="w-4 h-4 text-success ml-auto" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 ml-[4.25rem]">
                {phase.description}
              </p>
            </div>

            {/* Stage timeline within phase */}
            <div className="relative ml-2">
              {/* Vertical connector line */}
              <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-border" />
              {/* Filled progress line */}
              <motion.div
                className="absolute left-[19px] top-4 w-0.5 rounded-full"
                style={{
                  backgroundColor: phaseComplete
                    ? "hsl(var(--success))"
                    : `hsl(var(--${phaseColor}))`,
                }}
                initial={{ height: 0 }}
                animate={{
                  height: `${Math.min(phaseProgress, 1) * 100}%`,
                }}
                transition={{ duration: 0.5, delay: phaseIdx * 0.15 + 0.2 }}
              />

              <div className="space-y-3">
                {phase.stages.map((stage, stageIdx) => (
                  <StageCard
                    key={stage.id}
                    stage={stage}
                    globalIndex={stage.id}
                    currentStage={currentStage}
                    isAdmin={isAdmin}
                    expanded={expandedStages.has(stage.id)}
                    phaseColor={phaseColor}
                    animDelay={phaseIdx * 0.15 + stageIdx * 0.08}
                    onStageChange={handleStageChange}
                    onToggleExpand={toggleExpand}
                  />
                ))}
              </div>
            </div>
          </motion.section>
        );
      })}

      {/* ── Requirements ───────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
          What We Need From You
        </h3>
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {POC_REQUIREMENTS.map((req, i) => (
            <div
              key={req.label}
              className={`flex items-start gap-3 px-4 py-3 ${
                i < POC_REQUIREMENTS.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center text-muted-foreground shrink-0 mt-0.5">
                {REQUIREMENT_ICONS[i]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{req.label}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      req.timing === "Throughout"
                        ? "bg-accent/10 text-accent"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {req.timing}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {req.description}
                </p>
              </div>
            </div>
          ))}
          <div className="px-4 py-2.5 bg-secondary/30 border-t border-border">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Time commitment:{" "}
                <span className="text-foreground font-medium">
                  3-5 hours weekly
                </span>{" "}
                — more engagement = better outcomes
              </span>
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
};

/* ── Stage Card ────────────────────────────────────── */
interface StageCardProps {
  stage: POCStage;
  globalIndex: number;
  currentStage: number;
  isAdmin: boolean;
  expanded: boolean;
  phaseColor: string;
  animDelay: number;
  onStageChange: (stage: number) => void;
  onToggleExpand: (stage: number) => void;
}

const StageCard = ({
  stage,
  globalIndex,
  currentStage,
  isAdmin,
  expanded,
  phaseColor,
  animDelay,
  onStageChange,
  onToggleExpand,
}: StageCardProps) => {
  const isComplete = globalIndex < currentStage;
  const isCurrent = globalIndex === currentStage;
  const isFuture = globalIndex > currentStage;

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: animDelay }}
      className="flex items-start gap-3 relative"
    >
      {/* Stage circle */}
      <button
        onClick={() => onStageChange(globalIndex)}
        disabled={!isAdmin}
        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 z-10 transition-all ${
          isAdmin ? "cursor-pointer hover:scale-110" : "cursor-default"
        } ${
          isComplete
            ? "bg-success border-success text-success-foreground"
            : isCurrent
            ? `bg-${phaseColor} border-${phaseColor} text-${phaseColor}-foreground`
            : "bg-card border-border text-muted-foreground"
        }`}
        style={
          isCurrent
            ? {
                backgroundColor: `hsl(var(--${phaseColor}))`,
                borderColor: `hsl(var(--${phaseColor}))`,
                color: `hsl(var(--${phaseColor}-foreground))`,
                boxShadow: `0 0 16px hsl(var(--${phaseColor}) / 0.25)`,
              }
            : undefined
        }
      >
        {isComplete ? (
          <CheckCircle2 className="w-4 h-4" />
        ) : (
          <span className="font-mono text-xs font-bold">
            {globalIndex + 1}
          </span>
        )}
      </button>

      {/* Card */}
      <div
        className={`flex-1 rounded-lg border transition-all ${
          isCurrent
            ? "border-primary/30 bg-primary/5"
            : isComplete
            ? "bg-success/5 border-success/20"
            : "bg-card border-border opacity-50"
        }`}
        style={
          isCurrent
            ? {
                borderColor: `hsl(var(--${phaseColor}) / 0.3)`,
                backgroundColor: `hsl(var(--${phaseColor}) / 0.05)`,
              }
            : undefined
        }
      >
        {/* Collapsed header — always visible */}
        <button
          onClick={() => onToggleExpand(stage.id)}
          className="w-full flex items-center gap-2 px-4 py-3 text-left"
        >
          <motion.div
            animate={{ rotate: expanded ? 90 : 0 }}
            transition={{ duration: 0.15 }}
            className="text-muted-foreground"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </motion.div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-sm font-semibold ${
                  isFuture ? "text-muted-foreground" : ""
                }`}
              >
                {stage.label}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground/70">
                {stage.subtitle}
              </span>
            </div>
          </div>

          {/* Status badge */}
          {isCurrent && (
            <span
              className="text-[10px] font-mono px-2 py-0.5 rounded shrink-0"
              style={{
                backgroundColor: `hsl(var(--${phaseColor}) / 0.12)`,
                color: `hsl(var(--${phaseColor}))`,
              }}
            >
              CURRENT
            </span>
          )}
          {isComplete && (
            <span className="text-[10px] font-mono text-success bg-success/10 px-2 py-0.5 rounded shrink-0">
              COMPLETE
            </span>
          )}
        </button>

        {/* Expanded details */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-0 space-y-3">
                {/* Description */}
                <p className="text-xs text-muted-foreground leading-relaxed pl-5">
                  {stage.description}
                </p>

                {/* Two-column roles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-5">
                  <div className="rounded-md bg-secondary/50 border border-border px-3 py-2.5">
                    <span className="text-[10px] font-mono text-primary uppercase tracking-wider">
                      Your Role
                    </span>
                    <p className="text-xs text-foreground mt-1 leading-relaxed">
                      {stage.clientRole}
                    </p>
                  </div>
                  <div className="rounded-md bg-secondary/50 border border-border px-3 py-2.5">
                    <span className="text-[10px] font-mono text-accent uppercase tracking-wider">
                      Our Role
                    </span>
                    <p className="text-xs text-foreground mt-1 leading-relaxed">
                      {stage.akkioRole}
                    </p>
                  </div>
                </div>

                {/* Outcomes */}
                <div className="pl-5">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                    Key Outcomes
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {stage.outcomes.map((outcome) => {
                      const done = isComplete || isCurrent;
                      return (
                        <span
                          key={outcome}
                          className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border ${
                            done && isComplete
                              ? "border-success/20 bg-success/10 text-success"
                              : done && isCurrent
                              ? "border-border bg-secondary text-foreground"
                              : "border-border bg-secondary/50 text-muted-foreground"
                          }`}
                        >
                          {isComplete ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <Circle className="w-3 h-3" />
                          )}
                          {outcome}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default POCJourneyTab;
