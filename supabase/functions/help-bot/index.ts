/**
 * Supabase Edge Function: help-bot
 *
 * Receives a chat message from the Help Bot UI, gathers context from
 * Akkio platform knowledge docs and team-specific uploaded documents,
 * then calls the Claude Messages API and returns the response.
 *
 * Required secrets (set via `supabase secrets set`):
 *   - ANTHROPIC_API_KEY:           Anthropic API key for Claude
 *   - AKKIO_DOCS_FOLDER_ID:       GDrive folder ID containing Akkio platform knowledge docs
 *   - GDRIVE_SERVICE_ACCOUNT_KEY:  JSON service account key with Drive API access
 *
 * Expected JSON body:
 *   - message:             The user's message
 *   - teamId:              Team identifier
 *   - conversationHistory: Array of { role: "user"|"assistant", content: string }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Environment ───────────────────────────────────────────────────────────────
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GDRIVE_SERVICE_ACCOUNT_KEY = Deno.env.get("GDRIVE_SERVICE_ACCOUNT_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const AKKIO_DOCS_FOLDER_ID = Deno.env.get("AKKIO_DOCS_FOLDER_ID")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const MAX_TEXT_PER_DOC = 20_000; // chars per individual doc
const MAX_TOTAL_CONTEXT = 400_000; // chars total across all docs (~100k tokens, leaves room for conversation + response within 200k window)
const KNOWLEDGE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// ── CORS headers ──────────────────────────────────────────────────────────────
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

// ── Google Drive Auth (service account JWT → access token) ────────────────────

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
      scope: "https://www.googleapis.com/auth/drive.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );

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

  const encoder = new TextEncoder();
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

// ── Google Drive Helpers ──────────────────────────────────────────────────────

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

/** List all files in a Google Drive folder (non-trashed). */
async function listFolderFiles(
  accessToken: string,
  folderId: string
): Promise<DriveFile[]> {
  const q = encodeURIComponent(
    `'${folderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`
  );
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType)&pageSize=100&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await res.json();
  return data.files ?? [];
}

/** Get file metadata (mimeType) for a single file. */
async function getFileMetadata(
  accessToken: string,
  fileId: string
): Promise<DriveFile> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return await res.json();
}

/** Extract text content from a Google Drive file. */
async function extractTextFromFile(
  accessToken: string,
  fileId: string,
  mimeType: string
): Promise<string> {
  const headers = { Authorization: `Bearer ${accessToken}` };

  // Google Workspace native formats — use export API
  if (mimeType === "application/vnd.google-apps.document") {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`,
      { headers }
    );
    return await res.text();
  }
  if (mimeType === "application/vnd.google-apps.spreadsheet") {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/csv`,
      { headers }
    );
    return await res.text();
  }
  if (mimeType === "application/vnd.google-apps.presentation") {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`,
      { headers }
    );
    return await res.text();
  }

  // All other file types — download raw content
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`,
    { headers }
  );

  // For text-based formats, decode as UTF-8
  if (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/csv"
  ) {
    return await res.text();
  }

  // For binary formats (PDF, DOCX, XLSX), attempt to decode as text
  // and detect if the result is mostly non-printable characters
  const bytes = new Uint8Array(await res.arrayBuffer());
  const decoder = new TextDecoder("utf-8", { fatal: false });
  const text = decoder.decode(bytes);

  // Check if content looks like readable text (>80% printable chars)
  const printable = text.replace(/[^\x20-\x7E\n\r\t]/g, "");
  if (printable.length / text.length < 0.5) {
    return `[Binary file — text extraction not available for ${mimeType}]`;
  }

  return text;
}

/** Truncate text to MAX_TEXT_PER_DOC characters. */
function truncateText(text: string): string {
  if (text.length <= MAX_TEXT_PER_DOC) return text;
  return text.substring(0, MAX_TEXT_PER_DOC) + "\n[... truncated ...]";
}

/** Join parts but stop once total length exceeds budget. */
function joinWithBudget(parts: string[], budget: number): string {
  const out: string[] = [];
  let used = 0;
  let skipped = 0;
  for (const part of parts) {
    if (used + part.length > budget) {
      skipped = parts.length - out.length;
      break;
    }
    out.push(part);
    used += part.length + 2; // +2 for "\n\n" separator
  }
  let result = out.join("\n\n");
  if (skipped > 0) {
    result += `\n\n[${skipped} additional document(s) omitted to stay within context limits]`;
  }
  return result;
}

// ── Context Gathering ─────────────────────────────────────────────────────────

