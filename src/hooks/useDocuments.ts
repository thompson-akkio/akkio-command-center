import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { MOCK_DOCUMENTS, type MockDocument } from "@/lib/mockData";
import type { DocumentRow } from "@/lib/database.types";

// ── Shared types ───────────────────────────────────────────────────────────
export interface Document {
  id: string;
  teamId: string;
  name: string;
  description: string | null;
  required: boolean;
  uploaded: boolean;
  uploadedBy: string | null;
  uploadedAt: string | null;
  category: "standard" | "additional";
  gdriveFileId: string | null;
  sortOrder: number;
}

/** Map a Supabase row to our front-end Document shape */
function fromRow(row: DocumentRow): Document {
  return {
    id: row.id,
    teamId: row.team_id,
    name: row.name,
    description: row.description,
    required: row.required,
    uploaded: row.uploaded,
    uploadedBy: row.uploaded_by,
    uploadedAt: row.uploaded_at,
    category: row.category as "standard" | "additional",
    gdriveFileId: row.gdrive_file_id,
    sortOrder: row.sort_order,
  };
}

/** Map a MockDocument to our front-end Document shape (fallback) */
function fromMock(doc: MockDocument, teamId: string, index: number): Document {
  return {
    id: doc.id,
    teamId,
    name: doc.name,
    description: doc.description ?? null,
    required: doc.required,
    uploaded: doc.uploaded,
    uploadedBy: doc.uploadedBy ?? null,
    uploadedAt: doc.date ?? null,
    category: doc.category,
    gdriveFileId: null,
    sortOrder: index,
  };
}

// ── In-memory mock store (survives across hook re-renders, lost on refresh) ─
// This gives us the same edit/add/delete behavior in dev without Supabase.
const mockStore: Record<string, Document[]> = {};
function getMockDocs(teamId: string): Document[] {
  if (!mockStore[teamId]) {
    const mocks = MOCK_DOCUMENTS[teamId] ?? [];
    mockStore[teamId] = mocks.map((d, i) => fromMock(d, teamId, i));
  }
  return mockStore[teamId];
}
let mockIdCounter = 1000;

// ── Query key factory ──────────────────────────────────────────────────────
export const documentKeys = {
  all: ["documents"] as const,
  team: (teamId: string) => ["documents", teamId] as const,
};

// ── Fetch documents for a team ─────────────────────────────────────────────
export function useDocuments(teamId: string) {
  return useQuery({
    queryKey: documentKeys.team(teamId),
    queryFn: async (): Promise<Document[]> => {
      if (!supabase) {
        // Fallback: use mock data
        return getMockDocs(teamId);
      }
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("team_id", teamId)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return (data ?? []).map(fromRow);
    },
    // Keep previous data visible while switching teams
    placeholderData: (prev) => prev,
  });
}

// ── Add a document item (admin) ────────────────────────────────────────────
export interface AddDocumentInput {
  teamId: string;
  name: string;
  required: boolean;
  category?: "standard" | "additional";
  description?: string;
  /** If this is an upload of an "additional" doc, include uploader info */
  uploadedBy?: string;
}

export function useAddDocument() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddDocumentInput): Promise<Document> => {
      const isUpload = !!input.uploadedBy;

      if (!supabase) {
        // Mock fallback
        const docs = getMockDocs(input.teamId);
        const newDoc: Document = {
          id: `mock-${++mockIdCounter}`,
          teamId: input.teamId,
          name: input.name,
          description: input.description ?? null,
          required: input.required,
          uploaded: isUpload,
          uploadedBy: input.uploadedBy ?? null,
          uploadedAt: isUpload ? new Date().toISOString().slice(0, 10) : null,
          category: input.category ?? "standard",
          gdriveFileId: null,
          sortOrder: docs.length,
        };
        docs.push(newDoc);
        return newDoc;
      }

      const { data, error } = await supabase
        .from("documents")
        .insert({
          team_id: input.teamId,
          name: input.name,
          required: input.required,
          category: input.category ?? "standard",
          description: input.description ?? null,
          uploaded: isUpload,
          uploaded_by: input.uploadedBy ?? null,
          uploaded_at: isUpload ? new Date().toISOString() : null,
          sort_order: 0, // server can re-calc
        })
        .select()
        .single();

      if (error) throw error;
      return fromRow(data);
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: documentKeys.team(input.teamId) });
    },
  });
}

