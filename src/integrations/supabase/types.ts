export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      attempts: {
        Row: {
          created_at: string
          id: string
          minutes: number
          problem_id: number
          result: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          minutes: number
          problem_id: number
          result: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          minutes?: number
          problem_id?: number
          result?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempts_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "discussion_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_posts: {
        Row: {
          body: string
          created_at: string
          id: string
          problem_id: number
          upvote_count: number
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          problem_id: number
          upvote_count?: number
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          problem_id?: number
          upvote_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_posts_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_votes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "discussion_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          requester_id: string
          status: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          requester_id: string
          status?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          requester_id?: string
          status?: string
        }
        Relationships: []
      }
      problems: {
        Row: {
          created_at: string
          difficulty: string
          id: number
          slug: string
          title: string
          topics: string[]
          url: string
        }
        Insert: {
          created_at?: string
          difficulty: string
          id: number
          slug: string
          title: string
          topics?: string[]
          url: string
        }
        Update: {
          created_at?: string
          difficulty?: string
          id?: number
          slug?: string
          title?: string
          topics?: string[]
          url?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          last_solved_at: string | null
          preferences: Json
          streak_count: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          last_solved_at?: string | null
          preferences?: Json
          streak_count?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_solved_at?: string | null
          preferences?: Json
          streak_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_problem_status: {
        Row: {
          attempts_count: number
          ease_factor: number
          first_solved_at: string | null
          last_activity_at: string
          next_review_at: string | null
          notes: string | null
          problem_id: number
          review_interval_days: number
          status: string
          user_id: string
        }
        Insert: {
          attempts_count?: number
          ease_factor?: number
          first_solved_at?: string | null
          last_activity_at?: string
          next_review_at?: string | null
          notes?: string | null
          problem_id: number
          review_interval_days?: number
          status?: string
          user_id: string
        }
        Update: {
          attempts_count?: number
          ease_factor?: number
          first_solved_at?: string | null
          last_activity_at?: string
          next_review_at?: string | null
          notes?: string | null
          problem_id?: number
          review_interval_days?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_problem_status_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_leaderboard: {
        Args: { filter_user_ids?: string[]; limit_count?: number }
        Returns: {
          avatar_url: string
          display_name: string
          last_active_at: string
          total_solved: number
          user_id: string
        }[]
      }
      get_recommendations: {
        Args: { limit_count?: number }
        Returns: {
          difficulty: string
          problem_id: number
          reason_solve_rate: number
          reason_topic: string
          title: string
          topics: string[]
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
