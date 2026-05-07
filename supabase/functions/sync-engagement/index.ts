/**
 * Supabase Edge Function: sync-engagement
 *
 * Runs hourly via cron to ETL engagement data from BigQuery into Supabase.
 * Replaces the 5 Cloud Functions that previously pushed to HubSpot.
 *
 * Required secrets (set via `supabase secrets set`):
 *   - BQ_PROJECT_IDS: Comma-separated GCP project IDs to sync
 *                     (e.g., "akkio-demo-438920" or "akkio-demo-438920,akkio-poc-123,akkio-prod-456")
 *   - BQ_SERVICE_ACCOUNT_KEY: JSON service account key with BigQuery read access
 *                             (must have access to all listed projects)
 *
 * Schedule via supabase/config.toml:
 *   [functions.sync-engagement]
 *   schedule = "0 * * * *"  # every hour
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BQ_PROJECT_IDS = (Deno.env.get("BQ_PROJECT_IDS") || "akkio-demo-438920")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const BQ_SERVICE_ACCOUNT_KEY = Deno.env.get("BQ_SERVICE_ACCOUNT_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ---------- BigQuery Auth ----------

function base64url(input: string | ArrayBuffer): string {
  const str =
    typeof input === "string"
      ? btoa(input)
      : btoa(String.fromCharCode(...new Uint8Array(input)));
  return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getBigQueryAccessToken(): Promise<string> {
  const key = JSON.parse(BQ_SERVICE_ACCOUNT_KEY);

  // Create JWT for service account (must use base64url, not base64)
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const claim = base64url(
    JSON.stringify({
      iss: key.client_email,
      scope: "https://www.googleapis.com/auth/bigquery.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );

  // Sign JWT with RSA key
  const encoder = new TextEncoder();
  const keyData = key.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0)),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(`${header}.${claim}`)
  );

  const jwt = `${header}.${claim}.${base64url(signature)}`;

  // Exchange JWT for access token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    console.error("OAuth token exchange failed:", JSON.stringify(tokenData));
    throw new Error(`OAuth failed: ${tokenData.error_description || tokenData.error}`);
  }
  return tokenData.access_token;
}

async function queryBigQuery(
  accessToken: string,
  projectId: string,
  sql: string
): Promise<Record<string, unknown>[]> {
  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: sql,
      useLegacySql: false,
      location: "US",
    }),
  });

  const data = await res.json();

  // BigQuery returns errors in data.error (object) or data.errors (array)
  if (data.error) {
    console.error(`BigQuery API error for project ${projectId}:`, JSON.stringify(data.error));
    throw new Error(`BigQuery error: ${data.error.message || JSON.stringify(data.error)}`);
  }
  if (data.errors) {
    console.error(`BigQuery query errors:`, JSON.stringify(data.errors));
    throw new Error(JSON.stringify(data.errors));
  }

  console.log(`BigQuery returned ${data.totalRows || 0} rows for project ${projectId}`);

  if (!data.rows) return [];

  const fields = data.schema.fields.map((f: { name: string }) => f.name);
  return data.rows.map((row: { f: { v: unknown }[] }) => {
    const obj: Record<string, unknown> = {};
    row.f.forEach((cell, i) => {
      obj[fields[i]] = cell.v;
    });
    return obj;
  });
}

// ---------- Helpers ----------

/** Deduplicate rows by a key function, keeping the last occurrence */
function dedup<T>(rows: T[], keyFn: (r: T) => string): T[] {
  const map = new Map<string, T>();
  for (const row of rows) map.set(keyFn(row), row);
  return [...map.values()];
}

// ---------- Sync Functions ----------

async function getLastSyncTime(projectId: string, syncType: string): Promise<string> {
  const { data } = await supabase
    .from("sync_metadata")
    .select("last_synced_at")
    .eq("project_id", projectId)
    .eq("sync_type", syncType)
    .single();

  if (data?.last_synced_at) return data.last_synced_at;
  // Default to 90 days ago for initial sync to avoid CPU timeout
  const d = new Date();
  d.setDate(d.getDate() - 90);
  return d.toISOString();
}

