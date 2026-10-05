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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      backups: {
        Row: {
          created_at: string
          id: string
          payload: Json
          row_counts: Json
        }
        Insert: {
          created_at?: string
          id?: string
          payload: Json
          row_counts: Json
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          row_counts?: Json
        }
        Relationships: []
      }
      bills: {
        Row: {
          bill_no: string
          booking_id: string
          cgst: number
          cgst_rate: number
          created_at: string
          discount: number
          extras: number
          hotel_id: string
          id: string
          paid: boolean
          payment_mode: string
          sgst: number
          sgst_rate: number
          subtotal: number
          total: number
        }
        Insert: {
          bill_no?: string
          booking_id: string
          cgst: number
          cgst_rate: number
          created_at?: string
          discount?: number
          extras?: number
          hotel_id: string
          id?: string
          paid?: boolean
          payment_mode?: string
          sgst: number
          sgst_rate: number
          subtotal: number
          total: number
        }
        Update: {
          bill_no?: string
          booking_id?: string
          cgst?: number
          cgst_rate?: number
          created_at?: string
          discount?: number
          extras?: number
          hotel_id?: string
          id?: string
          paid?: boolean
          payment_mode?: string
          sgst?: number
          sgst_rate?: number
          subtotal?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "bills_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          adults: number
          booking_code: string
          check_in: string
          check_out: string | null
          created_at: string
          created_by: string | null
          guest_id: string
          hotel_id: string
          id: string
          nights: number
          offer_id: string | null
          rate: number
          room_id: string
          status: string
        }
        Insert: {
          adults?: number
          booking_code?: string
          check_in?: string
          check_out?: string | null
          created_at?: string
          created_by?: string | null
          guest_id: string
          hotel_id: string
          id?: string
          nights?: number
          offer_id?: string | null
          rate: number
          room_id: string
          status?: string
        }
        Update: {
          adults?: number
          booking_code?: string
          check_in?: string
          check_out?: string | null
          created_at?: string
          created_by?: string | null
          guest_id?: string
          hotel_id?: string
          id?: string
          nights?: number
          offer_id?: string | null
          rate?: number
          room_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      business_settings: {
        Row: {
          address: string | null
          business_name: string
          cgst_rate: number
          gst_number: string | null
          id: number
          sgst_rate: number
          updated_at: string
          upi_id: string | null
        }
        Insert: {
          address?: string | null
          business_name?: string
          cgst_rate?: number
          gst_number?: string | null
          id?: number
          sgst_rate?: number
          updated_at?: string
          upi_id?: string | null
        }
        Update: {
          address?: string | null
          business_name?: string
          cgst_rate?: number
          gst_number?: string | null
          id?: number
          sgst_rate?: number
          updated_at?: string
          upi_id?: string | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          hotel_id: string
          id: string
          kind: string
          name: string
        }
        Insert: {
          created_at?: string
          hotel_id: string
          id?: string
          kind?: string
          name: string
        }
        Update: {
          created_at?: string
          hotel_id?: string
          id?: string
          kind?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          aadhaar: string | null
          address: string | null
          age: number | null
          created_at: string
          extra: Json
          first_name: string
          gender: string | null
          guest_code: string
          id: string
          interests: string[]
          last_name: string
          mobile: string
        }
        Insert: {
          aadhaar?: string | null
          address?: string | null
          age?: number | null
          created_at?: string
          extra?: Json
          first_name: string
          gender?: string | null
          guest_code?: string
          id?: string
          interests?: string[]
          last_name: string
          mobile: string
        }
        Update: {
          aadhaar?: string | null
          address?: string | null
          age?: number | null
          created_at?: string
          extra?: Json
          first_name?: string
          gender?: string | null
          guest_code?: string
          id?: string
          interests?: string[]
          last_name?: string
          mobile?: string
        }
        Relationships: []
      }
      hotels: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      offers: {
        Row: {
          active: boolean
          code: string
          created_at: string
          discount_pct: number
          id: string
          title: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          discount_pct?: number
          id?: string
          title: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          discount_pct?: number
          id?: string
          title?: string
        }
        Relationships: []
      }
      onboarding_fields: {
        Row: {
          enabled: boolean
          field_type: string
          id: string
          key: string
          label: string
          options: string[] | null
          required: boolean
          sort: number
        }
        Insert: {
          enabled?: boolean
          field_type?: string
          id?: string
          key: string
          label: string
          options?: string[] | null
          required?: boolean
          sort?: number
        }
        Update: {
          enabled?: boolean
          field_type?: string
          id?: string
          key?: string
          label?: string
          options?: string[] | null
          required?: boolean
          sort?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          department_id: string | null
          email: string | null
          full_name: string | null
          hotel_id: string | null
          id: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          email?: string | null
          full_name?: string | null
          hotel_id?: string | null
          id: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          email?: string | null
          full_name?: string | null
          hotel_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          barcode: string
          created_at: string
          hotel_id: string
          id: string
          number: string
          price: number
          room_type: string
          status: string
        }
        Insert: {
          barcode?: string
          created_at?: string
          hotel_id: string
          id?: string
          number: string
          price?: number
          room_type?: string
          status?: string
        }
        Update: {
          barcode?: string
          created_at?: string
          hotel_id?: string
          id?: string
          number?: string
          price?: number
          room_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      service_logs: {
        Row: {
          amount: number
          created_at: string
          hotel_id: string
          id: string
          kind: string
          note: string | null
          room_id: string
          staff_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          hotel_id: string
          id?: string
          kind: string
          note?: string | null
          room_id: string
          staff_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          hotel_id?: string
          id?: string
          kind?: string
          note?: string | null
          room_id?: string
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_logs_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_logs_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      can_hotel: { Args: { _hotel: string }; Returns: boolean }
      guest_visits: {
        Args: { _guest: string }
        Returns: {
          booking_code: string
          check_in: string
          check_out: string
          hotel_name: string
          room_number: string
          status: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_member: { Args: never; Returns: boolean }
      is_mgr: { Args: { _hotel: string }; Returns: boolean }
      my_hotel: { Args: never; Returns: string }
      run_backup: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "admin" | "manager" | "staff"
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
      app_role: ["admin", "manager", "staff"],
    },
  },
} as const
