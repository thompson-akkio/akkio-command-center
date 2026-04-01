/**
 * Supabase Edge Function: invite-user
 *
 * Admin-only endpoint that invites a user by email and optionally assigns
 * them to one or more teams. Uses Supabase Auth Admin API to send an
 * invite email — the recipient clicks the link and sets their password.
 *
 * Required: SUPABASE_SERVICE_ROLE_KEY (auto-available in Edge Functions)
 *
 * POST body (JSON):
 *   - email:     string (required)
 *   - full_name: string (optional)
 *   - is_admin:  boolean (optional, default false)
 *   - teams:     Array<{ team_id: string, team_name: string, role?: "admin" | "member" }> (optional)
 *
 * The caller must be an authenticated admin (is_admin = true in profiles).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    // ── Verify caller is an authenticated admin ───────────────────────
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization header" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } =
      await supabaseAdmin.auth.getUser(token);

    if (authError || !caller) {
      return jsonResponse({ error: "Invalid or expired token" }, 401);
    }

    // Check admin status
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("is_admin")
      .eq("id", caller.id)
      .single();

    if (!callerProfile?.is_admin) {
      return jsonResponse({ error: "Admin access required" }, 403);
    }

    // ── Parse request body ────────────────────────────────────────────
    const body = await req.json();
    const { email, full_name, is_admin = false, teams = [] } = body as {
      email: string;
      full_name?: string;
      is_admin?: boolean;
      teams?: Array<{ team_id: string; team_name: string; role?: string }>;
    };

    if (!email) {
      return jsonResponse({ error: "email is required" }, 400);
    }

    // ── Invite the user via Supabase Auth Admin API ───────────────────
    // APP_URL can be set as a secret; falls back to the Supabase Site URL config
    const appUrl = Deno.env.get("APP_URL") || SUPABASE_URL;

    const { data: inviteData, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: full_name ?? "" },
        redirectTo: appUrl,
      });

    if (inviteError) {
      // If the user already exists, we can still assign teams
      if (!inviteError.message.includes("already been registered")) {
        return jsonResponse({ error: inviteError.message }, 400);
      }
    }

    const userId = inviteData?.user?.id;

    // ── Set admin flag if requested ───────────────────────────────────
    if (userId && is_admin) {
      await supabaseAdmin
        .from("profiles")
        .update({ is_admin: true })
        .eq("id", userId);
    }

    // ── Assign team memberships ───────────────────────────────────────
    if (userId && teams.length > 0) {
      const rows = teams.map((t) => ({
        user_id: userId,
        team_id: t.team_id,
        team_name: t.team_name,
        role: t.role ?? "member",
      }));

      const { error: teamError } = await supabaseAdmin
        .from("team_members")
        .upsert(rows, { onConflict: "user_id,team_id" });

      if (teamError) {
        console.error("Failed to assign teams:", teamError);
        return jsonResponse({
          warning: "User invited but team assignment failed",
          detail: teamError.message,
          userId,
        });
      }
    }

    return jsonResponse({
      success: true,
      userId,
      email,
      teams: teams.map((t) => t.team_id),
    });
  } catch (err) {
    console.error("invite-user error:", err);
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
