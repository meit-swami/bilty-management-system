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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_users: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      bilties: {
        Row: {
          advance_paid: number | null
          balance_due: number | null
          bill_date: string | null
          bill_number: string | null
          bilty_date: string
          bilty_number: string
          consignee_address: string | null
          consignee_gstin: string | null
          consignee_id: string | null
          consignee_name: string | null
          consignor_address: string | null
          consignor_gstin: string | null
          consignor_id: string | null
          consignor_name: string | null
          created_at: string
          driver_id: string | null
          driver_mobile: string | null
          driver_name: string | null
          eway_bill_number: string | null
          freight_amount: number | null
          id: string
          loading_charges: number | null
          notes: string | null
          other_charges: number | null
          ship_from: string | null
          ship_to: string | null
          status: string
          total_amount: number | null
          total_quantity: number | null
          total_weight: number | null
          unloading_charges: number | null
          updated_at: string
          vehicle_id: string | null
          vehicle_number: string | null
          weight_charges: number | null
        }
        Insert: {
          advance_paid?: number | null
          balance_due?: number | null
          bill_date?: string | null
          bill_number?: string | null
          bilty_date?: string
          bilty_number: string
          consignee_address?: string | null
          consignee_gstin?: string | null
          consignee_id?: string | null
          consignee_name?: string | null
          consignor_address?: string | null
          consignor_gstin?: string | null
          consignor_id?: string | null
          consignor_name?: string | null
          created_at?: string
          driver_id?: string | null
          driver_mobile?: string | null
          driver_name?: string | null
          eway_bill_number?: string | null
          freight_amount?: number | null
          id?: string
          loading_charges?: number | null
          notes?: string | null
          other_charges?: number | null
          ship_from?: string | null
          ship_to?: string | null
          status?: string
          total_amount?: number | null
          total_quantity?: number | null
          total_weight?: number | null
          unloading_charges?: number | null
          updated_at?: string
          vehicle_id?: string | null
          vehicle_number?: string | null
          weight_charges?: number | null
        }
        Update: {
          advance_paid?: number | null
          balance_due?: number | null
          bill_date?: string | null
          bill_number?: string | null
          bilty_date?: string
          bilty_number?: string
          consignee_address?: string | null
          consignee_gstin?: string | null
          consignee_id?: string | null
          consignee_name?: string | null
          consignor_address?: string | null
          consignor_gstin?: string | null
          consignor_id?: string | null
          consignor_name?: string | null
          created_at?: string
          driver_id?: string | null
          driver_mobile?: string | null
          driver_name?: string | null
          eway_bill_number?: string | null
          freight_amount?: number | null
          id?: string
          loading_charges?: number | null
          notes?: string | null
          other_charges?: number | null
          ship_from?: string | null
          ship_to?: string | null
          status?: string
          total_amount?: number | null
          total_quantity?: number | null
          total_weight?: number | null
          unloading_charges?: number | null
          updated_at?: string
          vehicle_id?: string | null
          vehicle_number?: string | null
          weight_charges?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bilties_consignee_id_fkey"
            columns: ["consignee_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bilties_consignor_id_fkey"
            columns: ["consignor_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bilties_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bilties_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      bilty_items: {
        Row: {
          amount: number | null
          bilty_id: string
          created_at: string
          description: string
          id: string
          quantity: number | null
          rate: number | null
          weight: number | null
        }
        Insert: {
          amount?: number | null
          bilty_id: string
          created_at?: string
          description: string
          id?: string
          quantity?: number | null
          rate?: number | null
          weight?: number | null
        }
        Update: {
          amount?: number | null
          bilty_id?: string
          created_at?: string
          description?: string
          id?: string
          quantity?: number | null
          rate?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bilty_items_bilty_id_fkey"
            columns: ["bilty_id"]
            isOneToOne: false
            referencedRelation: "bilties"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          address: string | null
          bilty_prefix: string | null
          company_name: string | null
          created_at: string
          email: string | null
          financial_year_start: string | null
          gstin: string | null
          id: string
          invoice_prefix: string | null
          next_bilty_number: number | null
          next_invoice_number: number | null
          phone: string | null
          state_code: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          bilty_prefix?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          financial_year_start?: string | null
          gstin?: string | null
          id?: string
          invoice_prefix?: string | null
          next_bilty_number?: number | null
          next_invoice_number?: number | null
          phone?: string | null
          state_code?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          bilty_prefix?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          financial_year_start?: string | null
          gstin?: string | null
          id?: string
          invoice_prefix?: string | null
          next_bilty_number?: number | null
          next_invoice_number?: number | null
          phone?: string | null
          state_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      drivers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          license_number: string | null
          mobile: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          license_number?: string | null
          mobile?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          license_number?: string | null
          mobile?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          expense_date: string
          id: string
          notes: string | null
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          notes?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          notes?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          amount: number | null
          bilty_id: string
          created_at: string
          id: string
          invoice_id: string
        }
        Insert: {
          amount?: number | null
          bilty_id: string
          created_at?: string
          id?: string
          invoice_id: string
        }
        Update: {
          amount?: number | null
          bilty_id?: string
          created_at?: string
          id?: string
          invoice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_bilty_id_fkey"
            columns: ["bilty_id"]
            isOneToOne: false
            referencedRelation: "bilties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number | null
          balance_due: number | null
          cgst_amount: number | null
          cgst_rate: number | null
          created_at: string
          id: string
          igst_amount: number | null
          igst_rate: number | null
          invoice_date: string
          invoice_number: string
          notes: string | null
          party_gstin: string | null
          party_id: string | null
          party_name: string | null
          payment_status: string
          sgst_amount: number | null
          sgst_rate: number | null
          subtotal: number | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          amount_paid?: number | null
          balance_due?: number | null
          cgst_amount?: number | null
          cgst_rate?: number | null
          created_at?: string
          id?: string
          igst_amount?: number | null
          igst_rate?: number | null
          invoice_date?: string
          invoice_number: string
          notes?: string | null
          party_gstin?: string | null
          party_id?: string | null
          party_name?: string | null
          payment_status?: string
          sgst_amount?: number | null
          sgst_rate?: number | null
          subtotal?: number | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          amount_paid?: number | null
          balance_due?: number | null
          cgst_amount?: number | null
          cgst_rate?: number | null
          created_at?: string
          id?: string
          igst_amount?: number | null
          igst_rate?: number | null
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          party_gstin?: string | null
          party_id?: string | null
          party_name?: string | null
          payment_status?: string
          sgst_amount?: number | null
          sgst_rate?: number | null
          subtotal?: number | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          city: string
          created_at: string
          id: string
          is_active: boolean
          pincode: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          city: string
          created_at?: string
          id?: string
          is_active?: boolean
          pincode?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          city?: string
          created_at?: string
          id?: string
          is_active?: boolean
          pincode?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      parties: {
        Row: {
          address: string | null
          city: string | null
          contact_person: string | null
          created_at: string
          credit_limit: number | null
          email: string | null
          gstin: string | null
          id: string
          is_active: boolean
          name: string
          party_type: string
          payment_terms: number | null
          phone: string | null
          pincode: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_person?: string | null
          created_at?: string
          credit_limit?: number | null
          email?: string | null
          gstin?: string | null
          id?: string
          is_active?: boolean
          name: string
          party_type?: string
          payment_terms?: number | null
          phone?: string | null
          pincode?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_person?: string | null
          created_at?: string
          credit_limit?: number | null
          email?: string | null
          gstin?: string | null
          id?: string
          is_active?: boolean
          name?: string
          party_type?: string
          payment_terms?: number | null
          phone?: string | null
          pincode?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          owner_name: string | null
          updated_at: string
          vehicle_number: string
          vehicle_type: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          owner_name?: string | null
          updated_at?: string
          vehicle_number: string
          vehicle_type?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          owner_name?: string | null
          updated_at?: string
          vehicle_number?: string
          vehicle_type?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