/** Fetch and cache Akkio platform knowledge docs from GDrive. */
async function getAkkioPlatformContext(accessToken: string): Promise<string> {
  const files = await listFolderFiles(accessToken, AKKIO_DOCS_FOLDER_ID);

  if (files.length === 0) {
    return "No Akkio platform knowledge documents found.";
  }

  // Load cached entries
  const { data: cached } = await supabase
    .from("help_bot_knowledge")
    .select("*");

  const cachedMap = new Map(
    (cached ?? []).map((r: Record<string, unknown>) => [r.gdrive_file_id, r])
  );
  const now = Date.now();
  const contextParts: string[] = [];

  for (const file of files) {
    const existing = cachedMap.get(file.id) as Record<string, unknown> | undefined;
    const isStale =
      !existing ||
      now - new Date(existing.last_fetched_at as string).getTime() >
        KNOWLEDGE_CACHE_TTL_MS;

    if (existing?.extracted_text && !isStale) {
      contextParts.push(
        `--- ${existing.file_name} ---\n${existing.extracted_text}`
      );
    } else {
      try {
        let text = await extractTextFromFile(accessToken, file.id, file.mimeType);
        text = truncateText(text);

        await supabase.from("help_bot_knowledge").upsert(
          {
            gdrive_file_id: file.id,
            file_name: file.name,
            extracted_text: text,
            last_fetched_at: new Date().toISOString(),
          },
          { onConflict: "gdrive_file_id" }
        );

        contextParts.push(`--- ${file.name} ---\n${text}`);
      } catch (err) {
        console.error(`Failed to fetch knowledge doc ${file.name}:`, err);
        // Fall back to stale cache if available
        if (existing?.extracted_text) {
          contextParts.push(
            `--- ${existing.file_name} ---\n${existing.extracted_text}`
          );
        }
      }
    }
  }

  return joinWithBudget(contextParts, Math.floor(MAX_TOTAL_CONTEXT * 0.75));
}

/** Fetch and cache team-specific document text. */
async function getTeamDocumentContext(
  teamId: string,
  accessToken: string
): Promise<string> {
  const { data: docs } = await supabase
    .from("documents")
    .select("id, name, gdrive_file_id, extracted_text, text_extracted_at")
    .eq("team_id", teamId)
    .eq("uploaded", true)
    .not("gdrive_file_id", "is", null);

  if (!docs || docs.length === 0) {
    return "No documents have been uploaded for this team yet.";
  }

  const contextParts: string[] = [];

  for (const doc of docs) {
    let text = doc.extracted_text as string | null;

    if (!text) {
      try {
        const fileInfo = await getFileMetadata(
          accessToken,
          doc.gdrive_file_id!
        );
        text = await extractTextFromFile(
          accessToken,
          doc.gdrive_file_id!,
          fileInfo.mimeType
        );
        text = truncateText(text);

        // Cache extracted text
        await supabase
          .from("documents")
          .update({
            extracted_text: text,
            text_extracted_at: new Date().toISOString(),
          })
          .eq("id", doc.id);
      } catch (err) {
        console.error(`Failed to extract text from ${doc.name}:`, err);
        text = `[Could not extract text from ${doc.name}]`;
      }
    }

    contextParts.push(`--- Document: ${doc.name} ---\n${text}`);
  }

  return joinWithBudget(contextParts, Math.floor(MAX_TOTAL_CONTEXT * 0.25));
}

// ── Claude API ────────────────────────────────────────────────────────────────

function buildSystemPrompt(
  akkioContext: string,
  teamDocContext: string,
  teamId: string
): string {
  return `You are the Akkio POC Help Bot, an AI assistant for clients going through a Proof of Concept (POC) with Akkio.

Your role:
- Answer questions about the POC process, required documents, timelines, and next steps
- Help users understand what documents they need to upload and why
- Explain Akkio's platform features and capabilities
- Provide guidance based on the team's uploaded documents

## Akkio Platform Knowledge
${akkioContext}

## Team Documents (Team: ${teamId})
${teamDocContext}

## Guidelines
- Be helpful, concise, and professional
- If you don't know something, say so rather than guessing
- Reference specific documents when relevant
- If the user asks about something not covered in the provided context, explain that your knowledge is limited to the POC process and Akkio platform
- Format responses with markdown when it helps readability (bullet points, headers, bold for emphasis)`;
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

async function callClaude(
  systemPrompt: string,
  conversationHistory: ConversationMessage[],
  userMessage: string
): Promise<string> {
  const messages = [
    ...conversationHistory,
    { role: "user" as const, content: userMessage },
  ];

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Claude API error (${response.status}): ${errBody}`);
  }

  const data = await response.json();
  const textBlock = data.content?.find(
    (b: { type: string }) => b.type === "text"
  );
  return textBlock?.text ?? "I'm sorry, I couldn't generate a response.";
}

// ── Entrypoint ────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    // ── Verify caller is authenticated ──────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization header" }, 401);
    }

    const userClient = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const {
      data: { user: caller },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !caller) {
      return jsonResponse(
        { error: authError?.message ?? "Invalid or expired token" },
        401
      );
    }

    // ── Parse body ──────────────────────────────────────────────────
    const body = await req.json();
    const {
      message,
      teamId,
      conversationHistory = [],
    } = body as {
      message: string;
      teamId: string;
      conversationHistory?: ConversationMessage[];
    };

    if (!message || !teamId) {
      return jsonResponse({ error: "message and teamId are required" }, 400);
    }

    // ── Gather context ──────────────────────────────────────────────
    const accessToken = await getGDriveAccessToken();

    const [akkioContext, teamDocContext] = await Promise.all([
      getAkkioPlatformContext(accessToken),
      getTeamDocumentContext(teamId, accessToken),
    ]);

    // ── Call Claude ─────────────────────────────────────────────────
    const systemPrompt = buildSystemPrompt(akkioContext, teamDocContext, teamId);
    const response = await callClaude(systemPrompt, conversationHistory, message);

    return jsonResponse({ response });
  } catch (err) {
    console.error("help-bot error:", err);
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
