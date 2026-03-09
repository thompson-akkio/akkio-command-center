import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { MOCK_ENGAGEMENT, type MockTeamEngagement } from "@/lib/mockData";

/** GCP project ID — determines which BigQuery environment's data to show.
 *  Defaults to the POC project. Override via VITE_BQ_PROJECT_ID env var. */
const BQ_PROJECT_ID = import.meta.env.VITE_BQ_PROJECT_ID || "akkio-demo-438920";

export interface UserEngagement {
  user_id: string;
  email: string | null;
  total_hours: number;
  week_hours: number;
  total_chats: number;
}

export interface TeamEngagement {
  totalHours: number;
  weekHours: number;
  totalChats: number;
  users: {
    name: string;
    email: string | null;
    userId: string;
    totalHours: number;
    weekHours: number;
    totalChats: number;
  }[];
}

export interface OrgOption {
  id: string; // slug used as team id
  name: string; // display name
}

// ---------- Orgs ----------

async function fetchOrgs(): Promise<OrgOption[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("users")
    .select("current_org_name")
    .eq("project_id", BQ_PROJECT_ID)
    .not("current_org_name", "is", null);

  if (error) throw error;
  if (!data) return [];

  // Deduplicate org names client-side
  const nameSet = new Set<string>();
  for (const row of data) {
    const name = row.current_org_name as string | null;
    if (typeof name === "string" && name.trim()) nameSet.add(name.trim());
  }

  return Array.from(nameSet)
    .sort()
    .map((name) => ({
      id: `org-${name.toLowerCase().replace(/\s+/g, "-")}`,
      name,
    }));
}

export function useOrgs() {
  return useQuery({
    queryKey: ["orgs", BQ_PROJECT_ID],
    queryFn: fetchOrgs,
    enabled: !!supabase,
    staleTime: 10 * 60 * 1000,
  });
}

// ---------- Engagement ----------

async function fetchTeamEngagement(
  orgName: string | null
): Promise<TeamEngagement | null> {
  if (!supabase) return null;

  // Fetch engagement data, optionally filtered by org name
  let query = supabase
    .from("team_engagement_summary")
    .select("user_id, email, total_hours, week_hours, total_chats")
    .eq("project_id", BQ_PROJECT_ID);

  if (orgName) {
    query = query.eq("current_org_name", orgName);
  }

  const { data, error } = await query;

  if (error) throw error;
  if (!data || data.length === 0) return null;

  const users = (data as UserEngagement[]).map((u) => ({
    name: u.email?.split("@")[0] ?? u.user_id,
    email: u.email,
    userId: u.user_id,
    totalHours: Number(u.total_hours) || 0,
    weekHours: Number(u.week_hours) || 0,
    totalChats: Number(u.total_chats) || 0,
  }));

  return {
    totalHours: users.reduce((sum, u) => sum + u.totalHours, 0),
    weekHours: users.reduce((sum, u) => sum + u.weekHours, 0),
    totalChats: users.reduce((sum, u) => sum + u.totalChats, 0),
    users,
  };
}

export function useTeamEngagement(teamId: string, orgName: string | null) {
  return useQuery({
    queryKey: ["engagement", teamId, orgName],
    queryFn: () => fetchTeamEngagement(orgName),
    enabled: !!supabase,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60 * 60 * 1000,
    placeholderData: () => {
      const mock = MOCK_ENGAGEMENT[teamId];
      if (!mock) return null;
      return {
        totalHours: mock.totalHours,
        weekHours: mock.weekHours,
        totalChats: mock.totalChats,
        users: mock.users.map((u) => ({
          name: u.name,
          email: null,
          userId: u.name.toLowerCase().replace(/\s+/g, "-"),
          totalHours: u.totalHours,
          weekHours: u.weekHours,
          totalChats: u.totalChats,
        })),
      };
    },
  });
}

/**
 * Returns mock data when Supabase is not configured.
 * Used as a fallback so the UI always has something to display.
 */
export function useMockFallback(teamId: string): MockTeamEngagement | null {
  if (supabase) return null;
  return MOCK_ENGAGEMENT[teamId] ?? null;
}
