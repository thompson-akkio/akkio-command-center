import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronRight, ArrowRight } from "lucide-react";
import { MOCK_TEAMS, POC_STAGES } from "@/lib/mockData";

interface Props {
  viewMode: "admin" | "user";
}

const stageColors = [
  "bg-info/20 border-info/30 text-info",
  "bg-primary/20 border-primary/30 text-primary",
  "bg-success/20 border-success/30 text-success",
  "bg-warning/20 border-warning/30 text-warning",
  "bg-accent/20 border-accent/30 text-accent",
];

const stageDotColors = [
  "bg-info",
  "bg-primary",
  "bg-success",
  "bg-warning",
  "bg-accent",
];

const POCJourneyTab = ({ viewMode }: Props) => {
  const [teams, setTeams] = useState(MOCK_TEAMS);
  const currentUserTeam = teams[0]; // Mock: user belongs to first team

  const handleStageChange = (teamId: string, newStage: number) => {
    setTeams((prev) =>
      prev.map((t) => (t.id === teamId ? { ...t, stage: newStage } : t))
    );
  };

  if (viewMode === "user") {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h2 className="text-lg font-semibold mb-1">Your POC Journey</h2>
        <p className="text-sm text-muted-foreground mb-8">
          Team: <span className="text-foreground font-medium">{currentUserTeam.name}</span>
        </p>

        <div className="relative">
          {/* Progress line */}
          <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-border" />
          <div
            className="absolute left-6 top-8 w-0.5 bg-primary transition-all duration-500"
            style={{
              height: `${(currentUserTeam.stage / (POC_STAGES.length - 1)) * 100}%`,
              maxHeight: "calc(100% - 64px)",
            }}
          />

          <div className="space-y-6">
            {POC_STAGES.map((stage, i) => {
              const isComplete = i < currentUserTeam.stage;
              const isCurrent = i === currentUserTeam.stage;
              const isFuture = i > currentUserTeam.stage;

              return (
                <motion.div
                  key={stage.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-4 relative"
                >
                  <div
                    className={`w-12 h-12 rounded-full border-2 flex items-center justify-center shrink-0 z-10 transition-all ${
                      isComplete
                        ? "bg-success border-success text-success-foreground"
                        : isCurrent
                        ? "bg-primary border-primary text-primary-foreground glow-primary"
                        : "bg-card border-border text-muted-foreground"
                    }`}
                  >
                    <span className="font-mono text-sm font-bold">{i + 1}</span>
                  </div>
                  <div
                    className={`flex-1 rounded-lg border p-4 transition-all ${
                      isCurrent
                        ? "bg-primary/5 border-primary/30 glow-primary"
                        : isComplete
                        ? "bg-success/5 border-success/20"
                        : "bg-card border-border opacity-50"
                    }`}
                  >
                    <h3 className={`text-sm font-semibold ${isFuture ? "text-muted-foreground" : ""}`}>
                      {stage.label}
                      {isCurrent && (
                        <span className="ml-2 text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
                          CURRENT
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">{stage.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Admin view
  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold mb-1">POC Journey Overview</h2>
      <p className="text-sm text-muted-foreground mb-6">All teams and their current stages</p>

      {/* Stage header row */}
      <div className="mb-4 flex gap-2 pl-36">
        {POC_STAGES.map((stage, i) => (
          <div key={stage.id} className="flex-1 text-center">
            <span className={`text-xs font-mono font-medium ${stageColors[i].split(" ").pop()}`}>
              {stage.label}
            </span>
          </div>
        ))}
      </div>

      {/* Team rows */}
      <div className="space-y-3">
        {teams.map((team, ti) => (
          <motion.div
            key={team.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: ti * 0.05 }}
            className="flex items-center gap-2"
          >
            <div className="w-32 shrink-0">
              <p className="text-sm font-medium truncate">{team.name}</p>
              <p className="text-xs text-muted-foreground">{team.members.length} members</p>
            </div>
            <div className="flex-1 flex gap-2">
              {POC_STAGES.map((stage, si) => {
                const isActive = si === team.stage;
                const isComplete = si < team.stage;
                return (
                  <button
                    key={stage.id}
                    onClick={() => handleStageChange(team.id, si)}
                    className={`flex-1 h-10 rounded-md border text-xs font-medium transition-all ${
                      isActive
                        ? `${stageColors[si]} border glow-primary`
                        : isComplete
                        ? "bg-success/10 border-success/20 text-success"
                        : "bg-card border-border text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {isActive ? "●" : isComplete ? "✓" : ""}
                  </button>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default POCJourneyTab;
