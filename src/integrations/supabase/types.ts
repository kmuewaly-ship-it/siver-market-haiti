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
      addresses: {
        Row: {
          city: string
          country: string
          created_at: string
          full_name: string
          id: string
          is_default: boolean
          label: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          state: string | null
          street_address: string
          updated_at: string
          user_id: string
        }
        Insert: {
          city: string
          country?: string
          created_at?: string
          full_name: string
          id?: string
          is_default?: boolean
          label?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          street_address: string
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string
          country?: string
          created_at?: string
          full_name?: string
          id?: string
          is_default?: boolean
          label?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          street_address?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_approval_requests: {
        Row: {
          admin_comments: string | null
          amount: number | null
          created_at: string
          id: string
          metadata: Json | null
          request_type: Database["public"]["Enums"]["approval_request_type"]
          requester_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["approval_status"]
          updated_at: string
        }
        Insert: {
          admin_comments?: string | null
          amount?: number | null
          created_at?: string
          id?: string
          metadata?: Json | null
          request_type: Database["public"]["Enums"]["approval_request_type"]
          requester_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
        }
        Update: {
          admin_comments?: string | null
          amount?: number | null
          created_at?: string
          id?: string
          metadata?: Json | null
          request_type?: Database["public"]["Enums"]["approval_request_type"]
          requester_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
        }
        Relationships: []
      }
      admin_banners: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          image_url: string
          is_active: boolean
          link_url: string | null
          sort_order: number
          starts_at: string | null
          target_audience: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          link_url?: string | null
          sort_order?: number
          starts_at?: string | null
          target_audience?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          link_url?: string | null
          sort_order?: number
          starts_at?: string | null
          target_audience?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      attribute_options: {
        Row: {
          attribute_id: string
          color_hex: string | null
          created_at: string | null
          display_value: string
          id: string
          image_url: string | null
          is_active: boolean | null
          metadata: Json | null
          sort_order: number | null
          value: string
        }
        Insert: {
          attribute_id: string
          color_hex?: string | null
          created_at?: string | null
          display_value: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          metadata?: Json | null
          sort_order?: number | null
          value: string
        }
        Update: {
          attribute_id?: string
          color_hex?: string | null
          created_at?: string | null
          display_value?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          metadata?: Json | null
          sort_order?: number | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "attribute_options_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
        ]
      }
      attributes: {
        Row: {
          attribute_type: string
          category_hint: string | null
          created_at: string | null
          display_name: string
          id: string
          is_active: boolean | null
          name: string
          render_type: string
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          attribute_type?: string
          category_hint?: string | null
          created_at?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          name: string
          render_type?: string
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          attribute_type?: string
          category_hint?: string | null
          created_at?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          name?: string
          render_type?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      b2b_batches: {
        Row: {
          batch_code: string
          created_at: string | null
          id: string
          metadata: Json | null
          notes: string | null
          order_id: string | null
          purchase_date: string | null
          status: string | null
          supplier_id: string | null
          total_cost: number
          total_quantity: number
          updated_at: string | null
        }
        Insert: {
          batch_code: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          order_id?: string | null
          purchase_date?: string | null
          status?: string | null
          supplier_id?: string | null
          total_cost?: number
          total_quantity?: number
          updated_at?: string | null
        }
        Update: {
          batch_code?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          order_id?: string | null
          purchase_date?: string | null
          status?: string | null
          supplier_id?: string | null
          total_cost?: number
          total_quantity?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "b2b_batches_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_b2b"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_batches_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_cart_items: {
        Row: {
          cart_id: string
          color: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          nombre: string
          product_id: string | null
          quantity: number
          size: string | null
          sku: string
          total_price: number
          unit_price: number
        }
        Insert: {
          cart_id: string
          color?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          nombre: string
          product_id?: string | null
          quantity: number
          size?: string | null
          sku: string
          total_price: number
          unit_price: number
        }
        Update: {
          cart_id?: string
          color?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          nombre?: string
          product_id?: string | null
          quantity?: number
          size?: string | null
          sku?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "b2b_cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "b2b_carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_balance_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "b2b_cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_rotation_alerts"
            referencedColumns: ["product_id"]
          },
        ]
      }
      b2b_carts: {
        Row: {
          buyer_user_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          notes: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          buyer_user_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          buyer_user_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "b2b_carts_buyer_user_id_fkey"
            columns: ["buyer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          payment_number: string
          reference: string
          seller_id: string
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          payment_number: string
          reference: string
          seller_id: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          payment_number?: string
          reference?: string
          seller_id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "b2b_payments_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      b2c_cart_items: {
        Row: {
          cart_id: string
          created_at: string | null
          id: string
          image: string | null
          metadata: Json | null
          nombre: string
          quantity: number
          seller_catalog_id: string | null
          sku: string
          store_id: string | null
          store_name: string | null
          store_whatsapp: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          cart_id: string
          created_at?: string | null
          id?: string
          image?: string | null
          metadata?: Json | null
          nombre: string
          quantity?: number
          seller_catalog_id?: string | null
          sku: string
          store_id?: string | null
          store_name?: string | null
          store_whatsapp?: string | null
          total_price: number
          unit_price: number
        }
        Update: {
          cart_id?: string
          created_at?: string | null
          id?: string
          image?: string | null
          metadata?: Json | null
          nombre?: string
          quantity?: number
          seller_catalog_id?: string | null
          sku?: string
          store_id?: string | null
          store_name?: string | null
          store_whatsapp?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "b2c_cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "b2c_carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2c_cart_items_seller_catalog_id_fkey"
            columns: ["seller_catalog_id"]
            isOneToOne: false
            referencedRelation: "seller_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2c_cart_items_seller_catalog_id_fkey"
            columns: ["seller_catalog_id"]
            isOneToOne: false
            referencedRelation: "seller_catalog_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2c_cart_items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2c_cart_items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      b2c_carts: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          notes: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      batch_inventory: {
        Row: {
          batch_id: string
          created_at: string | null
          id: string
          quantity_available: number | null
          quantity_purchased: number
          quantity_sold: number | null
          unit_cost: number
          updated_at: string | null
          variant_id: string
        }
        Insert: {
          batch_id: string
          created_at?: string | null
          id?: string
          quantity_available?: number | null
          quantity_purchased?: number
          quantity_sold?: number | null
          unit_cost?: number
          updated_at?: string | null
          variant_id: string
        }
        Update: {
          batch_id?: string
          created_at?: string | null
          id?: string
          quantity_available?: number | null
          quantity_purchased?: number
          quantity_sold?: number | null
          unit_cost?: number
          updated_at?: string | null
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_inventory_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "b2b_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_inventory_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_inventory_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "stock_balance_view"
            referencedColumns: ["variant_id"]
          },
          {
            foreignKeyName: "batch_inventory_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "stock_rotation_alerts"
            referencedColumns: ["variant_id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_visible_public: boolean
          name: string
          parent_id: string | null
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_visible_public?: boolean
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_visible_public?: boolean
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_attribute_templates: {
        Row: {
          attribute_display_name: string
          attribute_name: string
          attribute_type: string | null
          category_id: string | null
          created_at: string | null
          id: string
          is_required: boolean | null
          render_type: string | null
          sort_order: number | null
          suggested_values: string[] | null
          updated_at: string | null
        }
        Insert: {
          attribute_display_name: string
          attribute_name: string
          attribute_type?: string | null
          category_id?: string | null
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          render_type?: string | null
          sort_order?: number | null
          suggested_values?: string[] | null
          updated_at?: string | null
        }
        Update: {
          attribute_display_name?: string
          attribute_name?: string
          attribute_type?: string | null
          category_id?: string | null
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          render_type?: string | null
          sort_order?: number | null
          suggested_values?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "category_attribute_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_shipping_rates: {
        Row: {
          category_id: string
          created_at: string | null
          description: string | null
          fixed_fee: number
          id: string
          is_active: boolean | null
          percentage_fee: number
          updated_at: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          description?: string | null
          fixed_fee?: number
          id?: string
          is_active?: boolean | null
          percentage_fee?: number
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          description?: string | null
          fixed_fee?: number
          id?: string
          is_active?: boolean | null
          percentage_fee?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "category_shipping_rates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: true
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_debts: {
        Row: {
          commission_amount: number
          created_at: string | null
          id: string
          is_paid: boolean | null
          metadata: Json | null
          order_id: string | null
          order_type: string | null
          paid_at: string | null
          paid_from_wallet: boolean | null
          payment_method: string
          sale_amount: number
          seller_id: string
          tax_amount: number | null
          total_debt: number
          wallet_id: string | null
        }
        Insert: {
          commission_amount: number
          created_at?: string | null
          id?: string
          is_paid?: boolean | null
          metadata?: Json | null
          order_id?: string | null
          order_type?: string | null
          paid_at?: string | null
          paid_from_wallet?: boolean | null
          payment_method: string
          sale_amount: number
          seller_id: string
          tax_amount?: number | null
          total_debt: number
          wallet_id?: string | null
        }
        Update: {
          commission_amount?: number
          created_at?: string | null
          id?: string
          is_paid?: boolean | null
          metadata?: Json | null
          order_id?: string | null
          order_type?: string | null
          paid_at?: string | null
          paid_from_wallet?: boolean | null
          payment_method?: string
          sale_amount?: number
          seller_id?: string
          tax_amount?: number | null
          total_debt?: number
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_debts_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_debts_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "seller_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      communes: {
        Row: {
          code: string
          created_at: string | null
          delivery_fee: number
          department_id: string
          extra_department_fee: number
          id: string
          is_active: boolean | null
          name: string
          operational_fee: number
          rate_per_lb: number
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          delivery_fee?: number
          department_id: string
          extra_department_fee?: number
          id?: string
          is_active?: boolean | null
          name: string
          operational_fee?: number
          rate_per_lb?: number
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          delivery_fee?: number
          department_id?: string
          extra_department_fee?: number
          id?: string
          is_active?: boolean | null
          name?: string
          operational_fee?: number
          rate_per_lb?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communes_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      consolidation_settings: {
        Row: {
          consolidation_mode: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_auto_close_at: string | null
          next_scheduled_close_at: string | null
          notify_on_close: boolean | null
          notify_threshold_percent: number | null
          order_quantity_threshold: number | null
          time_interval_hours: number | null
          updated_at: string | null
        }
        Insert: {
          consolidation_mode?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_auto_close_at?: string | null
          next_scheduled_close_at?: string | null
          notify_on_close?: boolean | null
          notify_threshold_percent?: number | null
          order_quantity_threshold?: number | null
          time_interval_hours?: number | null
          updated_at?: string | null
        }
        Update: {
          consolidation_mode?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_auto_close_at?: string | null
          next_scheduled_close_at?: string | null
          notify_on_close?: boolean | null
          notify_threshold_percent?: number | null
          order_quantity_threshold?: number | null
          time_interval_hours?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      credit_movements: {
        Row: {
          amount: number
          balance_after: number
          balance_before: number
          created_at: string
          description: string | null
          id: string
          movement_type: string
          reference_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          balance_before: number
          created_at?: string
          description?: string | null
          id?: string
          movement_type: string
          reference_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          balance_before?: number
          created_at?: string
          description?: string | null
          id?: string
          movement_type?: string
          reference_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      customer_discounts: {
        Row: {
          created_at: string | null
          created_by: string
          customer_user_id: string
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          reason: string | null
          store_id: string | null
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          customer_user_id: string
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          reason?: string | null
          store_id?: string | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          customer_user_id?: string
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          reason?: string | null
          store_id?: string | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_discounts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_discounts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      discount_code_uses: {
        Row: {
          discount_applied: number
          discount_code_id: string
          id: string
          order_id: string | null
          used_at: string | null
          user_id: string
        }
        Insert: {
          discount_applied: number
          discount_code_id: string
          id?: string
          order_id?: string | null
          used_at?: string | null
          user_id: string
        }
        Update: {
          discount_applied?: number
          discount_code_id?: string
          id?: string
          order_id?: string | null
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_code_uses_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_codes: {
        Row: {
          applicable_ids: string[] | null
          applies_to: string | null
          code: string
          created_at: string | null
          created_by: string
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          max_uses: number | null
          max_uses_per_user: number | null
          min_purchase_amount: number | null
          store_id: string | null
          updated_at: string | null
          used_count: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          applicable_ids?: string[] | null
          applies_to?: string | null
          code: string
          created_at?: string | null
          created_by: string
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          max_uses_per_user?: number | null
          min_purchase_amount?: number | null
          store_id?: string | null
          updated_at?: string | null
          used_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          applicable_ids?: string[] | null
          applies_to?: string | null
          code?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          max_uses_per_user?: number | null
          min_purchase_amount?: number | null
          store_id?: string | null
          updated_at?: string | null
          used_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_codes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_codes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      dynamic_expenses: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          nombre_gasto: string
          operacion: string
          sort_order: number | null
          tipo: string
          updated_at: string | null
          valor: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          nombre_gasto: string
          operacion: string
          sort_order?: number | null
          tipo: string
          updated_at?: string | null
          valor?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          nombre_gasto?: string
          operacion?: string
          sort_order?: number | null
          tipo?: string
          updated_at?: string | null
          valor?: number
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          change_amount: number
          created_at: string | null
          created_by: string | null
          id: string
          new_stock: number | null
          previous_stock: number | null
          product_id: string | null
          reason: string
          reference_id: string | null
          reference_type: string | null
          seller_catalog_id: string | null
        }
        Insert: {
          change_amount: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          new_stock?: number | null
          previous_stock?: number | null
          product_id?: string | null
          reason: string
          reference_id?: string | null
          reference_type?: string | null
          seller_catalog_id?: string | null
        }
        Update: {
          change_amount?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          new_stock?: number | null
          previous_stock?: number | null
          product_id?: string | null
          reason?: string
          reference_id?: string | null
          reference_type?: string | null
          seller_catalog_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_balance_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_rotation_alerts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_movements_seller_catalog_id_fkey"
            columns: ["seller_catalog_id"]
            isOneToOne: false
            referencedRelation: "seller_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_seller_catalog_id_fkey"
            columns: ["seller_catalog_id"]
            isOneToOne: false
            referencedRelation: "seller_catalog_public"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_verifications: {
        Row: {
          admin_comments: string | null
          created_at: string
          fiscal_document_url: string | null
          id: string
          id_back_url: string | null
          id_front_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["verification_status"]
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_comments?: string | null
          created_at?: string
          fiscal_document_url?: string | null
          id?: string
          id_back_url?: string | null
          id_front_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_comments?: string | null
          created_at?: string
          fiscal_document_url?: string | null
          id?: string
          id_back_url?: string | null
          id_front_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      master_purchase_orders: {
        Row: {
          arrived_hub_at: string | null
          arrived_usa_at: string | null
          auto_close_at: string | null
          china_tracking_entered_at: string | null
          china_tracking_number: string | null
          close_reason: string | null
          closed_at: string | null
          created_at: string | null
          created_by: string | null
          cycle_end_at: string | null
          cycle_start_at: string
          id: string
          metadata: Json | null
          notes: string | null
          orders_at_close: number | null
          po_number: string
          shipped_from_china_at: string | null
          shipped_to_haiti_at: string | null
          status: string
          total_amount: number | null
          total_items: number | null
          total_orders: number | null
          total_quantity: number | null
          updated_at: string | null
        }
        Insert: {
          arrived_hub_at?: string | null
          arrived_usa_at?: string | null
          auto_close_at?: string | null
          china_tracking_entered_at?: string | null
          china_tracking_number?: string | null
          close_reason?: string | null
          closed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          cycle_end_at?: string | null
          cycle_start_at?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          orders_at_close?: number | null
          po_number: string
          shipped_from_china_at?: string | null
          shipped_to_haiti_at?: string | null
          status?: string
          total_amount?: number | null
          total_items?: number | null
          total_orders?: number | null
          total_quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          arrived_hub_at?: string | null
          arrived_usa_at?: string | null
          auto_close_at?: string | null
          china_tracking_entered_at?: string | null
          china_tracking_number?: string | null
          close_reason?: string | null
          closed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          cycle_end_at?: string | null
          cycle_start_at?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          orders_at_close?: number | null
          po_number?: string
          shipped_from_china_at?: string | null
          shipped_to_haiti_at?: string | null
          status?: string
          total_amount?: number | null
          total_items?: number | null
          total_orders?: number | null
          total_quantity?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          is_email_sent: boolean
          is_read: boolean
          is_whatsapp_sent: boolean
          message: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          is_email_sent?: boolean
          is_read?: boolean
          is_whatsapp_sent?: boolean
          message: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          is_email_sent?: boolean
          is_read?: boolean
          is_whatsapp_sent?: boolean
          message?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_deliveries: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          delivery_code: string
          escrow_release_at: string | null
          expires_at: string | null
          funds_released: boolean | null
          funds_released_at: string | null
          id: string
          metadata: Json | null
          order_id: string
          order_type: string
          pickup_point_id: string | null
          qr_code_data: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          delivery_code: string
          escrow_release_at?: string | null
          expires_at?: string | null
          funds_released?: boolean | null
          funds_released_at?: string | null
          id?: string
          metadata?: Json | null
          order_id: string
          order_type: string
          pickup_point_id?: string | null
          qr_code_data?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          delivery_code?: string
          escrow_release_at?: string | null
          expires_at?: string | null
          funds_released?: boolean | null
          funds_released_at?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string
          order_type?: string
          pickup_point_id?: string | null
          qr_code_data?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_deliveries_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_deliveries_pickup_point_id_fkey"
            columns: ["pickup_point_id"]
            isOneToOne: false
            referencedRelation: "pickup_points"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items_b2b: {
        Row: {
          cantidad: number
          created_at: string
          descuento_percent: number | null
          id: string
          nombre: string
          order_id: string
          precio_unitario: number
          product_id: string | null
          sku: string
          subtotal: number
        }
        Insert: {
          cantidad: number
          created_at?: string
          descuento_percent?: number | null
          id?: string
          nombre: string
          order_id: string
          precio_unitario: number
          product_id?: string | null
          sku: string
          subtotal: number
        }
        Update: {
          cantidad?: number
          created_at?: string
          descuento_percent?: number | null
          id?: string
          nombre?: string
          order_id?: string
          precio_unitario?: number
          product_id?: string | null
          sku?: string
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_b2b_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_b2b"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_b2b_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_b2b_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_balance_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "order_items_b2b_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_rotation_alerts"
            referencedColumns: ["product_id"]
          },
        ]
      }
      order_refunds: {
        Row: {
          amount: number
          completed_at: string | null
          id: string
          order_id: string
          reason: string | null
          requested_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          amount?: number
          completed_at?: string | null
          id?: string
          order_id: string
          reason?: string | null
          requested_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          completed_at?: string | null
          id?: string
          order_id?: string
          reason?: string | null
          requested_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_b2b"
            referencedColumns: ["id"]
          },
        ]
      }
      order_stock_allocations: {
        Row: {
          allocation_status: string | null
          created_at: string | null
          id: string
          order_id: string
          order_type: string
          product_id: string | null
          quantity_from_haiti: number | null
          quantity_from_transit: number | null
          quantity_ordered: number
          quantity_pending_purchase: number | null
          sku: string
          transit_stock_id: string | null
          updated_at: string | null
          variant_id: string | null
        }
        Insert: {
          allocation_status?: string | null
          created_at?: string | null
          id?: string
          order_id: string
          order_type?: string
          product_id?: string | null
          quantity_from_haiti?: number | null
          quantity_from_transit?: number | null
          quantity_ordered: number
          quantity_pending_purchase?: number | null
          sku: string
          transit_stock_id?: string | null
          updated_at?: string | null
          variant_id?: string | null
        }
        Update: {
          allocation_status?: string | null
          created_at?: string | null
          id?: string
          order_id?: string
          order_type?: string
          product_id?: string | null
          quantity_from_haiti?: number | null
          quantity_from_transit?: number | null
          quantity_ordered?: number
          quantity_pending_purchase?: number | null
          sku?: string
          transit_stock_id?: string | null
          updated_at?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_stock_allocations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_stock_allocations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_balance_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "order_stock_allocations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_rotation_alerts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "order_stock_allocations_transit_stock_id_fkey"
            columns: ["transit_stock_id"]
            isOneToOne: false
            referencedRelation: "stock_in_transit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_stock_allocations_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_stock_allocations_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "stock_balance_view"
            referencedColumns: ["variant_id"]
          },
          {
            foreignKeyName: "order_stock_allocations_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "stock_rotation_alerts"
            referencedColumns: ["variant_id"]
          },
        ]
      }
      orders_b2b: {
        Row: {
          buyer_id: string | null
          checkout_session_id: string | null
          consolidation_status: string | null
          created_at: string
          currency: string
          id: string
          metadata: Json | null
          notes: string | null
          payment_confirmed_at: string | null
          payment_method: string | null
          payment_status: string | null
          po_id: string | null
          po_linked_at: string | null
          reservation_expires_at: string | null
          reserved_at: string | null
          seller_id: string
          status: string
          stock_reserved: boolean | null
          total_amount: number
          total_quantity: number
          updated_at: string
        }
        Insert: {
          buyer_id?: string | null
          checkout_session_id?: string | null
          consolidation_status?: string | null
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          payment_confirmed_at?: string | null
          payment_method?: string | null
          payment_status?: string | null
          po_id?: string | null
          po_linked_at?: string | null
          reservation_expires_at?: string | null
          reserved_at?: string | null
          seller_id: string
          status?: string
          stock_reserved?: boolean | null
          total_amount?: number
          total_quantity?: number
          updated_at?: string
        }
        Update: {
          buyer_id?: string | null
          checkout_session_id?: string | null
          consolidation_status?: string | null
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          payment_confirmed_at?: string | null
          payment_method?: string | null
          payment_status?: string | null
          po_id?: string | null
          po_linked_at?: string | null
          reservation_expires_at?: string | null
          reserved_at?: string | null
          seller_id?: string
          status?: string
          stock_reserved?: boolean | null
          total_amount?: number
          total_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_b2b_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_b2b_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "master_purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_b2b_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          account_holder: string | null
          account_number: string | null
          account_type: string | null
          automatic_enabled: boolean | null
          bank_name: string | null
          bank_swift: string | null
          created_at: string | null
          display_name: string | null
          holder_name: string | null
          id: string
          is_active: boolean | null
          manual_enabled: boolean | null
          metadata: Json | null
          method_type: string
          owner_id: string | null
          owner_type: string
          phone_number: string | null
          updated_at: string | null
        }
        Insert: {
          account_holder?: string | null
          account_number?: string | null
          account_type?: string | null
          automatic_enabled?: boolean | null
          bank_name?: string | null
          bank_swift?: string | null
          created_at?: string | null
          display_name?: string | null
          holder_name?: string | null
          id?: string
          is_active?: boolean | null
          manual_enabled?: boolean | null
          metadata?: Json | null
          method_type: string
          owner_id?: string | null
          owner_type: string
          phone_number?: string | null
          updated_at?: string | null
        }
        Update: {
          account_holder?: string | null
          account_number?: string | null
          account_type?: string | null
          automatic_enabled?: boolean | null
          bank_name?: string | null
          bank_swift?: string | null
          created_at?: string | null
          display_name?: string | null
          holder_name?: string | null
          id?: string
          is_active?: boolean | null
          manual_enabled?: boolean | null
          metadata?: Json | null
          method_type?: string
          owner_id?: string | null
          owner_type?: string
          phone_number?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pending_quotes: {
        Row: {
          admin_notes: string | null
          cart_snapshot: Json
          created_at: string
          id: string
          quote_number: string
          responded_at: string | null
          seller_id: string
          seller_notes: string | null
          status: string
          total_amount: number
          total_quantity: number
          updated_at: string
          whatsapp_sent_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          cart_snapshot: Json
          created_at?: string
          id?: string
          quote_number: string
          responded_at?: string | null
          seller_id: string
          seller_notes?: string | null
          status?: string
          total_amount?: number
          total_quantity?: number
          updated_at?: string
          whatsapp_sent_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          cart_snapshot?: Json
          created_at?: string
          id?: string
          quote_number?: string
          responded_at?: string | null
          seller_id?: string
          seller_notes?: string | null
          status?: string
          total_amount?: number
          total_quantity?: number
          updated_at?: string
          whatsapp_sent_at?: string | null
        }
        Relationships: []
      }
      pickup_point_staff: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          pickup_point_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          pickup_point_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          pickup_point_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pickup_point_staff_pickup_point_id_fkey"
            columns: ["pickup_point_id"]
            isOneToOne: false
            referencedRelation: "pickup_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickup_point_staff_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pickup_points: {
        Row: {
          address: string
          city: string
          country: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          latitude: number | null
          longitude: number | null
          manager_user_id: string | null
          metadata: Json | null
          name: string
          operating_hours: Json | null
          phone: string | null
          point_code: string | null
          updated_at: string | null
        }
        Insert: {
          address: string
          city: string
          country?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          manager_user_id?: string | null
          metadata?: Json | null
          name: string
          operating_hours?: Json | null
          phone?: string | null
          point_code?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string
          city?: string
          country?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          manager_user_id?: string | null
          metadata?: Json | null
          name?: string
          operating_hours?: Json | null
          phone?: string | null
          point_code?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pickup_points_manager_user_id_fkey"
            columns: ["manager_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value?: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: number
        }
        Relationships: []
      }
      po_order_links: {
        Row: {
          commune_code: string | null
          created_at: string | null
          current_status: string | null
          customer_name: string | null
          customer_phone: string | null
          customer_user_id: string | null
          delivery_confirmed_at: string | null
          department_code: string | null
          gestor_user_id: string | null
          hybrid_tracking_id: string | null
          id: string
          investor_user_id: string | null
          order_id: string
          order_type: string
          pickup_point_code: string | null
          pickup_qr_code: string | null
          pickup_qr_generated_at: string | null
          po_id: string
          previous_status: string | null
          short_order_id: string | null
          siver_match_sale_id: string | null
          source_type: string | null
          status_synced_at: string | null
          unit_count: number | null
          updated_at: string | null
        }
        Insert: {
          commune_code?: string | null
          created_at?: string | null
          current_status?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_user_id?: string | null
          delivery_confirmed_at?: string | null
          department_code?: string | null
          gestor_user_id?: string | null
          hybrid_tracking_id?: string | null
          id?: string
          investor_user_id?: string | null
          order_id: string
          order_type: string
          pickup_point_code?: string | null
          pickup_qr_code?: string | null
          pickup_qr_generated_at?: string | null
          po_id: string
          previous_status?: string | null
          short_order_id?: string | null
          siver_match_sale_id?: string | null
          source_type?: string | null
          status_synced_at?: string | null
          unit_count?: number | null
          updated_at?: string | null
        }
        Update: {
          commune_code?: string | null
          created_at?: string | null
          current_status?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_user_id?: string | null
          delivery_confirmed_at?: string | null
          department_code?: string | null
          gestor_user_id?: string | null
          hybrid_tracking_id?: string | null
          id?: string
          investor_user_id?: string | null
          order_id?: string
          order_type?: string
          pickup_point_code?: string | null
          pickup_qr_code?: string | null
          pickup_qr_generated_at?: string | null
          po_id?: string
          previous_status?: string | null
          short_order_id?: string | null
          siver_match_sale_id?: string | null
          source_type?: string | null
          status_synced_at?: string | null
          unit_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "po_order_links_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "master_purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_order_links_siver_match_sale_id_fkey"
            columns: ["siver_match_sale_id"]
            isOneToOne: false
            referencedRelation: "siver_match_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      po_picking_items: {
        Row: {
          bin_location: string | null
          color: string | null
          created_at: string | null
          id: string
          image_url: string | null
          picked_at: string | null
          picked_by: string | null
          po_id: string
          po_order_link_id: string
          product_id: string | null
          product_name: string
          quantity: number
          size: string | null
          sku: string
          variant_id: string | null
        }
        Insert: {
          bin_location?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          picked_at?: string | null
          picked_by?: string | null
          po_id: string
          po_order_link_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          size?: string | null
          sku: string
          variant_id?: string | null
        }
        Update: {
          bin_location?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          picked_at?: string | null
          picked_by?: string | null
          po_id?: string
          po_order_link_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          size?: string | null
          sku?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "po_picking_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "master_purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_picking_items_po_order_link_id_fkey"
            columns: ["po_order_link_id"]
            isOneToOne: false
            referencedRelation: "po_order_links"
            referencedColumns: ["id"]
          },
        ]
      }
      price_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value?: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: number
        }
        Relationships: []
      }
      product_attribute_values: {
        Row: {
          attribute_id: string
          attribute_option_id: string
          created_at: string | null
          id: string
          product_id: string
        }
        Insert: {
          attribute_id: string
          attribute_option_id: string
          created_at?: string | null
          id?: string
          product_id: string
        }
        Update: {
          attribute_id?: string
          attribute_option_id?: string
          created_at?: string | null
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_attribute_values_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_attribute_values_attribute_option_id_fkey"
            columns: ["attribute_option_id"]
            isOneToOne: false
            referencedRelation: "attribute_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_attribute_values_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_attribute_values_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_balance_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_attribute_values_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_rotation_alerts"
            referencedColumns: ["product_id"]
          },
        ]
      }
      product_migration_log: {
        Row: {
          id: string
          migrated_at: string | null
          new_variant_id: string | null
          original_product_id: string | null
          parent_sku: string
          status: string | null
        }
        Insert: {
          id?: string
          migrated_at?: string | null
          new_variant_id?: string | null
          original_product_id?: string | null
          parent_sku: string
          status?: string | null
        }
        Update: {
          id?: string
          migrated_at?: string | null
          new_variant_id?: string | null
          original_product_id?: string | null
          parent_sku?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_migration_log_new_variant_id_fkey"
            columns: ["new_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_migration_log_new_variant_id_fkey"
            columns: ["new_variant_id"]
            isOneToOne: false
            referencedRelation: "stock_balance_view"
            referencedColumns: ["variant_id"]
          },
          {
            foreignKeyName: "product_migration_log_new_variant_id_fkey"
            columns: ["new_variant_id"]
            isOneToOne: false
            referencedRelation: "stock_rotation_alerts"
            referencedColumns: ["variant_id"]
          },
          {
            foreignKeyName: "product_migration_log_original_product_id_fkey"
            columns: ["original_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_migration_log_original_product_id_fkey"
            columns: ["original_product_id"]
            isOneToOne: false
            referencedRelation: "stock_balance_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_migration_log_original_product_id_fkey"
            columns: ["original_product_id"]
            isOneToOne: false
            referencedRelation: "stock_rotation_alerts"
            referencedColumns: ["product_id"]
          },
        ]
      }
      product_price_history: {
        Row: {
          campo_modificado: string
          created_at: string
          id: string
          modificado_por: string | null
          product_id: string
          valor_anterior: string | null
          valor_nuevo: string | null
        }
        Insert: {
          campo_modificado: string
          created_at?: string
          id?: string
          modificado_por?: string | null
          product_id: string
          valor_anterior?: string | null
          valor_nuevo?: string | null
        }
        Update: {
          campo_modificado?: string
          created_at?: string
          id?: string
          modificado_por?: string | null
          product_id?: string
          valor_anterior?: string | null
          valor_nuevo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_balance_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_rotation_alerts"
            referencedColumns: ["product_id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          comment: string | null
          created_at: string
          helpful_count: number | null
          id: string
          images: Json | null
          is_anonymous: boolean | null
          is_verified_purchase: boolean | null
          parent_review_id: string | null
          product_id: string
          rating: number | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          helpful_count?: number | null
          id?: string
          images?: Json | null
          is_anonymous?: boolean | null
          is_verified_purchase?: boolean | null
          parent_review_id?: string | null
          product_id: string
          rating?: number | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          helpful_count?: number | null
          id?: string
          images?: Json | null
          is_anonymous?: boolean | null
          is_verified_purchase?: boolean | null
          parent_review_id?: string | null
          product_id?: string
          rating?: number | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_parent_review_id_fkey"
            columns: ["parent_review_id"]
            isOneToOne: false
            referencedRelation: "product_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_balance_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_rotation_alerts"
            referencedColumns: ["product_id"]
          },
        ]
      }
      product_variants: {
        Row: {
          attribute_combination: Json | null
          batch_id: string | null
          cost_price: number | null
          created_at: string
          id: string
          images: Json | null
          is_active: boolean | null
          metadata: Json | null
          moq: number
          name: string
          option_type: string
          option_value: string
          precio_promocional: number | null
          price: number | null
          price_adjustment: number | null
          product_id: string
          sku: string
          sort_order: number | null
          stock: number
          stock_b2c: number | null
          updated_at: string
        }
        Insert: {
          attribute_combination?: Json | null
          batch_id?: string | null
          cost_price?: number | null
          created_at?: string
          id?: string
          images?: Json | null
          is_active?: boolean | null
          metadata?: Json | null
          moq?: number
          name: string
          option_type: string
          option_value: string
          precio_promocional?: number | null
          price?: number | null
          price_adjustment?: number | null
          product_id: string
          sku: string
          sort_order?: number | null
          stock?: number
          stock_b2c?: number | null
          updated_at?: string
        }
        Update: {
          attribute_combination?: Json | null
          batch_id?: string | null
          cost_price?: number | null
          created_at?: string
          id?: string
          images?: Json | null
          is_active?: boolean | null
          metadata?: Json | null
          moq?: number
          name?: string
          option_type?: string
          option_value?: string
          precio_promocional?: number | null
          price?: number | null
          price_adjustment?: number | null
          product_id?: string
          sku?: string
          sort_order?: number | null
          stock?: number
          stock_b2c?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "b2b_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_balance_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_rotation_alerts"
            referencedColumns: ["product_id"]
          },
        ]
      }
      product_views: {
        Row: {
          id: string
          product_id: string
          session_id: string | null
          source: string | null
          user_id: string | null
          viewed_at: string
        }
        Insert: {
          id?: string
          product_id: string
          session_id?: string | null
          source?: string | null
          user_id?: string | null
          viewed_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          session_id?: string | null
          source?: string | null
          user_id?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_views_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_views_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_balance_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_views_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_rotation_alerts"
            referencedColumns: ["product_id"]
          },
        ]
      }
      products: {
        Row: {
          categoria_id: string | null
          costo_base_excel: number | null
          created_at: string
          currency_code: string | null
          descripcion_corta: string | null
          descripcion_larga: string | null
          dimensiones_cm: Json | null
          embedding: string | null
          galeria_imagenes: string[] | null
          id: string
          imagen_principal: string | null
          is_active: boolean
          is_parent: boolean | null
          moq: number
          nombre: string
          parent_product_id: string | null
          peso_kg: number | null
          precio_mayorista: number
          precio_promocional: number | null
          precio_sugerido_venta: number | null
          promo_active: boolean | null
          promo_ends_at: string | null
          promo_starts_at: string | null
          proveedor_id: string | null
          rating: number | null
          reviews_count: number | null
          sku_interno: string
          stock_fisico: number
          stock_status: Database["public"]["Enums"]["stock_status"]
          updated_at: string
          url_origen: string | null
        }
        Insert: {
          categoria_id?: string | null
          costo_base_excel?: number | null
          created_at?: string
          currency_code?: string | null
          descripcion_corta?: string | null
          descripcion_larga?: string | null
          dimensiones_cm?: Json | null
          embedding?: string | null
          galeria_imagenes?: string[] | null
          id?: string
          imagen_principal?: string | null
          is_active?: boolean
          is_parent?: boolean | null
          moq?: number
          nombre: string
          parent_product_id?: string | null
          peso_kg?: number | null
          precio_mayorista?: number
          precio_promocional?: number | null
          precio_sugerido_venta?: number | null
          promo_active?: boolean | null
          promo_ends_at?: string | null
          promo_starts_at?: string | null
          proveedor_id?: string | null
          rating?: number | null
          reviews_count?: number | null
          sku_interno: string
          stock_fisico?: number
          stock_status?: Database["public"]["Enums"]["stock_status"]
          updated_at?: string
          url_origen?: string | null
        }
        Update: {
          categoria_id?: string | null
          costo_base_excel?: number | null
          created_at?: string
          currency_code?: string | null
          descripcion_corta?: string | null
          descripcion_larga?: string | null
          dimensiones_cm?: Json | null
          embedding?: string | null
          galeria_imagenes?: string[] | null
          id?: string
          imagen_principal?: string | null
          is_active?: boolean
          is_parent?: boolean | null
          moq?: number
          nombre?: string
          parent_product_id?: string | null
          peso_kg?: number | null
          precio_mayorista?: number
          precio_promocional?: number | null
          precio_sugerido_venta?: number | null
          promo_active?: boolean | null
          promo_ends_at?: string | null
          promo_starts_at?: string | null
          proveedor_id?: string | null
          rating?: number | null
          reviews_count?: number | null
          sku_interno?: string
          stock_fisico?: number
          stock_status?: Database["public"]["Enums"]["stock_status"]
          updated_at?: string
          url_origen?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_parent_product_id_fkey"
            columns: ["parent_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_parent_product_id_fkey"
            columns: ["parent_product_id"]
            isOneToOne: false
            referencedRelation: "stock_balance_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "products_parent_product_id_fkey"
            columns: ["parent_product_id"]
            isOneToOne: false
            referencedRelation: "stock_rotation_alerts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "products_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchase_consolidation_items: {
        Row: {
          color: string | null
          consolidation_id: string
          created_at: string | null
          id: string
          product_id: string | null
          product_name: string
          quantity_cart: number | null
          quantity_confirmed: number | null
          quantity_in_stock: number | null
          quantity_in_transit: number | null
          quantity_pending: number | null
          quantity_to_order: number | null
          size: string | null
          sku: string
          total_cost: number | null
          unit_cost: number | null
          variant_id: string | null
        }
        Insert: {
          color?: string | null
          consolidation_id: string
          created_at?: string | null
          id?: string
          product_id?: string | null
          product_name: string
          quantity_cart?: number | null
          quantity_confirmed?: number | null
          quantity_in_stock?: number | null
          quantity_in_transit?: number | null
          quantity_pending?: number | null
          quantity_to_order?: number | null
          size?: string | null
          sku: string
          total_cost?: number | null
          unit_cost?: number | null
          variant_id?: string | null
        }
        Update: {
          color?: string | null
          consolidation_id?: string
          created_at?: string | null
          id?: string
          product_id?: string | null
          product_name?: string
          quantity_cart?: number | null
          quantity_confirmed?: number | null
          quantity_in_stock?: number | null
          quantity_in_transit?: number | null
          quantity_pending?: number | null
          quantity_to_order?: number | null
          size?: string | null
          sku?: string
          total_cost?: number | null
          unit_cost?: number | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_consolidation_items_consolidation_id_fkey"
            columns: ["consolidation_id"]
            isOneToOne: false
            referencedRelation: "purchase_consolidations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_consolidation_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_consolidation_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_balance_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "purchase_consolidation_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_rotation_alerts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "purchase_consolidation_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_consolidation_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "stock_balance_view"
            referencedColumns: ["variant_id"]
          },
          {
            foreignKeyName: "purchase_consolidation_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "stock_rotation_alerts"
            referencedColumns: ["variant_id"]
          },
        ]
      }
      purchase_consolidations: {
        Row: {
          consolidation_number: string
          created_at: string | null
          created_by: string | null
          estimated_cost: number | null
          id: string
          notes: string | null
          ordered_at: string | null
          received_at: string | null
          status: string | null
          submitted_at: string | null
          supplier_id: string | null
          total_items: number | null
          total_quantity: number | null
          updated_at: string | null
        }
        Insert: {
          consolidation_number: string
          created_at?: string | null
          created_by?: string | null
          estimated_cost?: number | null
          id?: string
          notes?: string | null
          ordered_at?: string | null
          received_at?: string | null
          status?: string | null
          submitted_at?: string | null
          supplier_id?: string | null
          total_items?: number | null
          total_quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          consolidation_number?: string
          created_at?: string | null
          created_by?: string | null
          estimated_cost?: number | null
          id?: string
          notes?: string | null
          ordered_at?: string | null
          received_at?: string | null
          status?: string | null
          submitted_at?: string | null
          supplier_id?: string | null
          total_items?: number | null
          total_quantity?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_consolidations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_settings: {
        Row: {
          bonus_per_referral: number
          created_at: string
          credit_increase_amount: number
          id: string
          referrals_for_credit_increase: number
          updated_at: string
        }
        Insert: {
          bonus_per_referral?: number
          created_at?: string
          credit_increase_amount?: number
          id?: string
          referrals_for_credit_increase?: number
          updated_at?: string
        }
        Update: {
          bonus_per_referral?: number
          created_at?: string
          credit_increase_amount?: number
          id?: string
          referrals_for_credit_increase?: number
          updated_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          bonus_amount: number | null
          bonus_approved: boolean | null
          created_at: string
          first_purchase_at: string | null
          first_purchase_completed: boolean
          id: string
          referral_code: string
          referred_id: string
          referrer_id: string
        }
        Insert: {
          bonus_amount?: number | null
          bonus_approved?: boolean | null
          created_at?: string
          first_purchase_at?: string | null
          first_purchase_completed?: boolean
          id?: string
          referral_code: string
          referred_id: string
          referrer_id: string
        }
        Update: {
          bonus_amount?: number | null
          bonus_approved?: boolean | null
          created_at?: string
          first_purchase_at?: string | null
          first_purchase_completed?: boolean
          id?: string
          referral_code?: string
          referred_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      seller_catalog: {
        Row: {
          descripcion: string | null
          id: string
          images: Json | null
          imported_at: string | null
          is_active: boolean | null
          metadata: Json | null
          nombre: string
          precio_costo: number
          precio_venta: number
          seller_store_id: string
          sku: string
          source_order_id: string | null
          source_product_id: string | null
          stock: number
          updated_at: string | null
        }
        Insert: {
          descripcion?: string | null
          id?: string
          images?: Json | null
          imported_at?: string | null
          is_active?: boolean | null
          metadata?: Json | null
          nombre: string
          precio_costo?: number
          precio_venta?: number
          seller_store_id: string
          sku: string
          source_order_id?: string | null
          source_product_id?: string | null
          stock?: number
          updated_at?: string | null
        }
        Update: {
          descripcion?: string | null
          id?: string
          images?: Json | null
          imported_at?: string | null
          is_active?: boolean | null
          metadata?: Json | null
          nombre?: string
          precio_costo?: number
          precio_venta?: number
          seller_store_id?: string
          sku?: string
          source_order_id?: string | null
          source_product_id?: string | null
          stock?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_catalog_seller_store_id_fkey"
            columns: ["seller_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_catalog_seller_store_id_fkey"
            columns: ["seller_store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_catalog_source_order_id_fkey"
            columns: ["source_order_id"]
            isOneToOne: false
            referencedRelation: "orders_b2b"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_catalog_source_product_id_fkey"
            columns: ["source_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_catalog_source_product_id_fkey"
            columns: ["source_product_id"]
            isOneToOne: false
            referencedRelation: "stock_balance_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "seller_catalog_source_product_id_fkey"
            columns: ["source_product_id"]
            isOneToOne: false
            referencedRelation: "stock_rotation_alerts"
            referencedColumns: ["product_id"]
          },
        ]
      }
      seller_commission_overrides: {
        Row: {
          commission_fixed: number | null
          commission_percentage: number | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          reason: string | null
          seller_id: string
          tax_tca_percentage: number | null
          updated_at: string | null
        }
        Insert: {
          commission_fixed?: number | null
          commission_percentage?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          reason?: string | null
          seller_id: string
          tax_tca_percentage?: number | null
          updated_at?: string | null
        }
        Update: {
          commission_fixed?: number | null
          commission_percentage?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          reason?: string | null
          seller_id?: string
          tax_tca_percentage?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_commission_overrides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_commission_overrides_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_credits: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          balance_debt: number
          created_at: string
          credit_limit: number
          id: string
          is_active: boolean
          max_cart_percentage: number
          updated_at: string
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          balance_debt?: number
          created_at?: string
          credit_limit?: number
          id?: string
          is_active?: boolean
          max_cart_percentage?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          balance_debt?: number
          created_at?: string
          credit_limit?: number
          id?: string
          is_active?: boolean
          max_cart_percentage?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      seller_statuses: {
        Row: {
          caption: string | null
          created_at: string
          expires_at: string
          id: string
          image_url: string
          store_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          image_url: string
          store_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          image_url?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_statuses_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_statuses_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_wallets: {
        Row: {
          available_balance: number
          commission_debt: number
          created_at: string | null
          currency: string
          id: string
          pending_balance: number
          seller_id: string
          total_earned: number
          total_withdrawn: number
          updated_at: string | null
        }
        Insert: {
          available_balance?: number
          commission_debt?: number
          created_at?: string | null
          currency?: string
          id?: string
          pending_balance?: number
          seller_id: string
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string | null
        }
        Update: {
          available_balance?: number
          commission_debt?: number
          created_at?: string | null
          currency?: string
          id?: string
          pending_balance?: number
          seller_id?: string
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_wallets_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      sellers: {
        Row: {
          business_name: string | null
          created_at: string
          email: string
          id: string
          is_verified: boolean | null
          name: string
          phone: string | null
          updated_at: string
          user_id: string | null
          verification_badge_active: boolean | null
          verification_date: string | null
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          email: string
          id?: string
          is_verified?: boolean | null
          name: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
          verification_badge_active?: boolean | null
          verification_date?: string | null
        }
        Update: {
          business_name?: string | null
          created_at?: string
          email?: string
          id?: string
          is_verified?: boolean | null
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
          verification_badge_active?: boolean | null
          verification_date?: string | null
        }
        Relationships: []
      }
      shipment_tracking: {
        Row: {
          category_fees: number | null
          china_tracking_number: string
          commune_id: string | null
          created_at: string | null
          customer_name: string | null
          customer_phone: string | null
          department_id: string | null
          hybrid_tracking_id: string
          id: string
          label_printed_at: string | null
          order_id: string | null
          order_type: string | null
          pickup_point_id: string | null
          reference_price: number | null
          shipping_cost_china_usa: number | null
          shipping_cost_usa_haiti: number | null
          status: string | null
          total_shipping_cost: number | null
          unit_count: number
          updated_at: string | null
          weight_grams: number | null
        }
        Insert: {
          category_fees?: number | null
          china_tracking_number: string
          commune_id?: string | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          department_id?: string | null
          hybrid_tracking_id: string
          id?: string
          label_printed_at?: string | null
          order_id?: string | null
          order_type?: string | null
          pickup_point_id?: string | null
          reference_price?: number | null
          shipping_cost_china_usa?: number | null
          shipping_cost_usa_haiti?: number | null
          status?: string | null
          total_shipping_cost?: number | null
          unit_count?: number
          updated_at?: string | null
          weight_grams?: number | null
        }
        Update: {
          category_fees?: number | null
          china_tracking_number?: string
          commune_id?: string | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          department_id?: string | null
          hybrid_tracking_id?: string
          id?: string
          label_printed_at?: string | null
          order_id?: string | null
          order_type?: string | null
          pickup_point_id?: string | null
          reference_price?: number | null
          shipping_cost_china_usa?: number | null
          shipping_cost_usa_haiti?: number | null
          status?: string | null
          total_shipping_cost?: number | null
          unit_count?: number
          updated_at?: string | null
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_tracking_commune_id_fkey"
            columns: ["commune_id"]
            isOneToOne: false
            referencedRelation: "communes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_tracking_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_tracking_pickup_point_id_fkey"
            columns: ["pickup_point_id"]
            isOneToOne: false
            referencedRelation: "pickup_points"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_rates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value?: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: number
        }
        Relationships: []
      }
      siver_match_assignments: {
        Row: {
          accepted_at: string | null
          completed_at: string | null
          created_at: string | null
          gestor_id: string
          gestor_notes: string | null
          id: string
          initiated_by: Database["public"]["Enums"]["siver_match_role"]
          investor_id: string
          investor_notes: string | null
          metadata: Json | null
          quantity_assigned: number
          quantity_available: number
          quantity_sold: number | null
          requested_at: string | null
          status: Database["public"]["Enums"]["assignment_status"] | null
          stock_lot_id: string
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          gestor_id: string
          gestor_notes?: string | null
          id?: string
          initiated_by: Database["public"]["Enums"]["siver_match_role"]
          investor_id: string
          investor_notes?: string | null
          metadata?: Json | null
          quantity_assigned: number
          quantity_available: number
          quantity_sold?: number | null
          requested_at?: string | null
          status?: Database["public"]["Enums"]["assignment_status"] | null
          stock_lot_id: string
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          gestor_id?: string
          gestor_notes?: string | null
          id?: string
          initiated_by?: Database["public"]["Enums"]["siver_match_role"]
          investor_id?: string
          investor_notes?: string | null
          metadata?: Json | null
          quantity_assigned?: number
          quantity_available?: number
          quantity_sold?: number | null
          requested_at?: string | null
          status?: Database["public"]["Enums"]["assignment_status"] | null
          stock_lot_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "siver_match_assignments_gestor_id_fkey"
            columns: ["gestor_id"]
            isOneToOne: false
            referencedRelation: "siver_match_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siver_match_assignments_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "siver_match_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siver_match_assignments_stock_lot_id_fkey"
            columns: ["stock_lot_id"]
            isOneToOne: false
            referencedRelation: "siver_match_stock_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      siver_match_badges: {
        Row: {
          code: string
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          min_rating: number | null
          min_reviews: number | null
          min_sales: number | null
          name: string
          role: Database["public"]["Enums"]["siver_match_role"] | null
          sort_order: number | null
        }
        Insert: {
          code: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          min_rating?: number | null
          min_reviews?: number | null
          min_sales?: number | null
          name: string
          role?: Database["public"]["Enums"]["siver_match_role"] | null
          sort_order?: number | null
        }
        Update: {
          code?: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          min_rating?: number | null
          min_reviews?: number | null
          min_sales?: number | null
          name?: string
          role?: Database["public"]["Enums"]["siver_match_role"] | null
          sort_order?: number | null
        }
        Relationships: []
      }
      siver_match_profiles: {
        Row: {
          avatar_url: string | null
          average_rating: number | null
          badges: Json | null
          bio: string | null
          commune_id: string | null
          created_at: string | null
          current_pending_orders: number | null
          department_id: string | null
          display_name: string
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          max_pending_orders: number | null
          phone: string | null
          role: Database["public"]["Enums"]["siver_match_role"]
          total_reviews: number | null
          total_sales_amount: number | null
          total_sales_count: number | null
          updated_at: string | null
          user_id: string
          verified_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          average_rating?: number | null
          badges?: Json | null
          bio?: string | null
          commune_id?: string | null
          created_at?: string | null
          current_pending_orders?: number | null
          department_id?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          max_pending_orders?: number | null
          phone?: string | null
          role: Database["public"]["Enums"]["siver_match_role"]
          total_reviews?: number | null
          total_sales_amount?: number | null
          total_sales_count?: number | null
          updated_at?: string | null
          user_id: string
          verified_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          average_rating?: number | null
          badges?: Json | null
          bio?: string | null
          commune_id?: string | null
          created_at?: string | null
          current_pending_orders?: number | null
          department_id?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          max_pending_orders?: number | null
          phone?: string | null
          role?: Database["public"]["Enums"]["siver_match_role"]
          total_reviews?: number | null
          total_sales_amount?: number | null
          total_sales_count?: number | null
          updated_at?: string | null
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "siver_match_profiles_commune_id_fkey"
            columns: ["commune_id"]
            isOneToOne: false
            referencedRelation: "communes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siver_match_profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      siver_match_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          is_public: boolean | null
          rating: number
          reviewed_profile_id: string
          reviewer_profile_id: string
          reviewer_role: Database["public"]["Enums"]["siver_match_role"]
          sale_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          rating: number
          reviewed_profile_id: string
          reviewer_profile_id: string
          reviewer_role: Database["public"]["Enums"]["siver_match_role"]
          sale_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          rating?: number
          reviewed_profile_id?: string
          reviewer_profile_id?: string
          reviewer_role?: Database["public"]["Enums"]["siver_match_role"]
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "siver_match_reviews_reviewed_profile_id_fkey"
            columns: ["reviewed_profile_id"]
            isOneToOne: false
            referencedRelation: "siver_match_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siver_match_reviews_reviewer_profile_id_fkey"
            columns: ["reviewer_profile_id"]
            isOneToOne: false
            referencedRelation: "siver_match_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siver_match_reviews_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "siver_match_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      siver_match_sales: {
        Row: {
          assignment_id: string
          commune_id: string | null
          created_at: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          customer_user_id: string | null
          delivered_at: string | null
          delivery_address: string | null
          delivery_confirmed_by: string | null
          delivery_photo_url: string | null
          department_id: string | null
          gestor_commission: number
          gestor_id: string
          gestor_wallet_tx_id: string | null
          hybrid_tracking_id: string | null
          id: string
          investor_amount: number
          investor_id: string
          investor_wallet_tx_id: string | null
          logistics_stage: string | null
          metadata: Json | null
          payment_confirmed_at: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: string | null
          picked_up_at: string | null
          picked_up_by: string | null
          pickup_code: string | null
          pickup_qr_code: string | null
          pickup_qr_generated_at: string | null
          po_id: string | null
          po_linked_at: string | null
          quantity: number
          sale_number: string
          siver_fee: number
          siver_wallet_tx_id: string | null
          status: Database["public"]["Enums"]["match_sale_status"] | null
          stock_lot_id: string
          total_amount: number
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          assignment_id: string
          commune_id?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          customer_user_id?: string | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_confirmed_by?: string | null
          delivery_photo_url?: string | null
          department_id?: string | null
          gestor_commission: number
          gestor_id: string
          gestor_wallet_tx_id?: string | null
          hybrid_tracking_id?: string | null
          id?: string
          investor_amount: number
          investor_id: string
          investor_wallet_tx_id?: string | null
          logistics_stage?: string | null
          metadata?: Json | null
          payment_confirmed_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          picked_up_at?: string | null
          picked_up_by?: string | null
          pickup_code?: string | null
          pickup_qr_code?: string | null
          pickup_qr_generated_at?: string | null
          po_id?: string | null
          po_linked_at?: string | null
          quantity: number
          sale_number: string
          siver_fee: number
          siver_wallet_tx_id?: string | null
          status?: Database["public"]["Enums"]["match_sale_status"] | null
          stock_lot_id: string
          total_amount: number
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          assignment_id?: string
          commune_id?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          customer_user_id?: string | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_confirmed_by?: string | null
          delivery_photo_url?: string | null
          department_id?: string | null
          gestor_commission?: number
          gestor_id?: string
          gestor_wallet_tx_id?: string | null
          hybrid_tracking_id?: string | null
          id?: string
          investor_amount?: number
          investor_id?: string
          investor_wallet_tx_id?: string | null
          logistics_stage?: string | null
          metadata?: Json | null
          payment_confirmed_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          picked_up_at?: string | null
          picked_up_by?: string | null
          pickup_code?: string | null
          pickup_qr_code?: string | null
          pickup_qr_generated_at?: string | null
          po_id?: string | null
          po_linked_at?: string | null
          quantity?: number
          sale_number?: string
          siver_fee?: number
          siver_wallet_tx_id?: string | null
          status?: Database["public"]["Enums"]["match_sale_status"] | null
          stock_lot_id?: string
          total_amount?: number
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "siver_match_sales_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "siver_match_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siver_match_sales_commune_id_fkey"
            columns: ["commune_id"]
            isOneToOne: false
            referencedRelation: "communes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siver_match_sales_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siver_match_sales_gestor_id_fkey"
            columns: ["gestor_id"]
            isOneToOne: false
            referencedRelation: "siver_match_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siver_match_sales_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "siver_match_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siver_match_sales_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "master_purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siver_match_sales_stock_lot_id_fkey"
            columns: ["stock_lot_id"]
            isOneToOne: false
            referencedRelation: "siver_match_stock_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      siver_match_stock_lots: {
        Row: {
          arrived_at_hub_at: string | null
          available_quantity: number
          china_tracking_number: string | null
          color: string | null
          cost_per_unit: number
          created_at: string | null
          gestor_commission_per_unit: number
          id: string
          internal_tracking_id: string | null
          investor_id: string
          logistics_stage: string | null
          metadata: Json | null
          min_price: number | null
          notes: string | null
          product_id: string | null
          product_image: string | null
          product_name: string
          size: string | null
          sku: string | null
          sold_quantity: number | null
          status: Database["public"]["Enums"]["stock_lot_status"] | null
          suggested_price: number
          total_quantity: number
          updated_at: string | null
          variant_id: string | null
        }
        Insert: {
          arrived_at_hub_at?: string | null
          available_quantity: number
          china_tracking_number?: string | null
          color?: string | null
          cost_per_unit: number
          created_at?: string | null
          gestor_commission_per_unit: number
          id?: string
          internal_tracking_id?: string | null
          investor_id: string
          logistics_stage?: string | null
          metadata?: Json | null
          min_price?: number | null
          notes?: string | null
          product_id?: string | null
          product_image?: string | null
          product_name: string
          size?: string | null
          sku?: string | null
          sold_quantity?: number | null
          status?: Database["public"]["Enums"]["stock_lot_status"] | null
          suggested_price: number
          total_quantity: number
          updated_at?: string | null
          variant_id?: string | null
        }
        Update: {
          arrived_at_hub_at?: string | null
          available_quantity?: number
          china_tracking_number?: string | null
          color?: string | null
          cost_per_unit?: number
          created_at?: string | null
          gestor_commission_per_unit?: number
          id?: string
          internal_tracking_id?: string | null
          investor_id?: string
          logistics_stage?: string | null
          metadata?: Json | null
          min_price?: number | null
          notes?: string | null
          product_id?: string | null
          product_image?: string | null
          product_name?: string
          size?: string | null
          sku?: string | null
          sold_quantity?: number | null
          status?: Database["public"]["Enums"]["stock_lot_status"] | null
          suggested_price?: number
          total_quantity?: number
          updated_at?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "siver_match_stock_lots_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "siver_match_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siver_match_stock_lots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siver_match_stock_lots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_balance_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "siver_match_stock_lots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_rotation_alerts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "siver_match_stock_lots_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siver_match_stock_lots_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "stock_balance_view"
            referencedColumns: ["variant_id"]
          },
          {
            foreignKeyName: "siver_match_stock_lots_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "stock_rotation_alerts"
            referencedColumns: ["variant_id"]
          },
        ]
      }
      siver_match_wallet_splits: {
        Row: {
          created_at: string | null
          error_message: string | null
          gestor_amount: number
          gestor_tx_ref: string | null
          id: string
          investor_amount: number
          investor_tx_ref: string | null
          is_processed: boolean | null
          processed_at: string | null
          sale_id: string
          siver_amount: number
          siver_tx_ref: string | null
          total_received: number
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          gestor_amount: number
          gestor_tx_ref?: string | null
          id?: string
          investor_amount: number
          investor_tx_ref?: string | null
          is_processed?: boolean | null
          processed_at?: string | null
          sale_id: string
          siver_amount: number
          siver_tx_ref?: string | null
          total_received: number
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          gestor_amount?: number
          gestor_tx_ref?: string | null
          id?: string
          investor_amount?: number
          investor_tx_ref?: string | null
          is_processed?: boolean | null
          processed_at?: string | null
          sale_id?: string
          siver_amount?: number
          siver_tx_ref?: string | null
          total_received?: number
        }
        Relationships: [
          {
            foreignKeyName: "siver_match_wallet_splits_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "siver_match_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_in_transit: {
        Row: {
          batch_id: string | null
          china_tracking_number: string | null
          created_at: string | null
          expected_arrival_date: string | null
          id: string
          notes: string | null
          product_id: string | null
          quantity: number
          shipped_date: string | null
          status: string | null
          supplier_id: string | null
          updated_at: string | null
          variant_id: string | null
        }
        Insert: {
          batch_id?: string | null
          china_tracking_number?: string | null
          created_at?: string | null
          expected_arrival_date?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
          shipped_date?: string | null
          status?: string | null
          supplier_id?: string | null
          updated_at?: string | null
          variant_id?: string | null
        }
        Update: {
          batch_id?: string | null
          china_tracking_number?: string | null
          created_at?: string | null
          expected_arrival_date?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
          shipped_date?: string | null
          status?: string | null
          supplier_id?: string | null
          updated_at?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_in_transit_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "b2b_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_in_transit_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_in_transit_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_balance_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "stock_in_transit_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_rotation_alerts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "stock_in_transit_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_in_transit_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_in_transit_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "stock_balance_view"
            referencedColumns: ["variant_id"]
          },
          {
            foreignKeyName: "stock_in_transit_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "stock_rotation_alerts"
            referencedColumns: ["variant_id"]
          },
        ]
      }
      stock_reservations: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          product_id: string | null
          quantity: number
          released_at: string | null
          reserved_at: string
          seller_catalog_id: string | null
          status: string
          updated_at: string | null
          variant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          product_id?: string | null
          quantity: number
          released_at?: string | null
          reserved_at?: string
          seller_catalog_id?: string | null
          status?: string
          updated_at?: string | null
          variant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          product_id?: string | null
          quantity?: number
          released_at?: string | null
          reserved_at?: string
          seller_catalog_id?: string | null
          status?: string
          updated_at?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_reservations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_b2b"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_reservations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_reservations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_balance_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "stock_reservations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_rotation_alerts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "stock_reservations_seller_catalog_id_fkey"
            columns: ["seller_catalog_id"]
            isOneToOne: false
            referencedRelation: "seller_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_reservations_seller_catalog_id_fkey"
            columns: ["seller_catalog_id"]
            isOneToOne: false
            referencedRelation: "seller_catalog_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_reservations_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_reservations_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "stock_balance_view"
            referencedColumns: ["variant_id"]
          },
          {
            foreignKeyName: "stock_reservations_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "stock_rotation_alerts"
            referencedColumns: ["variant_id"]
          },
        ]
      }
      stock_rotation_tracking: {
        Row: {
          alert_sent_at: string | null
          created_at: string | null
          id: string
          last_sale_date: string | null
          product_id: string | null
          stock_quantity: number | null
          suggested_discount: number | null
          updated_at: string | null
          variant_id: string | null
        }
        Insert: {
          alert_sent_at?: string | null
          created_at?: string | null
          id?: string
          last_sale_date?: string | null
          product_id?: string | null
          stock_quantity?: number | null
          suggested_discount?: number | null
          updated_at?: string | null
          variant_id?: string | null
        }
        Update: {
          alert_sent_at?: string | null
          created_at?: string | null
          id?: string
          last_sale_date?: string | null
          product_id?: string | null
          stock_quantity?: number | null
          suggested_discount?: number | null
          updated_at?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_rotation_tracking_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_rotation_tracking_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_balance_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "stock_rotation_tracking_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_rotation_alerts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "stock_rotation_tracking_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_rotation_tracking_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "stock_balance_view"
            referencedColumns: ["variant_id"]
          },
          {
            foreignKeyName: "stock_rotation_tracking_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "stock_rotation_alerts"
            referencedColumns: ["variant_id"]
          },
        ]
      }
      store_followers: {
        Row: {
          created_at: string
          id: string
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_followers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_followers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      store_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          is_anonymous: boolean
          rating: number
          store_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          is_anonymous?: boolean
          rating: number
          store_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          is_anonymous?: boolean
          rating?: number
          store_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_reviews_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_reviews_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          account_holder: string | null
          account_number: string | null
          account_type: string | null
          allow_comments: boolean | null
          bank_name: string | null
          banner: string | null
          city: string | null
          country: string | null
          created_at: string | null
          description: string | null
          facebook: string | null
          id: string
          instagram: string | null
          is_accepting_orders: boolean | null
          is_active: boolean | null
          logo: string | null
          metadata: Json | null
          name: string
          owner_user_id: string
          return_policy: string | null
          shipping_policy: string | null
          show_stock: boolean | null
          slug: string | null
          tiktok: string | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          account_holder?: string | null
          account_number?: string | null
          account_type?: string | null
          allow_comments?: boolean | null
          bank_name?: string | null
          banner?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          is_accepting_orders?: boolean | null
          is_active?: boolean | null
          logo?: string | null
          metadata?: Json | null
          name: string
          owner_user_id: string
          return_policy?: string | null
          shipping_policy?: string | null
          show_stock?: boolean | null
          slug?: string | null
          tiktok?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          account_holder?: string | null
          account_number?: string | null
          account_type?: string | null
          allow_comments?: boolean | null
          bank_name?: string | null
          banner?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          is_accepting_orders?: boolean | null
          is_active?: boolean | null
          logo?: string | null
          metadata?: Json | null
          name?: string
          owner_user_id?: string
          return_policy?: string | null
          shipping_policy?: string | null
          show_stock?: boolean | null
          slug?: string | null
          tiktok?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stores_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_notification_preferences: {
        Row: {
          created_at: string | null
          email_notifications: boolean | null
          id: string
          order_notifications: boolean | null
          promotional_emails: boolean | null
          updated_at: string | null
          user_id: string
          whatsapp_notifications: boolean | null
        }
        Insert: {
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          order_notifications?: boolean | null
          promotional_emails?: boolean | null
          updated_at?: string | null
          user_id: string
          whatsapp_notifications?: boolean | null
        }
        Update: {
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          order_notifications?: boolean | null
          promotional_emails?: boolean | null
          updated_at?: string | null
          user_id?: string
          whatsapp_notifications?: boolean | null
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
          role?: Database["public"]["Enums"]["app_role"]
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
      variant_attribute_values: {
        Row: {
          attribute_id: string
          attribute_option_id: string
          created_at: string | null
          id: string
          variant_id: string
        }
        Insert: {
          attribute_id: string
          attribute_option_id: string
          created_at?: string | null
          id?: string
          variant_id: string
        }
        Update: {
          attribute_id?: string
          attribute_option_id?: string
          created_at?: string | null
          id?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "variant_attribute_values_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variant_attribute_values_attribute_option_id_fkey"
            columns: ["attribute_option_id"]
            isOneToOne: false
            referencedRelation: "attribute_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variant_attribute_values_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variant_attribute_values_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "stock_balance_view"
            referencedColumns: ["variant_id"]
          },
          {
            foreignKeyName: "variant_attribute_values_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "stock_rotation_alerts"
            referencedColumns: ["variant_id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          fee_amount: number | null
          id: string
          metadata: Json | null
          net_amount: number
          processed_by: string | null
          reference_id: string | null
          reference_type: string | null
          release_at: string | null
          released_at: string | null
          status: Database["public"]["Enums"]["wallet_transaction_status"]
          tax_amount: number | null
          type: Database["public"]["Enums"]["wallet_transaction_type"]
          updated_at: string | null
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          fee_amount?: number | null
          id?: string
          metadata?: Json | null
          net_amount: number
          processed_by?: string | null
          reference_id?: string | null
          reference_type?: string | null
          release_at?: string | null
          released_at?: string | null
          status?: Database["public"]["Enums"]["wallet_transaction_status"]
          tax_amount?: number | null
          type: Database["public"]["Enums"]["wallet_transaction_type"]
          updated_at?: string | null
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          fee_amount?: number | null
          id?: string
          metadata?: Json | null
          net_amount?: number
          processed_by?: string | null
          reference_id?: string | null
          reference_type?: string | null
          release_at?: string | null
          released_at?: string | null
          status?: Database["public"]["Enums"]["wallet_transaction_status"]
          tax_amount?: number | null
          type?: Database["public"]["Enums"]["wallet_transaction_type"]
          updated_at?: string | null
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "seller_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          bank_details: Json | null
          created_at: string | null
          currency: string
          fee_amount: number | null
          id: string
          net_amount: number
          payment_method: string
          processed_at: string | null
          processed_by: string | null
          seller_id: string
          status: Database["public"]["Enums"]["withdrawal_status"]
          updated_at: string | null
          wallet_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          bank_details?: Json | null
          created_at?: string | null
          currency?: string
          fee_amount?: number | null
          id?: string
          net_amount: number
          payment_method: string
          processed_at?: string | null
          processed_by?: string | null
          seller_id: string
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string | null
          wallet_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          bank_details?: Json | null
          created_at?: string | null
          currency?: string
          fee_amount?: number | null
          id?: string
          net_amount?: number
          payment_method?: string
          processed_at?: string | null
          processed_by?: string | null
          seller_id?: string
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string | null
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "seller_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      seller_catalog_public: {
        Row: {
          descripcion: string | null
          id: string | null
          images: Json | null
          imported_at: string | null
          is_active: boolean | null
          nombre: string | null
          precio_venta: number | null
          seller_store_id: string | null
          sku: string | null
          stock: number | null
          updated_at: string | null
        }
        Insert: {
          descripcion?: string | null
          id?: string | null
          images?: Json | null
          imported_at?: string | null
          is_active?: boolean | null
          nombre?: string | null
          precio_venta?: number | null
          seller_store_id?: string | null
          sku?: string | null
          stock?: number | null
          updated_at?: string | null
        }
        Update: {
          descripcion?: string | null
          id?: string | null
          images?: Json | null
          imported_at?: string | null
          is_active?: boolean | null
          nombre?: string | null
          precio_venta?: number | null
          seller_store_id?: string | null
          sku?: string | null
          stock?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_catalog_seller_store_id_fkey"
            columns: ["seller_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_catalog_seller_store_id_fkey"
            columns: ["seller_store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_balance_view: {
        Row: {
          available_balance: number | null
          orders_pending: number | null
          product_id: string | null
          product_name: string | null
          sku: string | null
          stock_haiti: number | null
          stock_in_transit: number | null
          variant_id: string | null
          variant_name: string | null
        }
        Relationships: []
      }
      stock_rotation_alerts: {
        Row: {
          alert_sent_at: string | null
          days_without_sale: number | null
          id: string | null
          last_sale_date: string | null
          product_id: string | null
          product_name: string | null
          sku: string | null
          stock_quantity: number | null
          suggested_discount: number | null
          variant_id: string | null
          variant_name: string | null
        }
        Relationships: []
      }
      stores_public: {
        Row: {
          allow_comments: boolean | null
          banner: string | null
          city: string | null
          country: string | null
          created_at: string | null
          description: string | null
          facebook: string | null
          id: string | null
          instagram: string | null
          is_accepting_orders: boolean | null
          is_active: boolean | null
          logo: string | null
          name: string | null
          owner_user_id: string | null
          return_policy: string | null
          shipping_policy: string | null
          show_stock: boolean | null
          slug: string | null
          tiktok: string | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          allow_comments?: boolean | null
          banner?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          facebook?: string | null
          id?: string | null
          instagram?: string | null
          is_accepting_orders?: boolean | null
          is_active?: boolean | null
          logo?: string | null
          name?: string | null
          owner_user_id?: string | null
          return_policy?: string | null
          shipping_policy?: string | null
          show_stock?: boolean | null
          slug?: string | null
          tiktok?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          allow_comments?: boolean | null
          banner?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          facebook?: string | null
          id?: string | null
          instagram?: string | null
          is_accepting_orders?: boolean | null
          is_active?: boolean | null
          logo?: string | null
          name?: string | null
          owner_user_id?: string | null
          return_policy?: string | null
          shipping_policy?: string | null
          show_stock?: boolean | null
          slug?: string | null
          tiktok?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stores_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      auto_close_po: {
        Args: { p_close_reason?: string; p_po_id: string }
        Returns: Json
      }
      check_po_auto_close: { Args: never; Returns: Json }
      fn_expire_pending_orders: { Args: never; Returns: number }
      generate_consolidation_number: { Args: never; Returns: string }
      generate_delivery_code: { Args: never; Returns: string }
      generate_hybrid_tracking_id: {
        Args: {
          p_china_tracking: string
          p_commune_code: string
          p_dept_code: string
          p_point_code: string
          p_unit_count: number
        }
        Returns: string
      }
      generate_match_sale_number: { Args: never; Returns: string }
      generate_pickup_code: { Args: never; Returns: string }
      generate_po_hybrid_tracking: {
        Args: {
          p_china_tracking: string
          p_commune_code: string
          p_dept_code: string
          p_po_number: string
          p_short_order_id: string
        }
        Returns: string
      }
      generate_po_number: { Args: never; Returns: string }
      generate_po_pickup_qr: {
        Args: { p_order_link_id: string }
        Returns: string
      }
      get_consolidation_stats: { Args: never; Returns: Json }
      get_or_create_active_po: { Args: never; Returns: string }
      get_trending_products: {
        Args: { days_back?: number; limit_count?: number }
        Returns: {
          product_data: Json
          product_id: string
          view_count: number
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
      is_promo_active: {
        Args: {
          p_promo_active: boolean
          p_promo_ends_at: string
          p_promo_starts_at: string
        }
        Returns: boolean
      }
      is_seller: { Args: { _user_id: string }; Returns: boolean }
      link_mixed_orders_to_po: { Args: { p_po_id: string }; Returns: Json }
      link_orders_to_po: { Args: { p_po_id: string }; Returns: Json }
      match_products: {
        Args: {
          match_count: number
          match_threshold: number
          query_embedding: string
        }
        Returns: {
          categoria_id: string | null
          costo_base_excel: number | null
          created_at: string
          currency_code: string | null
          descripcion_corta: string | null
          descripcion_larga: string | null
          dimensiones_cm: Json | null
          embedding: string | null
          galeria_imagenes: string[] | null
          id: string
          imagen_principal: string | null
          is_active: boolean
          is_parent: boolean | null
          moq: number
          nombre: string
          parent_product_id: string | null
          peso_kg: number | null
          precio_mayorista: number
          precio_promocional: number | null
          precio_sugerido_venta: number | null
          promo_active: boolean | null
          promo_ends_at: string | null
          promo_starts_at: string | null
          proveedor_id: string | null
          rating: number | null
          reviews_count: number | null
          sku_interno: string
          stock_fisico: number
          stock_status: Database["public"]["Enums"]["stock_status"]
          updated_at: string
          url_origen: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      process_delivery_wallet_splits: {
        Args: { p_po_id: string }
        Returns: Json
      }
      process_mixed_po_china_tracking: {
        Args: { p_china_tracking: string; p_po_id: string }
        Returns: Json
      }
      process_po_china_tracking: {
        Args: { p_china_tracking: string; p_po_id: string }
        Returns: Json
      }
      process_siver_match_wallet_split: {
        Args: { p_sale_id: string }
        Returns: boolean
      }
      process_withdrawal_completion: {
        Args: {
          p_action: string
          p_admin_notes?: string
          p_withdrawal_id: string
        }
        Returns: Json
      }
      update_consolidation_settings: {
        Args: {
          p_is_active?: boolean
          p_mode?: string
          p_quantity_threshold?: number
          p_time_hours?: number
        }
        Returns: Json
      }
      update_mixed_po_logistics_stage: {
        Args: { p_new_status: string; p_po_id: string }
        Returns: Json
      }
      update_po_logistics_stage: {
        Args: { p_new_status: string; p_po_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "seller" | "staff_pickup"
      approval_request_type:
        | "kyc_verification"
        | "referral_bonus"
        | "credit_limit_increase"
        | "credit_activation"
        | "seller_upgrade"
      approval_status: "pending" | "approved" | "rejected"
      assignment_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "active"
        | "completed"
        | "cancelled"
      match_sale_status:
        | "pending_payment"
        | "payment_confirmed"
        | "ready_pickup"
        | "picked_up"
        | "delivered"
        | "cancelled"
      payment_method: "stripe" | "moncash" | "transfer"
      payment_status: "pending" | "verified" | "rejected"
      payment_status_order:
        | "draft"
        | "pending"
        | "pending_validation"
        | "paid"
        | "failed"
        | "expired"
        | "cancelled"
      siver_match_role: "investor" | "gestor"
      stock_lot_status:
        | "draft"
        | "published"
        | "assigned"
        | "in_transit"
        | "in_hub"
        | "active"
        | "depleted"
        | "cancelled"
      stock_status: "in_stock" | "low_stock" | "out_of_stock"
      verification_status:
        | "unverified"
        | "pending_verification"
        | "verified"
        | "rejected"
      wallet_transaction_status:
        | "pending"
        | "processing"
        | "completed"
        | "cancelled"
        | "failed"
      wallet_transaction_type:
        | "sale_escrow"
        | "escrow_release"
        | "commission_charge"
        | "tax_charge"
        | "withdrawal_request"
        | "withdrawal_completed"
        | "refund"
        | "debt_compensation"
        | "manual_adjustment"
      withdrawal_status:
        | "pending"
        | "approved"
        | "processing"
        | "completed"
        | "rejected"
        | "cancelled"
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
      app_role: ["admin", "moderator", "user", "seller", "staff_pickup"],
      approval_request_type: [
        "kyc_verification",
        "referral_bonus",
        "credit_limit_increase",
        "credit_activation",
        "seller_upgrade",
      ],
      approval_status: ["pending", "approved", "rejected"],
      assignment_status: [
        "pending",
        "accepted",
        "rejected",
        "active",
        "completed",
        "cancelled",
      ],
      match_sale_status: [
        "pending_payment",
        "payment_confirmed",
        "ready_pickup",
        "picked_up",
        "delivered",
        "cancelled",
      ],
      payment_method: ["stripe", "moncash", "transfer"],
      payment_status: ["pending", "verified", "rejected"],
      payment_status_order: [
        "draft",
        "pending",
        "pending_validation",
        "paid",
        "failed",
        "expired",
        "cancelled",
      ],
      siver_match_role: ["investor", "gestor"],
      stock_lot_status: [
        "draft",
        "published",
        "assigned",
        "in_transit",
        "in_hub",
        "active",
        "depleted",
        "cancelled",
      ],
      stock_status: ["in_stock", "low_stock", "out_of_stock"],
      verification_status: [
        "unverified",
        "pending_verification",
        "verified",
        "rejected",
      ],
      wallet_transaction_status: [
        "pending",
        "processing",
        "completed",
        "cancelled",
        "failed",
      ],
      wallet_transaction_type: [
        "sale_escrow",
        "escrow_release",
        "commission_charge",
        "tax_charge",
        "withdrawal_request",
        "withdrawal_completed",
        "refund",
        "debt_compensation",
        "manual_adjustment",
      ],
      withdrawal_status: [
        "pending",
        "approved",
        "processing",
        "completed",
        "rejected",
        "cancelled",
      ],
    },
  },
} as const
