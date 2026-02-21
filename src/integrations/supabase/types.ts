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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          performed_by: string | null
          performer_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          performed_by?: string | null
          performer_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          performed_by?: string | null
          performer_name?: string | null
        }
        Relationships: []
      }
      backup_logs: {
        Row: {
          created_at: string
          file_name: string
          format: string
          id: string
          performed_by: string | null
          performer_name: string | null
          row_count: number
          tables_included: string[]
        }
        Insert: {
          created_at?: string
          file_name: string
          format: string
          id?: string
          performed_by?: string | null
          performer_name?: string | null
          row_count?: number
          tables_included?: string[]
        }
        Update: {
          created_at?: string
          file_name?: string
          format?: string
          id?: string
          performed_by?: string | null
          performer_name?: string | null
          row_count?: number
          tables_included?: string[]
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
      bilty_bills: {
        Row: {
          bill_date: string | null
          bill_number: string | null
          bilty_id: string
          created_at: string
          eway_bill_number: string | null
          id: string
        }
        Insert: {
          bill_date?: string | null
          bill_number?: string | null
          bilty_id: string
          created_at?: string
          eway_bill_number?: string | null
          id?: string
        }
        Update: {
          bill_date?: string | null
          bill_number?: string | null
          bilty_id?: string
          created_at?: string
          eway_bill_number?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bilty_bills_bilty_id_fkey"
            columns: ["bilty_id"]
            isOneToOne: false
            referencedRelation: "bilties"
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
      chat_messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          channel: string
          created_at: string
          id: string
          message: string
          recipient_id: string | null
          sender_id: string
          sender_name: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          channel?: string
          created_at?: string
          id?: string
          message: string
          recipient_id?: string | null
          sender_id: string
          sender_name?: string
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          channel?: string
          created_at?: string
          id?: string
          message?: string
          recipient_id?: string | null
          sender_id?: string
          sender_name?: string
        }
        Relationships: []
      }
      client_payments: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          description: string | null
          id: string
          payment_date: string
          payment_method: string | null
          reference_number: string | null
        }
        Insert: {
          amount?: number
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          payment_date?: string
          payment_method?: string | null
          reference_number?: string | null
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          payment_date?: string
          payment_method?: string | null
          reference_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      client_subscriptions: {
        Row: {
          amc_cost: number
          client_company: string | null
          client_email: string | null
          client_name: string
          client_phone: string | null
          created_at: string
          domain_url: string | null
          end_date: string | null
          hosting_cost: number
          id: string
          notes: string | null
          plan_type: string
          setup_cost: number
          start_date: string
          status: string
          subscription_price: number
          total_monthly_cost: number | null
          updated_at: string
        }
        Insert: {
          amc_cost?: number
          client_company?: string | null
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string
          domain_url?: string | null
          end_date?: string | null
          hosting_cost?: number
          id?: string
          notes?: string | null
          plan_type?: string
          setup_cost?: number
          start_date?: string
          status?: string
          subscription_price?: number
          total_monthly_cost?: number | null
          updated_at?: string
        }
        Update: {
          amc_cost?: number
          client_company?: string | null
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string
          domain_url?: string | null
          end_date?: string | null
          hosting_cost?: number
          id?: string
          notes?: string | null
          plan_type?: string
          setup_cost?: number
          start_date?: string
          status?: string
          subscription_price?: number
          total_monthly_cost?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          address: string | null
          bilty_prefix: string | null
          company_name: string | null
          created_at: string
          email: string | null
          favicon_url: string | null
          financial_year_start: string | null
          gstin: string | null
          id: string
          invoice_prefix: string | null
          logo_dark_url: string | null
          logo_light_url: string | null
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
          favicon_url?: string | null
          financial_year_start?: string | null
          gstin?: string | null
          id?: string
          invoice_prefix?: string | null
          logo_dark_url?: string | null
          logo_light_url?: string | null
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
          favicon_url?: string | null
          financial_year_start?: string | null
          gstin?: string | null
          id?: string
          invoice_prefix?: string | null
          logo_dark_url?: string | null
          logo_light_url?: string | null
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
      email_logs: {
        Row: {
          body_html: string | null
          browser: string | null
          created_at: string
          device: string | null
          error_message: string | null
          id: string
          open_count: number | null
          opened_at: string | null
          related_id: string | null
          related_type: string | null
          sent_at: string | null
          sent_by: string | null
          status: string
          subject: string
          template_id: string | null
          to_email: string
        }
        Insert: {
          body_html?: string | null
          browser?: string | null
          created_at?: string
          device?: string | null
          error_message?: string | null
          id?: string
          open_count?: number | null
          opened_at?: string | null
          related_id?: string | null
          related_type?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          subject: string
          template_id?: string | null
          to_email: string
        }
        Update: {
          body_html?: string | null
          browser?: string | null
          created_at?: string
          device?: string | null
          error_message?: string | null
          id?: string
          open_count?: number | null
          opened_at?: string | null
          related_id?: string | null
          related_type?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          subject?: string
          template_id?: string | null
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_html: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          subject: string
          updated_at: string
          variables: string[] | null
        }
        Insert: {
          body_html?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          subject?: string
          updated_at?: string
          variables?: string[] | null
        }
        Update: {
          body_html?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          subject?: string
          updated_at?: string
          variables?: string[] | null
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
      groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
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
          due_date: string | null
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
          public_password: string | null
          public_token: string | null
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
          due_date?: string | null
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
          public_password?: string | null
          public_token?: string | null
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
          due_date?: string | null
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
          public_password?: string | null
          public_token?: string | null
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
      leads: {
        Row: {
          assigned_to: string | null
          company: string | null
          converted_to_party_id: string | null
          created_at: string
          created_by: string | null
          email: string | null
          expected_close_date: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          source: string | null
          status: string
          tags: string[] | null
          updated_at: string
          value: number | null
        }
        Insert: {
          assigned_to?: string | null
          company?: string | null
          converted_to_party_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          expected_close_date?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          value?: number | null
        }
        Update: {
          assigned_to?: string | null
          company?: string | null
          converted_to_party_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          expected_close_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_converted_to_party_id_fkey"
            columns: ["converted_to_party_id"]
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
      module_permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_read: boolean
          can_update: boolean
          id: string
          module: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_read?: boolean
          can_update?: boolean
          id?: string
          module: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_read?: boolean
          can_update?: boolean
          id?: string
          module?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
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
      payment_records: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          party_id: string | null
          party_name: string | null
          payment_date: string
          payment_method: string | null
          payment_number: string
          reference_number: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          party_id?: string | null
          party_name?: string | null
          payment_date?: string
          payment_method?: string | null
          payment_number: string
          reference_number?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          party_id?: string | null
          party_name?: string | null
          payment_date?: string
          payment_method?: string | null
          payment_number?: string
          reference_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_records_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_records_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          client_subscription_id: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          mfa_enabled: number
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          client_subscription_id?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          mfa_enabled?: number
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          client_subscription_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          mfa_enabled?: number
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_client_subscription_id_fkey"
            columns: ["client_subscription_id"]
            isOneToOne: false
            referencedRelation: "client_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_items: {
        Row: {
          amount: number | null
          created_at: string
          description: string
          id: string
          is_optional: boolean | null
          long_description: string | null
          proposal_id: string
          quantity: number | null
          rate: number | null
          sort_order: number | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          description: string
          id?: string
          is_optional?: boolean | null
          long_description?: string | null
          proposal_id: string
          quantity?: number | null
          rate?: number | null
          sort_order?: number | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          description?: string
          id?: string
          is_optional?: boolean | null
          long_description?: string | null
          proposal_id?: string
          quantity?: number | null
          rate?: number | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_items_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          allow_comments: boolean | null
          assigned_to: string | null
          cgst_amount: number | null
          cgst_rate: number | null
          converted_to_invoice_id: string | null
          created_at: string
          created_by: string | null
          discount_amount: number | null
          discount_type: string | null
          discount_value: number | null
          id: string
          igst_amount: number | null
          igst_rate: number | null
          notes: string | null
          party_gstin: string | null
          party_id: string | null
          party_name: string | null
          proposal_date: string
          proposal_number: string
          public_password: string | null
          public_token: string | null
          sgst_amount: number | null
          sgst_rate: number | null
          status: string
          subject: string | null
          subtotal: number | null
          tags: string[] | null
          total_amount: number | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          allow_comments?: boolean | null
          assigned_to?: string | null
          cgst_amount?: number | null
          cgst_rate?: number | null
          converted_to_invoice_id?: string | null
          created_at?: string
          created_by?: string | null
          discount_amount?: number | null
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          igst_amount?: number | null
          igst_rate?: number | null
          notes?: string | null
          party_gstin?: string | null
          party_id?: string | null
          party_name?: string | null
          proposal_date?: string
          proposal_number: string
          public_password?: string | null
          public_token?: string | null
          sgst_amount?: number | null
          sgst_rate?: number | null
          status?: string
          subject?: string | null
          subtotal?: number | null
          tags?: string[] | null
          total_amount?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          allow_comments?: boolean | null
          assigned_to?: string | null
          cgst_amount?: number | null
          cgst_rate?: number | null
          converted_to_invoice_id?: string | null
          created_at?: string
          created_by?: string | null
          discount_amount?: number | null
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          igst_amount?: number | null
          igst_rate?: number | null
          notes?: string | null
          party_gstin?: string | null
          party_id?: string | null
          party_name?: string | null
          proposal_date?: string
          proposal_number?: string
          public_password?: string | null
          public_token?: string | null
          sgst_amount?: number | null
          sgst_rate?: number | null
          status?: string
          subject?: string | null
          subtotal?: number | null
          tags?: string[] | null
          total_amount?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_requests: {
        Row: {
          auth_user_id: string | null
          client_subscription_id: string | null
          company_name: string | null
          created_at: string
          email: string
          email_verified: boolean
          email_verified_at: string | null
          full_name: string
          id: string
          phone: string | null
          requested_role: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          client_subscription_id?: string | null
          company_name?: string | null
          created_at?: string
          email: string
          email_verified?: boolean
          email_verified_at?: string | null
          full_name: string
          id?: string
          phone?: string | null
          requested_role?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          client_subscription_id?: string | null
          company_name?: string | null
          created_at?: string
          email?: string
          email_verified?: boolean
          email_verified_at?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          requested_role?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registration_requests_client_subscription_id_fkey"
            columns: ["client_subscription_id"]
            isOneToOne: false
            referencedRelation: "client_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      smtp_settings: {
        Row: {
          created_at: string
          encryption: string
          from_email: string | null
          from_name: string | null
          host: string
          id: string
          is_active: boolean
          password: string
          port: number
          type: string
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          encryption?: string
          from_email?: string | null
          from_name?: string | null
          host?: string
          id?: string
          is_active?: boolean
          password?: string
          port?: number
          type: string
          updated_at?: string
          username?: string
        }
        Update: {
          created_at?: string
          encryption?: string
          from_email?: string | null
          from_name?: string | null
          host?: string
          id?: string
          is_active?: boolean
          password?: string
          port?: number
          type?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      user_groups: {
        Row: {
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      user_presence: {
        Row: {
          id: string
          is_online: boolean
          last_seen: string
          user_email: string | null
          user_id: string
          user_name: string
        }
        Insert: {
          id?: string
          is_online?: boolean
          last_seen?: string
          user_email?: string | null
          user_id: string
          user_name?: string
        }
        Update: {
          id?: string
          is_online?: boolean
          last_seen?: string
          user_email?: string | null
          user_id?: string
          user_name?: string
        }
        Relationships: []
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
      get_module_permission: {
        Args: { _module: string; _user_id: string }
        Returns: {
          can_create: boolean
          can_delete: boolean
          can_read: boolean
          can_update: boolean
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "manager" | "accountant" | "viewer"
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
      app_role: ["super_admin", "admin", "manager", "accountant", "viewer"],
    },
  },
} as const
