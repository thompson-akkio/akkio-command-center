import { motion } from "framer-motion";
import { Clock, MessageSquare, TrendingUp, Activity, Loader2, AlertCircle } from "lucide-react";
import { MOCK_ENGAGEMENT, MOCK_TEAMS, MOCK_CURRENT_USER } from "@/lib/mockData";
import { supabase } from "@/lib/supabase";
import { useTeamEngagement, type TeamEngagement } from "@/hooks/useEngagement";

interface Props {
  teamId: string;
  orgName: string | null;
  currentUser: typeof MOCK_CURRENT_USER;
}

const StatCard = ({
  icon: Icon,
  label,
  value,
  color = "text-primary",
  delay = 0,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color?: string;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-card border border-border rounded-lg p-4 card-hover"
  >
    <div className="flex items-center gap-2 mb-2">
      <Icon className={`w-4 h-4 ${color}`} />
      <span className="text-xs text-muted-foreground font-mono uppercase">{label}</span>
    </div>
    <p className="text-2xl font-bold font-mono">{value}</p>
  </motion.div>
);

const EngagementTab = ({ teamId, orgName, currentUser }: Props) => {
  const mockTeam = MOCK_TEAMS.find((t) => t.id === teamId);
  const isSupabaseConfigured = !!supabase;

  const { data: liveData, isLoading, error } = useTeamEngagement(teamId, orgName);

  // Resolve data source: live Supabase data or mock fallback
  const mockData = MOCK_ENGAGEMENT[teamId];
  const teamData: TeamEngagement | null = isSupabaseConfigured
    ? liveData ?? null
    : mockData
      ? {
          totalHours: mockData.totalHours,
          weekHours: mockData.weekHours,
          totalChats: mockData.totalChats,
          users: mockData.users.map((u) => ({
            name: u.name,
            email: null,
            userId: u.name.toLowerCase().replace(/\s+/g, "-"),
            totalHours: u.totalHours,
            weekHours: u.weekHours,
            totalChats: u.totalChats,
          })),
        }
      : null;

  if (!isSupabaseConfigured && !mockTeam) {
    return (
      <div className="p-6 text-muted-foreground text-sm">No engagement data available for this team.</div>
    );
  }

  if (isSupabaseConfigured && isLoading && !teamData) {
    return (
      <div className="p-6 flex items-center gap-3 text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading engagement data...</span>
      </div>
    );
  }

  if (isSupabaseConfigured && error && !teamData) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-destructive text-sm mb-2">
          <AlertCircle className="w-4 h-4" />
          <span>Failed to load engagement data</span>
        </div>
        <p className="text-xs text-muted-foreground font-mono">
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
      </div>
    );
  }

  if (!teamData) {
    return (
      <div className="p-6 text-muted-foreground text-sm">No engagement data available for this team.</div>
    );
  }

  const maxHours = Math.max(...teamData.users.map((u) => u.totalHours), 1);

  return (
    <div className="p-6 space-y-8">
      {/* Team metrics */}
      <section>
        <h2 className="text-lg font-semibold mb-1">{orgName ?? mockTeam?.name ?? "All Users"} — Team Metrics</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {isSupabaseConfigured ? "Data from BigQuery · Updated hourly" : "Sample data · Connect Supabase for live metrics"}
        </p>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard icon={Clock} label="Total Active Hours" value={teamData.totalHours.toFixed(1)} color="text-primary" delay={0} />
          <StatCard icon={Activity} label="Hours This Week" value={teamData.weekHours.toFixed(1)} color="text-info" delay={0.05} />
          <StatCard icon={MessageSquare} label="Total Chats" value={teamData.totalChats.toString()} color="text-accent" delay={0.1} />
        </div>

        {/* Team member breakdown */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-xs font-mono uppercase text-muted-foreground tracking-wider">Team Member Breakdown</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-mono uppercase">Member</th>
                <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-mono uppercase">Total Hours</th>
                <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-mono uppercase">This Week</th>
                <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-mono uppercase">Chats</th>
                <th className="px-4 py-2.5 w-32" />
              </tr>
            </thead>
            <tbody>
              {teamData.users.map((user, i) => {
                const isMe = user.name === currentUser.name || user.email === currentUser.email;
                return (
                  <motion.tr
                    key={user.userId ?? user.name}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.05 }}
                    className={`border-b border-border/50 last:border-0 ${isMe ? "bg-primary/5" : ""}`}
                  >
                    <td className="px-4 py-3 font-medium">
                      <span>{user.name}</span>
                      {isMe && (
                        <span className="ml-2 text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">You</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{user.totalHours}h</td>
                    <td className="px-4 py-3 text-right font-mono">{user.weekHours}h</td>
                    <td className="px-4 py-3 text-right font-mono">
                      <span className="flex items-center justify-end gap-1">
                        <MessageSquare className="w-3 h-3 text-muted-foreground" />
                        {user.totalChats}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isMe ? "bg-primary" : "bg-muted-foreground/40"}`}
                          style={{ width: `${(user.totalHours / maxHours) * 100}%` }}
                        />
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* My metrics */}
      <section>
        <h2 className="text-lg font-semibold mb-1">Your Usage</h2>
        <p className="text-sm text-muted-foreground mb-4">Your individual metrics across all sessions</p>

        {(() => {
          const myMetrics = teamData.users.find(
            (u) => u.name === currentUser.name || u.email === currentUser.email
          );
          if (!myMetrics) {
            return (
              <div className="bg-card border border-border rounded-lg p-6 text-sm text-muted-foreground">
                No personal usage data found for your account on this team.
              </div>
            );
          }
          return (
            <div className="grid grid-cols-3 gap-4">
              <StatCard icon={Clock} label="My Total Hours" value={`${myMetrics.totalHours}h`} color="text-success" delay={0.2} />
              <StatCard icon={TrendingUp} label="My Hours This Week" value={`${myMetrics.weekHours}h`} color="text-success" delay={0.25} />
              <StatCard icon={MessageSquare} label="My Total Chats" value={myMetrics.totalChats.toString()} color="text-success" delay={0.3} />
            </div>
          );
        })()}
      </section>
    </div>
  );
};

export default EngagementTab;
