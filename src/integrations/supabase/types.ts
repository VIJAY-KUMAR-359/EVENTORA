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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      contact_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          sender_email: string | null
          sender_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          sender_email?: string | null
          sender_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          sender_email?: string | null
          sender_name?: string | null
        }
        Relationships: []
      }
      event_messages: {
        Row: {
          created_at: string
          event_id: string
          id: string
          message: string
          organizer_id: string
          replied_at: string | null
          reply: string | null
          sender_id: string
          sender_name: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          message: string
          organizer_id: string
          replied_at?: string | null
          reply?: string | null
          sender_id: string
          sender_name: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          message?: string
          organizer_id?: string
          replied_at?: string | null
          reply?: string | null
          sender_id?: string
          sender_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          capacity: number
          category: Database["public"]["Enums"]["event_category"]
          created_at: string
          date: string
          description: string
          duration: number
          fee_amount: number | null
          fee_type: Database["public"]["Enums"]["event_fee_type"]
          id: string
          image_url: string | null
          is_draft: boolean
          organizer_id: string
          organizer_name: string
          payment_scanner_url: string | null
          poster_url: string | null
          start_time: string
          title: string
          updated_at: string
          venue: string
        }
        Insert: {
          capacity: number
          category?: Database["public"]["Enums"]["event_category"]
          created_at?: string
          date: string
          description: string
          duration: number
          fee_amount?: number | null
          fee_type?: Database["public"]["Enums"]["event_fee_type"]
          id?: string
          image_url?: string | null
          is_draft?: boolean
          organizer_id: string
          organizer_name: string
          payment_scanner_url?: string | null
          poster_url?: string | null
          start_time: string
          title: string
          updated_at?: string
          venue: string
        }
        Update: {
          capacity?: number
          category?: Database["public"]["Enums"]["event_category"]
          created_at?: string
          date?: string
          description?: string
          duration?: number
          fee_amount?: number | null
          fee_type?: Database["public"]["Enums"]["event_fee_type"]
          id?: string
          image_url?: string | null
          is_draft?: boolean
          organizer_id?: string
          organizer_name?: string
          payment_scanner_url?: string | null
          poster_url?: string | null
          start_time?: string
          title?: string
          updated_at?: string
          venue?: string
        }
        Relationships: []
      }
      feedbacks: {
        Row: {
          created_at: string
          event_id: string | null
          id: string
          message: string
          rating: number
          user_id: string
          user_name: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          id?: string
          message: string
          rating: number
          user_id: string
          user_name: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          id?: string
          message?: string
          rating?: number
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedbacks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          event_id: string | null
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          id?: string
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bio: string | null
          created_at: string
          email: string
          id: string
          interests: Database["public"]["Enums"]["event_category"][] | null
          location: string | null
          name: string
          phone: string | null
          profile_pic_url: string | null
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          email: string
          id: string
          interests?: Database["public"]["Enums"]["event_category"][] | null
          location?: string | null
          name: string
          phone?: string | null
          profile_pic_url?: string | null
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          email?: string
          id?: string
          interests?: Database["public"]["Enums"]["event_category"][] | null
          location?: string | null
          name?: string
          phone?: string | null
          profile_pic_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      registrations: {
        Row: {
          event_id: string
          id: string
          organizer_note: string | null
          payment_screenshot_url: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          registered_at: string
          ticket: string
          user_id: string
        }
        Insert: {
          event_id: string
          id?: string
          organizer_note?: string | null
          payment_screenshot_url?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          registered_at?: string
          ticket: string
          user_id: string
        }
        Update: {
          event_id?: string
          id?: string
          organizer_note?: string | null
          payment_screenshot_url?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          registered_at?: string
          ticket?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      event_category:
        | "workshop"
        | "conference"
        | "social"
        | "study"
        | "art"
        | "hackathon"
        | "sports"
        | "music"
        | "other"
      event_fee_type: "free" | "paid"
      payment_status: "pending" | "approved" | "rejected"
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
      event_category: [
        "workshop",
        "conference",
        "social",
        "study",
        "art",
        "hackathon",
        "sports",
        "music",
        "other",
      ],
      event_fee_type: ["free", "paid"],
      payment_status: ["pending", "approved", "rejected"],
    },
  },
} as const
