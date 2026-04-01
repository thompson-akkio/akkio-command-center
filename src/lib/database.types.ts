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
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          is_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          full_name?: string | null;
          is_admin?: boolean;
          updated_at?: string;
        };
      };
      team_members: {
        Row: {
          id: string;
          user_id: string;
          team_id: string;
          team_name: string;
          role: "admin" | "member";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          team_id: string;
          team_name: string;
          role?: "admin" | "member";
          created_at?: string;
        };
        Update: {
          user_id?: string;
          team_id?: string;
          team_name?: string;
          role?: "admin" | "member";
        };
      };
    };
  };
}

/** Convenience alias for a document row */
export type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];
export type DocumentInsert = Database["public"]["Tables"]["documents"]["Insert"];
export type DocumentUpdate = Database["public"]["Tables"]["documents"]["Update"];

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type TeamMemberRow = Database["public"]["Tables"]["team_members"]["Row"];