// ── Update a document item (admin edit or mark uploaded) ───────────────────
export interface UpdateDocumentInput {
  id: string;
  teamId: string;
  name?: string;
  required?: boolean;
  uploaded?: boolean;
  uploadedBy?: string;
}

export function useUpdateDocument() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateDocumentInput): Promise<Document> => {
      if (!supabase) {
        const docs = getMockDocs(input.teamId);
        const idx = docs.findIndex((d) => d.id === input.id);
        if (idx === -1) throw new Error("Document not found");
        const doc = docs[idx];
        const updated: Document = {
          ...doc,
          name: input.name ?? doc.name,
          required: input.required ?? doc.required,
          uploaded: input.uploaded ?? doc.uploaded,
          uploadedBy: input.uploadedBy ?? doc.uploadedBy,
          uploadedAt: input.uploaded
            ? new Date().toISOString().slice(0, 10)
            : doc.uploadedAt,
        };
        docs[idx] = updated;
        return updated;
      }

      const updates: Record<string, unknown> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.required !== undefined) updates.required = input.required;
      if (input.uploaded !== undefined) {
        updates.uploaded = input.uploaded;
        if (input.uploaded) {
          updates.uploaded_by = input.uploadedBy ?? null;
          updates.uploaded_at = new Date().toISOString();
        }
      }

      const { data, error } = await supabase
        .from("documents")
        .update(updates)
        .eq("id", input.id)
        .select()
        .single();

      if (error) throw error;
      return fromRow(data);
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: documentKeys.team(input.teamId) });
    },
  });
}

// ── Upload a document (calls Edge Function → GDrive + DB update) ───────────
export interface UploadDocumentInput {
  file: File;
  teamId: string;
  teamName: string;
  /** If uploading against an existing checklist item, pass its ID */
  documentId?: string;
  name: string;
  description?: string;
  category: "standard" | "additional";
  required: boolean;
  uploadedBy: string;
}

export function useUploadDocument() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: UploadDocumentInput): Promise<Document> => {
      if (!supabase) {
        // Mock fallback — simulate the upload locally
        const docs = getMockDocs(input.teamId);
        if (input.documentId) {
          const idx = docs.findIndex((d) => d.id === input.documentId);
          if (idx !== -1) {
            docs[idx] = {
              ...docs[idx],
              uploaded: true,
              uploadedBy: input.uploadedBy,
              uploadedAt: new Date().toISOString().slice(0, 10),
              gdriveFileId: `mock-gdrive-${++mockIdCounter}`,
            };
            return docs[idx];
          }
        }
        const newDoc: Document = {
          id: `mock-${++mockIdCounter}`,
          teamId: input.teamId,
          name: input.name,
          description: input.description ?? null,
          required: input.required,
          uploaded: true,
          uploadedBy: input.uploadedBy,
          uploadedAt: new Date().toISOString().slice(0, 10),
          category: input.category,
          gdriveFileId: `mock-gdrive-${mockIdCounter}`,
          sortOrder: docs.length,
        };
        docs.push(newDoc);
        return newDoc;
      }

      // Build multipart form data for the Edge Function
      const formData = new FormData();
      formData.append("file", input.file);
      formData.append("teamId", input.teamId);
      formData.append("teamName", input.teamName);
      formData.append("name", input.name);
      formData.append("category", input.category);
      formData.append("required", String(input.required));
      formData.append("uploadedBy", input.uploadedBy);
      if (input.documentId) formData.append("documentId", input.documentId);
      if (input.description) formData.append("description", input.description);

      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-document`,
        {
          method: "POST",
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${session?.access_token ?? anonKey}`,
          },
          body: formData,
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || "Upload failed");
      }

      const result = await res.json();
      return fromRow(result.document);
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: documentKeys.team(input.teamId) });
    },
  });
}

// ── Delete a document item (admin) ─────────────────────────────────────────
export interface DeleteDocumentInput {
  id: string;
  teamId: string;
}

export function useDeleteDocument() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: DeleteDocumentInput): Promise<void> => {
      if (!supabase) {
        const docs = getMockDocs(input.teamId);
        const idx = docs.findIndex((d) => d.id === input.id);
        if (idx !== -1) docs.splice(idx, 1);
        return;
      }

      const { error } = await supabase
        .from("documents")
        .delete()
        .eq("id", input.id);

      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: documentKeys.team(input.teamId) });
    },
  });
}