async function updateSyncTime(projectId: string, syncType: string, rowCount: number) {
  await supabase
    .from("sync_metadata")
    .upsert({
      project_id: projectId,
      sync_type: syncType,
      last_synced_at: new Date().toISOString(),
      rows_synced: rowCount,
      updated_at: new Date().toISOString(),
    });
}

async function syncOrgs(accessToken: string, projectId: string) {
  console.log(`[orgs] Syncing for project ${projectId}`);

  // dim_org is the canonical org registry. We pull the full list every run
  // (it's small, ~one row per org) so newly created orgs appear immediately
  // in the Command Center dropdown — even before any non-Akkio users join.
  const rows = await queryBigQuery(
    accessToken,
    projectId,
    `SELECT DISTINCT org_name
     FROM \`${projectId}.lakehouse.dim_org\`
     WHERE org_name IS NOT NULL
    `
  );

  if (rows.length === 0) return 0;

  const mapped = dedup(
    rows
      .map((r) => ({
        project_id: projectId,
        org_name: String(r.org_name).trim(),
        updated_at: new Date().toISOString(),
      }))
      .filter((r) => r.org_name.length > 0),
    (r) => `${r.project_id}|${r.org_name}`
  );

  const { error } = await supabase.from("orgs").upsert(mapped, {
    onConflict: "project_id,org_name",
  });

  if (error) throw error;
  await updateSyncTime(projectId, "orgs", mapped.length);
  return mapped.length;
}

async function syncUsers(accessToken: string, projectId: string) {
  const lastSync = await getLastSyncTime(projectId, "users");
  console.log(`[users] Syncing since ${lastSync} for project ${projectId}`);

  const rows = await queryBigQuery(
    accessToken,
    projectId,
    `SELECT
       user_id,
       email,
       current_org_name,
       FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%SZ', created_at) AS created_at
     FROM \`${projectId}.lakehouse.dim_user\`
     WHERE email IS NOT NULL
       AND LOWER(email) NOT LIKE '%akkio%'
       AND created_at > TIMESTAMP('${lastSync}')
    `
  );

  if (rows.length === 0) return 0;

  const mapped = dedup(
    rows.map((r) => ({
      project_id: projectId,
      user_id: String(r.user_id),
      email: String(r.email),
      current_org_name: r.current_org_name ? String(r.current_org_name) : null,
      created_at: r.created_at,
      updated_at: new Date().toISOString(),
    })),
    (r) => `${r.project_id}|${r.user_id}`
  );
  const { error } = await supabase.from("users").upsert(mapped, {
    onConflict: "project_id,user_id",
  });

  if (error) throw error;
  await updateSyncTime(projectId, "users", rows.length);
  return rows.length;
}

async function syncActiveMinutes(accessToken: string, projectId: string) {
  const lastSync = await getLastSyncTime(projectId, "active_minutes");
  console.log(`[active_minutes] Syncing since ${lastSync} for project ${projectId}`);

  const rows = await queryBigQuery(
    accessToken,
    projectId,
    `SELECT
       user_id,
       page_title,
       CAST(activity_date AS STRING) AS activity_date,
       active_minutes_day AS active_minutes,
       updated_at
     FROM \`${projectId}.lakehouse.daily_active_user_page_minutes\`
     WHERE updated_at > TIMESTAMP('${lastSync}')
    `
  );

  if (rows.length === 0) return 0;

  // Deduplicate and upsert in batches of 500
  const mapped = dedup(
    rows.map((r) => ({
      project_id: projectId,
      user_id: String(r.user_id),
      page_title: String(r.page_title || "(unknown)"),
      activity_date: String(r.activity_date),
      active_minutes: Number(r.active_minutes),
      updated_at: new Date().toISOString(),
    })),
    (r) => `${r.project_id}|${r.user_id}|${r.page_title}|${r.activity_date}`
  );
  for (let i = 0; i < mapped.length; i += 500) {
    const batch = mapped.slice(i, i + 500);
    const { error } = await supabase.from("daily_active_minutes").upsert(batch, {
      onConflict: "project_id,user_id,page_title,activity_date",
    });
    if (error) throw error;
  }

  await updateSyncTime(projectId, "active_minutes", rows.length);
  return rows.length;
}

