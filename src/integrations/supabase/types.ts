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
      automation_runs: {
        Row: {
          error: string | null
          finished_at: string | null
          id: string
          items_in: number
          items_out: number
          job: string
          log: Json
          source_id: string | null
          started_at: string
          status: string
        }
        Insert: {
          error?: string | null
          finished_at?: string | null
          id?: string
          items_in?: number
          items_out?: number
          job: string
          log?: Json
          source_id?: string | null
          started_at?: string
          status?: string
        }
        Update: {
          error?: string | null
          finished_at?: string | null
          id?: string
          items_in?: number
          items_out?: number
          job?: string
          log?: Json
          source_id?: string | null
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_runs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      content_items: {
        Row: {
          address: string | null
          author_id: string | null
          body: string | null
          created_at: string
          ends_at: string | null
          hero_image_url: string | null
          id: string
          is_featured: boolean
          neighborhood: string | null
          price: string | null
          published_at: string | null
          raw_import_id: string | null
          slug: string
          source_name: string | null
          source_url: string | null
          starts_at: string | null
          status: Database["public"]["Enums"]["content_status"]
          subtitle: string | null
          summary: string | null
          tags: string[]
          title: string
          type: Database["public"]["Enums"]["content_type"]
          updated_at: string
          venue: string | null
          view_count: number
        }
        Insert: {
          address?: string | null
          author_id?: string | null
          body?: string | null
          created_at?: string
          ends_at?: string | null
          hero_image_url?: string | null
          id?: string
          is_featured?: boolean
          neighborhood?: string | null
          price?: string | null
          published_at?: string | null
          raw_import_id?: string | null
          slug: string
          source_name?: string | null
          source_url?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          subtitle?: string | null
          summary?: string | null
          tags?: string[]
          title: string
          type: Database["public"]["Enums"]["content_type"]
          updated_at?: string
          venue?: string | null
          view_count?: number
        }
        Update: {
          address?: string | null
          author_id?: string | null
          body?: string | null
          created_at?: string
          ends_at?: string | null
          hero_image_url?: string | null
          id?: string
          is_featured?: boolean
          neighborhood?: string | null
          price?: string | null
          published_at?: string | null
          raw_import_id?: string | null
          slug?: string
          source_name?: string | null
          source_url?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          subtitle?: string | null
          summary?: string | null
          tags?: string[]
          title?: string
          type?: Database["public"]["Enums"]["content_type"]
          updated_at?: string
          venue?: string | null
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_items_raw_import_id_fkey"
            columns: ["raw_import_id"]
            isOneToOne: false
            referencedRelation: "raw_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_events: {
        Row: {
          content_id: string | null
          created_at: string
          event: string
          id: number
          meta: Json
        }
        Insert: {
          content_id?: string | null
          created_at?: string
          event: string
          id?: number
          meta?: Json
        }
        Update: {
          content_id?: string | null
          created_at?: string
          event?: string
          id?: number
          meta?: Json
        }
        Relationships: [
          {
            foreignKeyName: "engagement_events_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_digests: {
        Row: {
          content_ids: string[]
          created_at: string
          html: string | null
          id: string
          kind: string
          preheader: string | null
          recipient_count: number
          scheduled_for: string | null
          sent_at: string | null
          status: string
          subject: string
        }
        Insert: {
          content_ids?: string[]
          created_at?: string
          html?: string | null
          id?: string
          kind?: string
          preheader?: string | null
          recipient_count?: number
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          subject: string
        }
        Update: {
          content_ids?: string[]
          created_at?: string
          html?: string | null
          id?: string
          kind?: string
          preheader?: string | null
          recipient_count?: number
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      raw_imports: {
        Row: {
          external_id: string | null
          fetched_at: string
          id: string
          payload: Json
          processed: boolean
          source_id: string | null
          url: string | null
        }
        Insert: {
          external_id?: string | null
          fetched_at?: string
          id?: string
          payload: Json
          processed?: boolean
          source_id?: string | null
          url?: string | null
        }
        Update: {
          external_id?: string | null
          fetched_at?: string
          id?: string
          payload?: Json
          processed?: boolean
          source_id?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "raw_imports_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          category: Database["public"]["Enums"]["content_type"] | null
          config: Json
          created_at: string
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["import_source_kind"]
          last_run_at: string | null
          name: string
          updated_at: string
          url: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["content_type"] | null
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          kind: Database["public"]["Enums"]["import_source_kind"]
          last_run_at?: string | null
          name: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["content_type"] | null
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["import_source_kind"]
          last_run_at?: string | null
          name?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      submitted_items: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          neighborhood: string | null
          promoted_content_id: string | null
          review_notes: string | null
          starts_at: string | null
          status: Database["public"]["Enums"]["content_status"]
          title: string
          type: Database["public"]["Enums"]["content_type"]
          url: string | null
          venue: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          neighborhood?: string | null
          promoted_content_id?: string | null
          review_notes?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          type?: Database["public"]["Enums"]["content_type"]
          url?: string | null
          venue?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          neighborhood?: string | null
          promoted_content_id?: string | null
          review_notes?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          type?: Database["public"]["Enums"]["content_type"]
          url?: string | null
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submitted_items_promoted_content_id_fkey"
            columns: ["promoted_content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
        ]
      }
      subscribers: {
        Row: {
          confirmed_at: string | null
          created_at: string
          email: string
          id: string
          preferences: Json
          source: string | null
          status: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          email: string
          id?: string
          preferences?: Json
          source?: string | null
          status?: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          email?: string
          id?: string
          preferences?: Json
          source?: string | null
          status?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "editor" | "user"
      content_status: "draft" | "review" | "published" | "archived"
      content_type:
        | "news"
        | "event"
        | "opening"
        | "food"
        | "nightlife"
        | "business"
        | "guide"
      import_source_kind: "rss" | "newsapi" | "apify" | "manual" | "submission"
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
    Enums: {
      app_role: ["admin", "editor", "user"],
      content_status: ["draft", "review", "published", "archived"],
      content_type: [
        "news",
        "event",
        "opening",
        "food",
        "nightlife",
        "business",
        "guide",
      ],
      import_source_kind: ["rss", "newsapi", "apify", "manual", "submission"],
    },
  },
} as const
