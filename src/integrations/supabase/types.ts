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
      access_codes: {
        Row: {
          code: string
          created_at: string
          exchange_id: string | null
          has_validity: boolean
          id: string
          key_id: string | null
          person_name: string | null
          reusable: boolean
          role: string | null
          scope: string | null
          status: string
          time_from: string | null
          time_to: string | null
          uses_count: number
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          code: string
          created_at?: string
          exchange_id?: string | null
          has_validity?: boolean
          id?: string
          key_id?: string | null
          person_name?: string | null
          reusable?: boolean
          role?: string | null
          scope?: string | null
          status?: string
          time_from?: string | null
          time_to?: string | null
          uses_count?: number
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          exchange_id?: string | null
          has_validity?: boolean
          id?: string
          key_id?: string | null
          person_name?: string | null
          reusable?: boolean
          role?: string | null
          scope?: string | null
          status?: string
          time_from?: string | null
          time_to?: string | null
          uses_count?: number
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_codes_exchange_id_fkey"
            columns: ["exchange_id"]
            isOneToOne: false
            referencedRelation: "key_exchanges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_codes_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "keys"
            referencedColumns: ["id"]
          },
        ]
      }
      access_log: {
        Row: {
          action: string | null
          code_id: string | null
          id: string
          key_id: string | null
          person_name: string | null
          role: string | null
          timestamp: string
        }
        Insert: {
          action?: string | null
          code_id?: string | null
          id?: string
          key_id?: string | null
          person_name?: string | null
          role?: string | null
          timestamp?: string
        }
        Update: {
          action?: string | null
          code_id?: string | null
          id?: string
          key_id?: string | null
          person_name?: string | null
          role?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_log_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "keys"
            referencedColumns: ["id"]
          },
        ]
      }
      associates: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "associates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      billing: {
        Row: {
          amount: number | null
          created_at: string
          exchanges_count: number | null
          extra_amount: number
          extra_days: number
          host_id: string | null
          id: string
          keys_count: number | null
          paid_at: string | null
          period: string | null
          plan: string | null
          status: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          exchanges_count?: number | null
          extra_amount?: number
          extra_days?: number
          host_id?: string | null
          id?: string
          keys_count?: number | null
          paid_at?: string | null
          period?: string | null
          plan?: string | null
          status?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          exchanges_count?: number | null
          extra_amount?: number
          extra_days?: number
          host_id?: string | null
          id?: string
          keys_count?: number | null
          paid_at?: string | null
          period?: string | null
          plan?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hosts"
            referencedColumns: ["id"]
          },
        ]
      }
      hosts: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hosts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      key_exchanges: {
        Row: {
          booking_ref: string
          check_in: string | null
          check_out: string | null
          created_at: string
          deposit_code: string
          deposited_at: string | null
          id: string
          key_id: string | null
          kiosk_id: string | null
          locker_position: number
          picked_up_at: string | null
          pickup_code: string | null
          pickup_time: string | null
          return_code: string | null
          returned_at: string | null
          status: string
        }
        Insert: {
          booking_ref: string
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          deposit_code: string
          deposited_at?: string | null
          id?: string
          key_id?: string | null
          kiosk_id?: string | null
          locker_position: number
          picked_up_at?: string | null
          pickup_code?: string | null
          pickup_time?: string | null
          return_code?: string | null
          returned_at?: string | null
          status?: string
        }
        Update: {
          booking_ref?: string
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          deposit_code?: string
          deposited_at?: string | null
          id?: string
          key_id?: string | null
          kiosk_id?: string | null
          locker_position?: number
          picked_up_at?: string | null
          pickup_code?: string | null
          pickup_time?: string | null
          return_code?: string | null
          returned_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "key_exchanges_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_exchanges_kiosk_id_fkey"
            columns: ["kiosk_id"]
            isOneToOne: false
            referencedRelation: "kiosks"
            referencedColumns: ["id"]
          },
        ]
      }
      keys: {
        Row: {
          created_at: string
          deposit_code: string | null
          host_id: string | null
          id: string
          kiosk_id: string | null
          locked: boolean
          name: string
          photo_url: string | null
          property_name: string | null
          status: string
          subscription_type: string
        }
        Insert: {
          created_at?: string
          deposit_code?: string | null
          host_id?: string | null
          id?: string
          kiosk_id?: string | null
          locked?: boolean
          name: string
          photo_url?: string | null
          property_name?: string | null
          status?: string
          subscription_type: string
        }
        Update: {
          created_at?: string
          deposit_code?: string | null
          host_id?: string | null
          id?: string
          kiosk_id?: string | null
          locked?: boolean
          name?: string
          photo_url?: string | null
          property_name?: string | null
          status?: string
          subscription_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "keys_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hosts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keys_kiosk_id_fkey"
            columns: ["kiosk_id"]
            isOneToOne: false
            referencedRelation: "kiosks"
            referencedColumns: ["id"]
          },
        ]
      }
      kiosks: {
        Row: {
          access_code: string
          address: string | null
          associate_id: string | null
          category: string
          commission_percent: number
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          custom_category: string | null
          id: string
          is_24h: boolean
          last_seen_at: string | null
          lat: number | null
          lng: number | null
          name: string
          photo_url: string | null
          positions: number
          schedule: Json
        }
        Insert: {
          access_code: string
          address?: string | null
          associate_id?: string | null
          category?: string
          commission_percent?: number
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          custom_category?: string | null
          id?: string
          is_24h?: boolean
          last_seen_at?: string | null
          lat?: number | null
          lng?: number | null
          name: string
          photo_url?: string | null
          positions?: number
          schedule?: Json
        }
        Update: {
          access_code?: string
          address?: string | null
          associate_id?: string | null
          category?: string
          commission_percent?: number
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          custom_category?: string | null
          id?: string
          is_24h?: boolean
          last_seen_at?: string | null
          lat?: number | null
          lng?: number | null
          name?: string
          photo_url?: string | null
          positions?: number
          schedule?: Json
        }
        Relationships: [
          {
            foreignKeyName: "kiosks_associate_id_fkey"
            columns: ["associate_id"]
            isOneToOne: false
            referencedRelation: "associates"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          booking_ref: string | null
          created_at: string
          host_id: string | null
          id: string
          message: string | null
          read: boolean
          type: string | null
        }
        Insert: {
          booking_ref?: string | null
          created_at?: string
          host_id?: string | null
          id?: string
          message?: string | null
          read?: boolean
          type?: string | null
        }
        Update: {
          booking_ref?: string | null
          created_at?: string
          host_id?: string | null
          id?: string
          message?: string | null
          read?: boolean
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hosts"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_prices: {
        Row: {
          amount: number | null
          created_at: string
          cta: string | null
          features: string[]
          plan: string
          price_label: string | null
          sort_order: number
          subtitle: string | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          cta?: string | null
          features?: string[]
          plan: string
          price_label?: string | null
          sort_order?: number
          subtitle?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          cta?: string | null
          features?: string[]
          plan?: string
          price_label?: string | null
          sort_order?: number
          subtitle?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      point_commissions: {
        Row: {
          commission_percent: number | null
          created_at: string
          id: string
          kiosk_id: string | null
          paid_at: string | null
          period: string | null
          plans_revenue: number | null
          status: string
          total: number | null
        }
        Insert: {
          commission_percent?: number | null
          created_at?: string
          id?: string
          kiosk_id?: string | null
          paid_at?: string | null
          period?: string | null
          plans_revenue?: number | null
          status?: string
          total?: number | null
        }
        Update: {
          commission_percent?: number | null
          created_at?: string
          id?: string
          kiosk_id?: string | null
          paid_at?: string | null
          period?: string | null
          plans_revenue?: number | null
          status?: string
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "point_commissions_kiosk_id_fkey"
            columns: ["kiosk_id"]
            isOneToOne: false
            referencedRelation: "kiosks"
            referencedColumns: ["id"]
          },
        ]
      }
      pro_agreements: {
        Row: {
          created_at: string
          discount_percent: number
          host_id: string | null
          id: string
          keys_included: number | null
          monthly_price: number | null
          start_date: string | null
          status: string
        }
        Insert: {
          created_at?: string
          discount_percent?: number
          host_id?: string | null
          id?: string
          keys_included?: number | null
          monthly_price?: number | null
          start_date?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          discount_percent?: number
          host_id?: string | null
          id?: string
          keys_included?: number | null
          monthly_price?: number | null
          start_date?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "pro_agreements_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hosts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          kiosk_id: string | null
          name: string | null
          notify_email: boolean
          notify_push: boolean
          payout_alias: string | null
          phone: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          kiosk_id?: string | null
          name?: string | null
          notify_email?: boolean
          notify_push?: boolean
          payout_alias?: string | null
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          kiosk_id?: string | null
          name?: string | null
          notify_email?: boolean
          notify_push?: boolean
          payout_alias?: string | null
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_kiosk_fk"
            columns: ["kiosk_id"]
            isOneToOne: false
            referencedRelation: "kiosks"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          device_info: string | null
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          device_info?: string | null
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          device_info?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sales_leads: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
          phone: string | null
          plan: string
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          phone?: string | null
          plan?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          phone?: string | null
          plan?: string
          status?: string
          user_id?: string | null
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
      waitlist: {
        Row: {
          address: string
          created_at: string
          email: string
          id: string
          name: string | null
          phone: string | null
        }
        Insert: {
          address: string
          created_at?: string
          email: string
          id?: string
          name?: string | null
          phone?: string | null
        }
        Update: {
          address?: string
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          phone?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      boarding_pass: {
        Args: { _ref: string }
        Returns: {
          booking_ref: string
          check_in: string
          check_out: string
          deposit_code: string
          key_name: string
          kiosk_address: string
          kiosk_is_24h: boolean
          kiosk_lat: number
          kiosk_lng: number
          kiosk_name: string
          kiosk_schedule: Json
          locker_position: number
          pickup_code: string
          pickup_time: string
          property_name: string
          status: string
        }[]
      }
      expire_one_use_exchanges: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      my_associate_id: { Args: never; Returns: string }
      my_host_id: { Args: never; Returns: string }
      my_kiosk_id: { Args: never; Returns: string }
      search_kiosks_public: {
        Args: never
        Returns: {
          address: string
          category: string
          custom_category: string
          free_positions: number
          id: string
          is_24h: boolean
          lat: number
          lng: number
          name: string
          positions: number
          schedule: Json
        }[]
      }
    }
    Enums: {
      app_role: "pending" | "admin" | "associate" | "host" | "kiosk"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["pending", "admin", "associate", "host", "kiosk"],
    },
  },
} as const
