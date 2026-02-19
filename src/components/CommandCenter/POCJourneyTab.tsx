import { useState } from "react";
import { motion } from "framer-motion";
import { MOCK_TEAMS, POC_STAGES } from "@/lib/mockData";

interface Props {
  teamId: string;
  isAdmin: boolean;
}

const POCJourneyTab = ({ teamId, isAdmin }: Props) => {
  const [teams, setTeams] = useState(MOCK_TEAMS);
  const currentTeam = teams.find((t) => t.id === teamId) ?? teams[0];

  const handleStageChange = (newStage: number) => {
    if (!isAdmin) return;
    setTeams((prev) =>
      prev.map((t) => (t.id === teamId ? { ...t, stage: newStage } : t))
    );
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-lg font-semibold mb-1">POC Journey</h2>
      <p className="text-sm text-muted-foreground mb-8">
        Team: <span className="text-foreground font-medium">{currentTeam.name}</span>
        {isAdmin && (
          <span className="ml-2 text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
            Click a stage to update
          </span>
        )}
      </p>

      <div className="relative">
        {/* Progress line background */}
        <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-border" />
        {/* Progress line fill */}
        <div
          className="absolute left-6 top-8 w-0.5 bg-primary transition-all duration-500"
          style={{
            height: `${(currentTeam.stage / (POC_STAGES.length - 1)) * 100}%`,
            maxHeight: "calc(100% - 64px)",
          }}
        />

        <div className="space-y-6">
          {POC_STAGES.map((stage, i) => {
            const isComplete = i < currentTeam.stage;
            const isCurrent = i === currentTeam.stage;
            const isFuture = i > currentTeam.stage;

            return (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-4 relative"
              >
                <button
                  onClick={() => handleStageChange(i)}
                  disabled={!isAdmin}
                  className={`w-12 h-12 rounded-full border-2 flex items-center justify-center shrink-0 z-10 transition-all ${
                    isAdmin ? "cursor-pointer hover:scale-105" : "cursor-default"
                  } ${
                    isComplete
                      ? "bg-success border-success text-success-foreground"
                      : isCurrent
                      ? "bg-primary border-primary text-primary-foreground glow-primary"
                      : "bg-card border-border text-muted-foreground"
                  }`}
                >
                  <span className="font-mono text-sm font-bold">{i + 1}</span>
                </button>

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
                    {isComplete && (
                      <span className="ml-2 text-xs font-mono text-success bg-success/10 px-2 py-0.5 rounded">
                        COMPLETE
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
};

export default POCJourneyTab;
