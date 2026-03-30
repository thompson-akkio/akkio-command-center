/** Minimal hand-written types for the tables we use.
 *  Replace with `supabase gen types typescript` output once the project is live. */

export interface Database {
  public: {
    Tables: {
      documents: {
        Row: {
          id: string;
          team_id: string;
          name: string;
          description: string | null;
          required: boolean;
          uploaded: boolean;
          uploaded_by: string | null;
          uploaded_at: string | null;
          category: "standard" | "additional";
          gdrive_file_id: string | null;
          created_at: string;
          created_by: string | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          team_id: string;
          name: string;
          description?: string | null;
          required?: boolean;
          uploaded?: boolean;
          uploaded_by?: string | null;
          uploaded_at?: string | null;
          category?: "standard" | "additional";
          gdrive_file_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          sort_order?: number;
        };
        Update: {
          id?: string;
          team_id?: string;
          name?: string;
          description?: string | null;
          required?: boolean;
          uploaded?: boolean;
          uploaded_by?: string | null;
          uploaded_at?: string | null;
          category?: "standard" | "additional";
          gdrive_file_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          sort_order?: number;
        };
      };
    };
  };
}

/** Convenience alias for a document row */
export type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];
export type DocumentInsert = Database["public"]["Tables"]["documents"]["Insert"];
export type DocumentUpdate = Database["public"]["Tables"]["documents"]["Update"];
