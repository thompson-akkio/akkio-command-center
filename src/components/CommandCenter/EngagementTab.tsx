import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Clock, MessageSquare, TrendingUp, Users } from "lucide-react";
import { MOCK_ENGAGEMENT } from "@/lib/mockData";

const EngagementTab = () => {
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  const totalHoursAll = MOCK_ENGAGEMENT.reduce((sum, t) => sum + t.totalHours, 0);
  const totalUsersAll = MOCK_ENGAGEMENT.reduce((sum, t) => sum + t.users.length, 0);

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold mb-1">User Engagement</h2>
      <p className="text-sm text-muted-foreground mb-6">Data from BigQuery · Updated hourly</p>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-card border border-border rounded-lg p-4 card-hover">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground font-mono uppercase">Total Active Hours</span>
          </div>
          <p className="text-2xl font-bold font-mono">{totalHoursAll.toFixed(1)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 card-hover">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-success" />
            <span className="text-xs text-muted-foreground font-mono uppercase">Total Users</span>
          </div>
          <p className="text-2xl font-bold font-mono">{totalUsersAll}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 card-hover">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-accent" />
            <span className="text-xs text-muted-foreground font-mono uppercase">Active Teams</span>
          </div>
          <p className="text-2xl font-bold font-mono">{MOCK_ENGAGEMENT.length}</p>
        </div>
      </div>

      {/* Teams table */}
      <div className="space-y-2">
        {MOCK_ENGAGEMENT.map((team, ti) => (
          <motion.div
            key={team.teamId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: ti * 0.05 }}
          >
            <button
              onClick={() => setExpandedTeam(expandedTeam === team.teamId ? null : team.teamId)}
              className="w-full flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3 card-hover text-left"
            >
              <div className="flex items-center gap-3">
                <ChevronRight
                  className={`w-4 h-4 text-muted-foreground transition-transform ${
                    expandedTeam === team.teamId ? "rotate-90" : ""
                  }`}
                />
                <div>
                  <p className="text-sm font-semibold">{team.teamName}</p>
                  <p className="text-xs text-muted-foreground">{team.users.length} members</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-sm font-mono font-bold">{team.totalHours.toFixed(1)}h</p>
                  <p className="text-xs text-muted-foreground">total</p>
                </div>
                {/* Activity bar */}
                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.min((team.totalHours / 70) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </button>

            <AnimatePresence>
              {expandedTeam === team.teamId && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-1 ml-7 bg-secondary/50 border border-border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left px-4 py-2 text-xs text-muted-foreground font-mono uppercase">
                            User
                          </th>
                          <th className="text-right px-4 py-2 text-xs text-muted-foreground font-mono uppercase">
                            Total Hours
                          </th>
                          <th className="text-right px-4 py-2 text-xs text-muted-foreground font-mono uppercase">
                            Past Week
                          </th>
                          <th className="text-right px-4 py-2 text-xs text-muted-foreground font-mono uppercase">
                            Chats
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {team.users.map((user) => (
                          <tr key={user.name} className="border-b border-border/50 last:border-0">
                            <td className="px-4 py-2.5 font-medium">{user.name}</td>
                            <td className="px-4 py-2.5 text-right font-mono">{user.totalHours}h</td>
                            <td className="px-4 py-2.5 text-right font-mono">{user.weekHours}h</td>
                            <td className="px-4 py-2.5 text-right font-mono flex items-center justify-end gap-1">
                              <MessageSquare className="w-3 h-3 text-muted-foreground" />
                              {user.totalChats}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default EngagementTab;
