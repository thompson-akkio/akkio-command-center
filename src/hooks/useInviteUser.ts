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

      const results: InviteResult[] = [];

      // Invite sequentially to avoid rate limits
      for (const input of inputs) {
        try {
          const { data, error } = await supabase.functions.invoke("invite-user", {
            body: input,
          });

          if (error) {
            results.push({ email: input.email, error: error.message || "Invite failed" });
          } else {
            const result = typeof data === "string" ? JSON.parse(data) : data;
            results.push({ email: input.email, success: result.success, warning: result.warning });
          }
        } catch (err) {
          results.push({ email: input.email, error: (err as Error).message });
        }
      }

      return results;
    },
  });
}
