/**
 * Supabase Edge Function: upload-document
 *
 * Receives a file upload from the Command Center frontend, uploads it to
 * Google Drive under "Command Center Uploads / <Team Name>", and updates
 * the documents table with the GDrive file ID.
 *
 * Required secrets (set via `supabase secrets set`):
 *   - GDRIVE_SERVICE_ACCOUNT_KEY: JSON service account key with Drive API access
 *   - GDRIVE_PARENT_FOLDER_ID:   The ID of the "Command Center Uploads" folder
 *                                 (share this folder with the service account email)
 *
 * Expected multipart/form-data fields:
 *   - file:        The document file
 *   - teamId:      Team identifier
 *   - teamName:    Human-readable team name (used as subfolder name)
 *   - documentId:  (optional) Existing document row ID to mark as uploaded
 *   - name:        Document name (used as filename in Drive)
 *   - description: (optional) Document description
 *   - category:    "standard" or "additional"
 *   - required:    "true" or "false"
 *   - uploadedBy:  Name of the person uploading
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GDRIVE_SERVICE_ACCOUNT_KEY = Deno.env.get("GDRIVE_SERVICE_ACCOUNT_KEY")!;
const GDRIVE_PARENT_FOLDER_ID = Deno.env.get("GDRIVE_PARENT_FOLDER_ID")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ── CORS headers ───────────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Google Drive Auth (service account JWT → access token) ─────────────────

function base64url(input: string | ArrayBuffer): string {
  const str =
    typeof input === "string"
      ? btoa(input)
      : btoa(String.fromCharCode(...new Uint8Array(input)));
  return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getGDriveAccessToken(): Promise<string> {
  const key = JSON.parse(GDRIVE_SERVICE_ACCOUNT_KEY);

  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const claim = base64url(
    JSON.stringify({
      iss: key.client_email,
      scope: "https://www.googleapis.com/auth/drive.file",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );

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

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error(
      `GDrive OAuth failed: ${tokenData.error_description || tokenData.error}`
    );
  }
  return tokenData.access_token;
}

// ── Google Drive Helpers ───────────────────────────────────────────────────

/** Find a subfolder by name inside a parent folder. Returns its ID or null. */
async function findFolder(
  accessToken: string,
  parentId: string,
  folderName: string
): Promise<string | null> {
  const q = encodeURIComponent(
    `'${parentId}' in parents and name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)&pageSize=1&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await res.json();
  return data.files?.[0]?.id ?? null;
}

/** Create a subfolder inside a parent folder. Returns the new folder's ID. */
async function createFolder(
  accessToken: string,
  parentId: string,
  folderName: string
): Promise<string> {
  const res = await fetch("https://www.googleapis.com/drive/v3/files?supportsAllDrives=true", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    }),
  });
  const data = await res.json();
  if (!data.id) {
    throw new Error(`Failed to create folder: ${JSON.stringify(data)}`);
  }
  return data.id;
}

/** Find or create a team subfolder under the root uploads folder. */
async function getTeamFolderId(
  accessToken: string,
  teamName: string
): Promise<string> {
  const existing = await findFolder(
    accessToken,
    GDRIVE_PARENT_FOLDER_ID,
    teamName
  );
  if (existing) return existing;

  console.log(`Creating GDrive folder for team: ${teamName}`);
  return createFolder(accessToken, GDRIVE_PARENT_FOLDER_ID, teamName);
}

/** Concatenate multiple Uint8Arrays into one */
function concat(...arrays: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const a of arrays) total += a.length;
  const result = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    result.set(a, offset);
    offset += a.length;
  }
  return result;
}

/** Upload a file to a specific Drive folder. Returns the file ID and webViewLink. */
async function uploadFileToDrive(
  accessToken: string,
  folderId: string,
  fileName: string,
  fileContent: ArrayBuffer,
  mimeType: string
): Promise<{ fileId: string; webViewLink: string }> {
  const encoder = new TextEncoder();
  const boundary = "----EdgeFunctionBoundary";

  const metadata = JSON.stringify({
    name: fileName,
    parents: [folderId],
  });

  // Build multipart body as raw bytes to avoid stack overflow on large files
  const body = concat(
    encoder.encode(
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${metadata}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${mimeType}\r\n\r\n`
    ),
    new Uint8Array(fileContent),
    encoder.encode(`\r\n--${boundary}--`),
  );

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink&supportsAllDrives=true",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  const data = await res.json();
  if (!data.id) {
    throw new Error(`Drive upload failed: ${JSON.stringify(data)}`);
  }
  return { fileId: data.id, webViewLink: data.webViewLink ?? "" };
}

// ── Entrypoint ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    // ── Verify caller is authenticated ──────────────────────────────
    // Create a per-request client with the caller's JWT to verify identity.
    // The global `supabase` (service-role) is still used for DB writes.
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authError } = await userClient.auth.getUser();

    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const teamId = formData.get("teamId") as string;
    const teamName = formData.get("teamName") as string;
    const documentId = formData.get("documentId") as string | null;
    const name = formData.get("name") as string;
    const description = (formData.get("description") as string) || null;
    const category = (formData.get("category") as string) || "standard";
    const required = formData.get("required") === "true";
    const uploadedBy = formData.get("uploadedBy") as string;

    if (!file || !teamId || !teamName || !name || !uploadedBy) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: file, teamId, teamName, name, uploadedBy",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Authenticate with Google Drive
    const accessToken = await getGDriveAccessToken();

    // 2. Find or create team folder
    const teamFolderId = await getTeamFolderId(accessToken, teamName);

    // 3. Upload file to Drive
    const fileContent = await file.arrayBuffer();
    const { fileId, webViewLink } = await uploadFileToDrive(
      accessToken,
      teamFolderId,
      name + getExtension(file.name),
      fileContent,
      file.type || "application/octet-stream"
    );

    console.log(`Uploaded to GDrive: fileId=${fileId}, team=${teamName}, doc=${name}`);

    // 4. Update or create the document row in Supabase
    let docRow;
    if (documentId) {
      // Existing checklist item — mark as uploaded
      const { data, error } = await supabase
        .from("documents")
        .update({
          uploaded: true,
          uploaded_by: uploadedBy,
          uploaded_at: new Date().toISOString(),
          gdrive_file_id: fileId,
        })
        .eq("id", documentId)
        .select()
        .single();

      if (error) throw error;
      docRow = data;
    } else {
      // "Other" / additional document — create new row
      const { data, error } = await supabase
        .from("documents")
        .insert({
          team_id: teamId,
          name,
          description,
          category,
          required,
          uploaded: true,
          uploaded_by: uploadedBy,
          uploaded_at: new Date().toISOString(),
          gdrive_file_id: fileId,
          sort_order: 0,
        })
        .select()
        .single();

      if (error) throw error;
      docRow = data;
    }

    return new Response(
      JSON.stringify({ success: true, document: docRow, gdriveFileId: fileId, webViewLink }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Upload failed:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

/** Extract file extension from a filename (e.g. ".pdf") */
function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot === -1) return "";
  return filename.slice(dot);
}
