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
            foreignKeyName: "b2c_cart_items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
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
            foreignKeyName: "inventory_movements_seller_catalog_id_fkey"
            columns: ["seller_catalog_id"]
            isOneToOne: false
            referencedRelation: "seller_catalog"
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
      orders_b2b: {
        Row: {
          buyer_id: string | null
          created_at: string
          currency: string
          id: string
          metadata: Json | null
          notes: string | null
          payment_method: string | null
          seller_id: string
          status: string
          total_amount: number
          total_quantity: number
          updated_at: string
        }
        Insert: {
          buyer_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          payment_method?: string | null
          seller_id: string
          status?: string
          total_amount?: number
          total_quantity?: number
          updated_at?: string
        }
        Update: {
          buyer_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          payment_method?: string | null
          seller_id?: string
          status?: string
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
            foreignKeyName: "orders_b2b_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          manager_user_id: string | null
          metadata: Json | null
          name: string
          operating_hours: Json | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address: string
          city: string
          country?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          manager_user_id?: string | null
          metadata?: Json | null
          name: string
          operating_hours?: Json | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string
          city?: string
          country?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          manager_user_id?: string | null
          metadata?: Json | null
          name?: string
          operating_hours?: Json | null
          phone?: string | null
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
          product_id: string
          rating: number
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
          product_id: string
          rating: number
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
          product_id?: string
          rating?: number
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
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
          product_id: string
          sku: string
          sort_order: number | null
          stock: number
          updated_at: string
        }
        Insert: {
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
          product_id: string
          sku: string
          sort_order?: number | null
          stock?: number
          updated_at?: string
        }
        Update: {
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
          product_id?: string
          sku?: string
          sort_order?: number | null
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
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
          moq: number
          nombre: string
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
          moq?: number
          nombre: string
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
          moq?: number
          nombre?: string
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
      [_ in never]: never
    }
    Functions: {
      generate_delivery_code: { Args: never; Returns: string }
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
          moq: number
          nombre: string
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
      payment_method: "stripe" | "moncash" | "transfer"
      payment_status: "pending" | "verified" | "rejected"
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
      payment_method: ["stripe", "moncash", "transfer"],
      payment_status: ["pending", "verified", "rejected"],
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
