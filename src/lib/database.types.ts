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
          extracted_text: string | null;
          text_extracted_at: string | null;
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
          extracted_text?: string | null;
          text_extracted_at?: string | null;
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
          extracted_text?: string | null;
          text_extracted_at?: string | null;
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
      help_bot_knowledge: {
        Row: {
          id: string;
          gdrive_file_id: string;
          file_name: string;
          extracted_text: string | null;
          last_fetched_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          gdrive_file_id: string;
          file_name: string;
          extracted_text?: string | null;
          last_fetched_at?: string;
          created_at?: string;
        };
        Update: {
          gdrive_file_id?: string;
          file_name?: string;
          extracted_text?: string | null;
          last_fetched_at?: string;
        };
      };
      team_poc_progress: {
        Row: {
          team_id: string;
          stage: number;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          team_id: string;
          stage?: number;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          team_id?: string;
          stage?: number;
          updated_by?: string | null;
          updated_at?: string;
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

export type HelpBotKnowledgeRow = Database["public"]["Tables"]["help_bot_knowledge"]["Row"];

export type PocProgressRow = Database["public"]["Tables"]["team_poc_progress"]["Row"];
export type PocProgressInsert = Database["public"]["Tables"]["team_poc_progress"]["Insert"];
export type PocProgressUpdate = Database["public"]["Tables"]["team_poc_progress"]["Update"];
