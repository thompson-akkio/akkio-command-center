import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface InviteInput {
  email: string;
  full_name?: string;
  is_admin?: boolean;
  teams: Array<{ team_id: string; team_name: string; role?: string }>;
}

export interface InviteResult {
  success?: boolean;
  warning?: string;
  error?: string;
  email: string;
}

export function useInviteUsers() {
  return useMutation({
    mutationFn: async (inputs: InviteInput[]): Promise<InviteResult[]> => {
      if (!supabase) throw new Error("Supabase not configured");

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const results: InviteResult[] = [];

      // Invite sequentially to avoid rate limits
      for (const input of inputs) {
        try {
          const res = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify(input),
            }
          );

          const data = await res.json();
          if (!res.ok) {
            results.push({ email: input.email, error: data.error || "Invite failed" });
          } else {
            results.push({ email: input.email, success: true, warning: data.warning });
          }
        } catch (err) {
          results.push({ email: input.email, error: (err as Error).message });
        }
      }

      return results;
    },
  });
}
