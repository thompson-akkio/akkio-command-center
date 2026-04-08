import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { MOCK_TEAMS } from "@/lib/mockData";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PocProgress {
  teamId: string;
  stage: number;
  updatedBy: string | null;
  updatedAt: string | null;
}

// ── In-memory mock store ──────────────────────────────────────────────────────

const mockStages: Record<string, number> = {};
function getMockStage(teamId: string): number {
  if (mockStages[teamId] === undefined) {
    const team = MOCK_TEAMS.find((t) => t.id === teamId);
    mockStages[teamId] = team?.stage ?? 0;
  }
  return mockStages[teamId];
}

// ── Query key factory ─────────────────────────────────────────────────────────

export const pocProgressKeys = {
  all: ["poc-progress"] as const,
  team: (teamId: string) => ["poc-progress", teamId] as const,
};

// ── Fetch progress for a team ─────────────────────────────────────────────────

export function usePocProgress(teamId: string) {
  return useQuery({
    queryKey: pocProgressKeys.team(teamId),
    queryFn: async (): Promise<PocProgress> => {
      if (!supabase) {
        return {
          teamId,
          stage: getMockStage(teamId),
          updatedBy: null,
          updatedAt: null,
        };
      }

      const { data, error } = await supabase
        .from("team_poc_progress")
        .select("*")
        .eq("team_id", teamId)
        .maybeSingle();

      if (error) throw error;

      // No row yet → team is at stage 0
      if (!data) {
        return { teamId, stage: 0, updatedBy: null, updatedAt: null };
      }

      return {
        teamId: data.team_id,
        stage: data.stage,
        updatedBy: data.updated_by,
        updatedAt: data.updated_at,
      };
    },
    placeholderData: (prev) => prev,
  });
}

// ── Update stage (admin only) ─────────────────────────────────────────────────

export interface UpdateStageInput {
  teamId: string;
  stage: number;
  updatedBy?: string;
}

export function useUpdatePocStage() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateStageInput): Promise<PocProgress> => {
      if (!supabase) {
        mockStages[input.teamId] = input.stage;
        return {
          teamId: input.teamId,
          stage: input.stage,
          updatedBy: input.updatedBy ?? null,
          updatedAt: new Date().toISOString(),
        };
      }

      // Upsert: insert if no row exists, update if it does
      const { data, error } = await supabase
        .from("team_poc_progress")
        .upsert(
          {
            team_id: input.teamId,
            stage: input.stage,
            updated_by: input.updatedBy ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "team_id" }
        )
        .select()
        .single();

      if (error) throw error;

      return {
        teamId: data.team_id,
        stage: data.stage,
        updatedBy: data.updated_by,
        updatedAt: data.updated_at,
      };
    },
    // Optimistic update for instant UI feedback
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: pocProgressKeys.team(input.teamId) });

      const previous = qc.getQueryData<PocProgress>(
        pocProgressKeys.team(input.teamId)
      );

      qc.setQueryData<PocProgress>(pocProgressKeys.team(input.teamId), {
        teamId: input.teamId,
        stage: input.stage,
        updatedBy: input.updatedBy ?? null,
        updatedAt: new Date().toISOString(),
      });

      return { previous };
    },
    onError: (_err, input, context) => {
      // Roll back on failure
      if (context?.previous) {
        qc.setQueryData(pocProgressKeys.team(input.teamId), context.previous);
      }
    },
    onSettled: (_data, _err, input) => {
      qc.invalidateQueries({ queryKey: pocProgressKeys.team(input.teamId) });
    },
  });
}
