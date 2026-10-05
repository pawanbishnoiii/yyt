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
      alerts: {
        Row: {
          created_at: string
          hotel_id: string
          id: string
          kind: string
          message: string
          ref_id: string | null
        }
        Insert: {
          created_at?: string
          hotel_id: string
          id?: string
          kind: string
          message: string
          ref_id?: string | null
        }
        Update: {
          created_at?: string
          hotel_id?: string
          id?: string
          kind?: string
          message?: string
          ref_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
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
          flagged: boolean
          guest_id: string
          hotel_id: string
          id: string
          nights: number
          offer_id: string | null
          rate: number
          room_id: string
          source: string
          status: string
        }
        Insert: {
          adults?: number
          booking_code?: string
          check_in?: string
          check_out?: string | null
          created_at?: string
          created_by?: string | null
          flagged?: boolean
          guest_id: string
          hotel_id: string
          id?: string
          nights?: number
          offer_id?: string | null
          rate: number
          room_id: string
          source?: string
          status?: string
        }
        Update: {
          adults?: number
          booking_code?: string
          check_in?: string
          check_out?: string | null
          created_at?: string
          created_by?: string | null
          flagged?: boolean
          guest_id?: string
          hotel_id?: string
          id?: string
          nights?: number
          offer_id?: string | null
          rate?: number
          room_id?: string
          source?: string
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
          preferences: string[]
          stay_notes: string | null
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
          preferences?: string[]
          stay_notes?: string | null
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
          preferences?: string[]
          stay_notes?: string | null
        }
        Relationships: []
      }
      hotels: {
        Row: {
          address: string | null
          cgst_rate: number
          city: string | null
          created_at: string
          gst_number: string | null
          id: string
          name: string
          owner_id: string | null
          phone: string | null
          pincode: string | null
          sgst_rate: number
          state: string | null
          upi_id: string | null
        }
        Insert: {
          address?: string | null
          cgst_rate?: number
          city?: string | null
          created_at?: string
          gst_number?: string | null
          id?: string
          name: string
          owner_id?: string | null
          phone?: string | null
          pincode?: string | null
          sgst_rate?: number
          state?: string | null
          upi_id?: string | null
        }
        Update: {
          address?: string | null
          cgst_rate?: number
          city?: string | null
          created_at?: string
          gst_number?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          phone?: string | null
          pincode?: string | null
          sgst_rate?: number
          state?: string | null
          upi_id?: string | null
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
          mobile: string | null
          onboarded: boolean
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          email?: string | null
          full_name?: string | null
          hotel_id?: string | null
          id: string
          mobile?: string | null
          onboarded?: boolean
        }
        Update: {
          created_at?: string
          department_id?: string | null
          email?: string | null
          full_name?: string | null
          hotel_id?: string | null
          id?: string
          mobile?: string | null
          onboarded?: boolean
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
      room_issues: {
        Row: {
          category: string
          created_at: string
          hotel_id: string
          id: string
          note: string | null
          reported_by: string | null
          resolved: boolean
          resolved_at: string | null
          room_id: string
          severity: string
          tag: string
        }
        Insert: {
          category: string
          created_at?: string
          hotel_id: string
          id?: string
          note?: string | null
          reported_by?: string | null
          resolved?: boolean
          resolved_at?: string | null
          room_id: string
          severity?: string
          tag: string
        }
        Update: {
          category?: string
          created_at?: string
          hotel_id?: string
          id?: string
          note?: string | null
          reported_by?: string | null
          resolved?: boolean
          resolved_at?: string | null
          room_id?: string
          severity?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_issues_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_issues_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
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
      complete_onboarding: {
        Args: {
          _address: string
          _branch_address: string
          _branch_name: string
          _business_name: string
          _cgst: number
          _city: string
          _gst: string
          _manager_name: string
          _mobile: string
          _phone: string
          _pincode: string
          _price: number
          _room_count: number
          _room_type: string
          _sgst: number
          _start_no: number
          _state: string
          _upi: string
        }
        Returns: string
      }
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
      quick_checkin: {
        Args: { _guest: string; _nights: number; _room: string }
        Returns: string
      }
      run_automations: { Args: never; Returns: undefined }
      run_backup: { Args: never; Returns: string }
      seed_demo: { Args: { _hotel: string }; Returns: undefined }
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
