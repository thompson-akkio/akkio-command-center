import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Map, BarChart3, ChevronDown, Check, LogOut, UserPlus } from "lucide-react";
import DocumentsTab from "@/components/CommandCenter/DocumentsTab";
import POCJourneyTab from "@/components/CommandCenter/POCJourneyTab";
import EngagementTab from "@/components/CommandCenter/EngagementTab";
import InviteUsersDialog from "@/components/CommandCenter/InviteUsersDialog";
import { MOCK_CURRENT_USER, MOCK_TEAMS } from "@/lib/mockData";
import { supabase } from "@/lib/supabase";
import { useOrgs } from "@/hooks/useEngagement";
import { useAuth } from "@/contexts/AuthContext";

type TabId = "documents" | "journey" | "engagement";

const tabs = [
  { id: "documents" as TabId, label: "Documents", icon: FileText },
  { id: "journey" as TabId, label: "POC Journey", icon: Map },
  { id: "engagement" as TabId, label: "Engagement", icon: BarChart3 },
];

const ALL_USERS_OPTION = { id: "all", name: "All Users" };

const Index = () => {
  const auth = useAuth();
  const isSupabaseConfigured = !!supabase;
  const { data: orgs } = useOrgs();

  // Build a currentUser object that works with both auth and mock modes
  const user = useMemo(() => {
    if (isSupabaseConfigured && auth.profile) {
      return {
        id: auth.profile.id,
        name: auth.profile.full_name || auth.profile.email,
        email: auth.profile.email,
        isAdmin: auth.isAdmin,
        teamIds: auth.teams.map((t) => t.team_id),
      };
    }
    return MOCK_CURRENT_USER;
  }, [isSupabaseConfigured, auth.profile, auth.isAdmin, auth.teams]);

  const mockTeams = MOCK_TEAMS.filter((t) => user.teamIds.includes(t.id));

  // Build dropdown options: when Supabase is configured, use real orgs; otherwise mock teams
  const dropdownOptions = useMemo(() => {
    if (isSupabaseConfigured) {
      // Admins see all orgs; members see only their teams
      if (auth.isAdmin) {
        const orgOptions = (orgs ?? []).map((o) => ({ id: o.id, name: o.name }));
        return [ALL_USERS_OPTION, ...orgOptions];
      }
      // Non-admin: show their team memberships
      return auth.teams.map((t) => ({ id: t.team_id, name: t.team_name }));
    }
    return mockTeams.map((t) => ({ id: t.id, name: t.name }));
  }, [isSupabaseConfigured, auth.isAdmin, auth.teams, orgs, mockTeams]);

  const [activeTab, setActiveTab] = useState<TabId>("documents");
  const [selectedOptionId, setSelectedOptionId] = useState(dropdownOptions[0]?.id ?? "all");
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  const selectedOption = dropdownOptions.find((o) => o.id === selectedOptionId) ?? dropdownOptions[0];

  // Derive orgName for engagement filtering (null = all users)
  const selectedOrgName = isSupabaseConfigured && selectedOption?.id !== "all"
    ? selectedOption?.name ?? null
    : null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="relative z-50 border-b border-border px-6 py-3 flex items-center justify-between shrink-0">
        {/* Left: Logo + Team selector */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-primary/20 flex items-center justify-center">
              <span className="font-mono text-primary text-sm font-bold">A</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-wide">COMMAND CENTER</h1>
              <p className="text-xs text-muted-foreground font-mono">Akkio POC Operations</p>
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-border" />

          {/* Team selector */}
          <div className="relative">
            <button
              onClick={() => setTeamDropdownOpen((v) => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary hover:bg-secondary/80 transition-colors text-sm font-medium"
            >
              <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
              <span>{selectedOption?.name ?? "Select Team"}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${
                  teamDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            <AnimatePresence>
              {teamDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 mt-1.5 w-52 bg-card border border-border rounded-lg shadow-xl z-[100] overflow-hidden"
                >
                  <div className="p-1">
                    {dropdownOptions.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => {
                          setSelectedOptionId(option.id);
                          setTeamDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                          option.id === selectedOptionId
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-secondary text-foreground"
                        }`}
                      >
                        <span>{option.name}</span>
                        {option.id === selectedOptionId && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right: invite + current user + sign out */}
        <div className="flex items-center gap-3">
          {user.isAdmin && isSupabaseConfigured && (
            <button
              onClick={() => setInviteDialogOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Invite Users
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">
                {user.name.split(" ").map((n) => n[0]).join("")}
              </span>
            </div>
            <span className="text-sm text-muted-foreground">{user.name}</span>
          </div>
          {isSupabaseConfigured && auth.session && (
            <button
              onClick={() => auth.signOut()}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Tab Bar */}
      <nav className="relative z-40 border-b border-border px-6 flex gap-1 shrink-0">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  transition={{ duration: 0.2 }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + selectedOptionId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {activeTab === "documents" && (
              <DocumentsTab teamId={selectedOptionId} teamName={selectedOption?.name ?? ""} currentUser={user} />
            )}
            {activeTab === "journey" && (
              <POCJourneyTab teamId={selectedOptionId} isAdmin={user.isAdmin} />
            )}
            {activeTab === "engagement" && (
              <EngagementTab teamId={selectedOptionId} orgName={selectedOrgName} currentUser={user} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Close dropdown on outside click */}
      {teamDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setTeamDropdownOpen(false)}
        />
      )}

      {/* Invite Users Dialog (admin only) */}
      {user.isAdmin && (
        <InviteUsersDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
          defaultTeamId={selectedOption?.id !== "all" ? selectedOption?.id : undefined}
          defaultTeamName={selectedOption?.id !== "all" ? selectedOption?.name : undefined}
        />
      )}
    </div>
  );
};

export default Index;
