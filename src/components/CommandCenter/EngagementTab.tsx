import { motion } from "framer-motion";
import { Clock, MessageSquare, TrendingUp, Users, Activity } from "lucide-react";
import { MOCK_ENGAGEMENT, MOCK_TEAMS, MOCK_CURRENT_USER } from "@/lib/mockData";

interface Props {
  teamId: string;
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

const EngagementTab = ({ teamId, currentUser }: Props) => {
  const teamData = MOCK_ENGAGEMENT[teamId];
  const team = MOCK_TEAMS.find((t) => t.id === teamId);
  const myMetrics = teamData?.users.find((u) => u.name === currentUser.name);

  if (!teamData || !team) {
    return (
      <div className="p-6 text-muted-foreground text-sm">No engagement data available for this team.</div>
    );
  }

  const maxHours = Math.max(...teamData.users.map((u) => u.totalHours));

  return (
    <div className="p-6 space-y-8">
      {/* Team metrics */}
      <section>
        <h2 className="text-lg font-semibold mb-1">{team.name} — Team Metrics</h2>
        <p className="text-sm text-muted-foreground mb-4">Data from BigQuery · Updated hourly</p>

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
                const isMe = user.name === currentUser.name;
                return (
                  <motion.tr
                    key={user.name}
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

        {myMetrics ? (
          <div className="grid grid-cols-3 gap-4">
            <StatCard icon={Clock} label="My Total Hours" value={`${myMetrics.totalHours}h`} color="text-success" delay={0.2} />
            <StatCard icon={TrendingUp} label="My Hours This Week" value={`${myMetrics.weekHours}h`} color="text-success" delay={0.25} />
            <StatCard icon={MessageSquare} label="My Total Chats" value={myMetrics.totalChats.toString()} color="text-success" delay={0.3} />
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg p-6 text-sm text-muted-foreground">
            No personal usage data found for your account on this team.
          </div>
        )}
      </section>
    </div>
  );
};

export default EngagementTab;
