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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      accommodation: {
        Row: {
          check_in_time: string | null
          check_out_time: string | null
          contact: string | null
          id: number
          nights: number | null
          reservation_code: string | null
          url: string | null
        }
        Insert: {
          check_in_time?: string | null
          check_out_time?: string | null
          contact?: string | null
          id: number
          nights?: number | null
          reservation_code?: string | null
          url?: string | null
        }
        Update: {
          check_in_time?: string | null
          check_out_time?: string | null
          contact?: string | null
          id?: number
          nights?: number | null
          reservation_code?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "stop"
            referencedColumns: ["id"]
          },
        ]
      }
      activity: {
        Row: {
          booking_required: boolean | null
          category: string | null
          entry_price: number | null
          estimated_duration_minutes: number | null
          id: number
          url: string | null
        }
        Insert: {
          booking_required?: boolean | null
          category?: string | null
          entry_price?: number | null
          estimated_duration_minutes?: number | null
          id: number
          url?: string | null
        }
        Update: {
          booking_required?: boolean | null
          category?: string | null
          entry_price?: number | null
          estimated_duration_minutes?: number | null
          id?: number
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "stop"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_status:
            | Database["public"]["Enums"]["notification_action_status"]
            | null
          content: string | null
          created_at: string
          id: number
          related_trip_id: number | null
          status: Database["public"]["Enums"]["notification_status"]
          type: Database["public"]["Enums"]["notification_type"] | null
          user_receiver_id: string
        }
        Insert: {
          action_status?:
            | Database["public"]["Enums"]["notification_action_status"]
            | null
          content?: string | null
          created_at?: string
          id?: number
          related_trip_id?: number | null
          status?: Database["public"]["Enums"]["notification_status"]
          type?: Database["public"]["Enums"]["notification_type"] | null
          user_receiver_id: string
        }
        Update: {
          action_status?:
            | Database["public"]["Enums"]["notification_action_status"]
            | null
          content?: string | null
          created_at?: string
          id?: number
          related_trip_id?: number | null
          status?: Database["public"]["Enums"]["notification_status"]
          type?: Database["public"]["Enums"]["notification_type"] | null
          user_receiver_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_trip_id_fkey"
            columns: ["related_trip_id"]
            isOneToOne: false
            referencedRelation: "trip"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_reciver_id_fkey"
            columns: ["user_receiver_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_reciver_id_fkey"
            columns: ["user_receiver_id"]
            isOneToOne: false
            referencedRelation: "user_follow_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      refuel: {
        Row: {
          fuel_type: string | null
          id: number
          liters: number | null
          price_per_unit: number | null
          station_brand: string | null
          total_cost: number | null
        }
        Insert: {
          fuel_type?: string | null
          id: number
          liters?: number | null
          price_per_unit?: number | null
          station_brand?: string | null
          total_cost?: number | null
        }
        Update: {
          fuel_type?: string | null
          id?: number
          liters?: number | null
          price_per_unit?: number | null
          station_brand?: string | null
          total_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "refuel_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "stop"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation: {
        Row: {
          bill: string | null
          created_at: string
          id: number
          status: Database["public"]["Enums"]["reservation_status"] | null
          stop_id: number | null
        }
        Insert: {
          bill?: string | null
          created_at?: string
          id?: number
          status?: Database["public"]["Enums"]["reservation_status"] | null
          stop_id?: number | null
        }
        Update: {
          bill?: string | null
          created_at?: string
          id?: number
          status?: Database["public"]["Enums"]["reservation_status"] | null
          stop_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reservation_stop_id_fkey"
            columns: ["stop_id"]
            isOneToOne: false
            referencedRelation: "stop"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          stop_id: number
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          stop_id: number
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          stop_id?: number
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservation_attachments_stop_id_fkey"
            columns: ["stop_id"]
            isOneToOne: false
            referencedRelation: "stop"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_follow_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      road_trip: {
        Row: {
          id: number
          id_trip: number
          id_vehicle: number
        }
        Insert: {
          id?: number
          id_trip: number
          id_vehicle: number
        }
        Update: {
          id?: number
          id_trip?: number
          id_vehicle?: number
        }
        Relationships: [
          {
            foreignKeyName: "road_trip_id_trip_fkey"
            columns: ["id_trip"]
            isOneToOne: false
            referencedRelation: "trip"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "road_trip_id_vehicle_fkey"
            columns: ["id_vehicle"]
            isOneToOne: false
            referencedRelation: "vehicle"
            referencedColumns: ["id"]
          },
        ]
      }
      route: {
        Row: {
          created_at: string
          destination_id: number | null
          distance: number | null
          end_date: string | null
          id: number
          origin_id: number | null
          start_date: string | null
          trip_id: number
        }
        Insert: {
          created_at?: string
          destination_id?: number | null
          distance?: number | null
          end_date?: string | null
          id?: number
          origin_id?: number | null
          start_date?: string | null
          trip_id: number
        }
        Update: {
          created_at?: string
          destination_id?: number | null
          distance?: number | null
          end_date?: string | null
          id?: number
          origin_id?: number | null
          start_date?: string | null
          trip_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "route_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: true
            referencedRelation: "stop"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_origin_id_fkey"
            columns: ["origin_id"]
            isOneToOne: true
            referencedRelation: "stop"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip"
            referencedColumns: ["id"]
          },
        ]
      }
      stop: {
        Row: {
          address: string | null
          coordinates: Json
          created_at: string
          description: string | null
          estimated_arrival: string | null
          id: number
          name: string
          order: number
          type: Database["public"]["Enums"]["StopType"]
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          coordinates: Json
          created_at?: string
          description?: string | null
          estimated_arrival?: string | null
          id?: number
          name?: string
          order?: number
          type?: Database["public"]["Enums"]["StopType"]
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          coordinates?: Json
          created_at?: string
          description?: string | null
          estimated_arrival?: string | null
          id?: number
          name?: string
          order?: number
          type?: Database["public"]["Enums"]["StopType"]
          updated_at?: string | null
        }
        Relationships: []
      }
      travelers: {
        Row: {
          trip_id: number
          user_id: string
          user_role: Database["public"]["Enums"]["collaborator_role"]
        }
        Insert: {
          trip_id: number
          user_id: string
          user_role: Database["public"]["Enums"]["collaborator_role"]
        }
        Update: {
          trip_id?: number
          user_id?: string
          user_role?: Database["public"]["Enums"]["collaborator_role"]
        }
        Relationships: [
          {
            foreignKeyName: "travelers_id_trip_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travelers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travelers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_follow_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      trip: {
        Row: {
          additional_comments: string | null
          circular: boolean | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          end_date: string | null
          estimated_price_max: number | null
          estimated_price_min: number | null
          id: number
          n_adults: number | null
          n_babies: number | null
          n_children: number | null
          n_pets: number | null
          name: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["trip_status"] | null
          total_distance_meters: number | null
          total_price: number | null
          type: Database["public"]["Enums"]["interest"][]
          updated_at: string | null
        }
        Insert: {
          additional_comments?: string | null
          circular?: boolean | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          estimated_price_max?: number | null
          estimated_price_min?: number | null
          id?: number
          n_adults?: number | null
          n_babies?: number | null
          n_children?: number | null
          n_pets?: number | null
          name?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["trip_status"] | null
          total_distance_meters?: number | null
          total_price?: number | null
          type: Database["public"]["Enums"]["interest"][]
          updated_at?: string | null
        }
        Update: {
          additional_comments?: string | null
          circular?: boolean | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          estimated_price_max?: number | null
          estimated_price_min?: number | null
          id?: number
          n_adults?: number | null
          n_babies?: number | null
          n_children?: number | null
          n_pets?: number | null
          name?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["trip_status"] | null
          total_distance_meters?: number | null
          total_price?: number | null
          type?: Database["public"]["Enums"]["interest"][]
          updated_at?: string | null
        }
        Relationships: []
      }
      trip_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          is_public: boolean | null
          rating: number
          trip_id: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          rating: number
          trip_id: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          rating?: number
          trip_id?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_reviews_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_follow_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      trip_status_history: {
        Row: {
          changed_at: string
          changed_by: string
          id: number
          new_status: Database["public"]["Enums"]["trip_status"]
          old_status: Database["public"]["Enums"]["trip_status"] | null
          reason: string | null
          trip_id: number
          user_id: string | null
        }
        Insert: {
          changed_at?: string
          changed_by: string
          id?: number
          new_status: Database["public"]["Enums"]["trip_status"]
          old_status?: Database["public"]["Enums"]["trip_status"] | null
          reason?: string | null
          trip_id: number
          user_id?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string
          id?: number
          new_status?: Database["public"]["Enums"]["trip_status"]
          old_status?: Database["public"]["Enums"]["trip_status"] | null
          reason?: string | null
          trip_id?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_trip_status_history_trip"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_trip_status_history_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_trip_status_history_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_follow_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user: {
        Row: {
          auto_trip_status_update: boolean
          created_at: string
          id: string
          img: string | null
          lastname: string | null
          name: string | null
          plan_type: Database["public"]["Enums"]["plan_type"] | null
          timezone: string
          user_type: Database["public"]["Enums"]["interest"][] | null
          username: string
        }
        Insert: {
          auto_trip_status_update?: boolean
          created_at?: string
          id: string
          img?: string | null
          lastname?: string | null
          name?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"] | null
          timezone?: string
          user_type?: Database["public"]["Enums"]["interest"][] | null
          username?: string
        }
        Update: {
          auto_trip_status_update?: boolean
          created_at?: string
          id?: string
          img?: string | null
          lastname?: string | null
          name?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"] | null
          timezone?: string
          user_type?: Database["public"]["Enums"]["interest"][] | null
          username?: string
        }
        Relationships: []
      }
      user_follows: {
        Row: {
          created_at: string | null
          following_id: string
          id: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          following_id: string
          id?: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          following_id?: string
          id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "user_follow_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_follows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_follows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_follow_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      vehicle: {
        Row: {
          avg_consumption: number | null
          brand: string | null
          fuel_tank_capacity: number | null
          id: number
          model: string | null
          type: Database["public"]["Enums"]["vehicle_type"]
          type_fuel: Database["public"]["Enums"]["type_fuel"] | null
          user_id: string | null
        }
        Insert: {
          avg_consumption?: number | null
          brand?: string | null
          fuel_tank_capacity?: number | null
          id?: number
          model?: string | null
          type: Database["public"]["Enums"]["vehicle_type"]
          type_fuel?: Database["public"]["Enums"]["type_fuel"] | null
          user_id?: string | null
        }
        Update: {
          avg_consumption?: number | null
          brand?: string | null
          fuel_tank_capacity?: number | null
          id?: number
          model?: string | null
          type?: Database["public"]["Enums"]["vehicle_type"]
          type_fuel?: Database["public"]["Enums"]["type_fuel"] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_follow_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      user_follow_stats: {
        Row: {
          followers_count: number | null
          following_count: number | null
          user_id: string | null
          user_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      accommodation_type_enum: "hotel" | "apartment" | "camping" | "hostel"
      collaborator_role: "owner" | "editor" | "viewer"
      interest:
        | "cultural"
        | "gastronomic"
        | "leisure"
        | "nature"
        | "nightlife"
        | "adventure"
        | "family"
        | "beach"
      notification_action_status: "pending" | "accepted" | "rejected"
      notification_status: "unread" | "read"
      notification_type: "invitation" | "trip_update" | "trip_status_check"
      plan_type: "free" | "premium"
      reservation_status: "canceled" | "confirmed" | "pending"
      service_type: "gas_station" | "restaurant" | "supermarket"
      StopType: "origen" | "destino" | "intermedia"
      trip_status: "planning" | "going" | "completed"
      type_fuel: "diesel" | "gasoline" | "electric" | "LPG"
      vehicle_type: "car" | "motorcycle" | "campervan" | "van"
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
      accommodation_type_enum: ["hotel", "apartment", "camping", "hostel"],
      collaborator_role: ["owner", "editor", "viewer"],
      interest: [
        "cultural",
        "gastronomic",
        "leisure",
        "nature",
        "nightlife",
        "adventure",
        "family",
        "beach",
      ],
      notification_action_status: ["pending", "accepted", "rejected"],
      notification_status: ["unread", "read"],
      notification_type: ["invitation", "trip_update", "trip_status_check"],
      plan_type: ["free", "premium"],
      reservation_status: ["canceled", "confirmed", "pending"],
      service_type: ["gas_station", "restaurant", "supermarket"],
      StopType: ["origen", "destino", "intermedia"],
      trip_status: ["planning", "going", "completed"],
      type_fuel: ["diesel", "gasoline", "electric", "LPG"],
      vehicle_type: ["car", "motorcycle", "campervan", "van"],
    },
  },
} as const