async function syncChats(accessToken: string, projectId: string) {
  const lastSync = await getLastSyncTime(projectId, "chats");
  console.log(`[chats] Syncing since ${lastSync} for project ${projectId}`);

  const rows = await queryBigQuery(
    accessToken,
    projectId,
    `SELECT
       fc.chat_id,
       fc.user_id,
       JSON_VALUE(cr.data, "$.messages") AS chat_title,
       FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%SZ', TIMESTAMP_SECONDS(
         SAFE_CAST(JSON_VALUE(cr.data, "$.created_at._seconds") AS INT64)
       )) AS chat_timestamp
     FROM \`${projectId}.lakehouse.fact_chat\` fc
     JOIN \`${projectId}.firestore_chatHistory.chatHistory_raw_latest\` cr
       ON cr.document_id = fc.chat_id
     WHERE TIMESTAMP_SECONDS(
       SAFE_CAST(JSON_VALUE(cr.data, "$.created_at._seconds") AS INT64)
     ) > TIMESTAMP('${lastSync}')
    `
  );

  if (rows.length === 0) return 0;

  const mapped = dedup(
    rows.map((r) => ({
      project_id: projectId,
      chat_id: String(r.chat_id),
      user_id: String(r.user_id),
      chat_title: r.chat_title ? String(r.chat_title).slice(0, 4000) : null,
      chat_timestamp: r.chat_timestamp,
      created_at: new Date().toISOString(),
    })),
    (r) => `${r.project_id}|${r.chat_id}`
  );
  const { error } = await supabase.from("user_chats").upsert(mapped, {
    onConflict: "project_id,chat_id",
  });

  if (error) throw error;
  await updateSyncTime(projectId, "chats", rows.length);
  return rows.length;
}

async function syncLoginEvents(accessToken: string, projectId: string) {
  const lastSync = await getLastSyncTime(projectId, "login_events");
  console.log(`[login_events] Syncing since ${lastSync} for project ${projectId}`);

  const rows = await queryBigQuery(
    accessToken,
    projectId,
    `SELECT
       user_id,
       event_name,
       FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%SZ', event_ts) AS event_timestamp
     FROM \`${projectId}.lakehouse.fact_event\`
     WHERE event_name IN ('login', 'logout')
       AND event_ts > TIMESTAMP('${lastSync}')
     ORDER BY event_ts ASC
     LIMIT 10000
    `
  );

  if (rows.length === 0) return 0;

  const mapped = rows.map((r) => ({
    project_id: projectId,
    user_id: String(r.user_id),
    event_name: String(r.event_name),
    event_timestamp: r.event_timestamp,
    created_at: new Date().toISOString(),
  }));

  // Insert in batches of 500 to avoid CPU timeout
  for (let i = 0; i < mapped.length; i += 500) {
    const batch = mapped.slice(i, i + 500);
    const { error } = await supabase.from("login_events").insert(batch);
    if (error) throw error;
  }
  // Use the last event's timestamp so subsequent runs continue from where we stopped
  const lastEventTs = mapped[mapped.length - 1].event_timestamp;
  await supabase.from("sync_metadata").upsert({
    project_id: projectId,
    sync_type: "login_events",
    last_synced_at: lastEventTs,
    rows_synced: mapped.length,
    updated_at: new Date().toISOString(),
  });
  return mapped.length;
}

// ---------- Entrypoint ----------

async function syncProject(accessToken: string, projectId: string) {
  return {
    projectId,
    orgs: await syncOrgs(accessToken, projectId),
    users: await syncUsers(accessToken, projectId),
    activeMinutes: await syncActiveMinutes(accessToken, projectId),
    chats: await syncChats(accessToken, projectId),
    loginEvents: await syncLoginEvents(accessToken, projectId),
  };
}

Deno.serve(async (req) => {
  try {
    const accessToken = await getBigQueryAccessToken();

    // Sync each BQ project sequentially to avoid overwhelming BigQuery
    const results = [];
    for (const projectId of BQ_PROJECT_IDS) {
      console.log(`Syncing project: ${projectId}`);
      results.push(await syncProject(accessToken, projectId));
    }

    const msg = `Sync complete: ${JSON.stringify(results)}`;
    console.log(msg);
    return new Response(msg, { status: 200 });
  } catch (err) {
    console.error("Sync failed:", err);
    return new Response(`Sync error: ${(err as Error).message}`, {
      status: 500,
    });
  }
});
