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
      drivers: {
        Row: {
          cnh: string
          cnh_category: string
          cnh_expiry: string | null
          cpf: string
          created_at: string
          id: string
          name: string
          phone: string
          user_id: string | null
        }
        Insert: {
          cnh?: string
          cnh_category?: string
          cnh_expiry?: string | null
          cpf?: string
          created_at?: string
          id?: string
          name: string
          phone?: string
          user_id?: string | null
        }
        Update: {
          cnh?: string
          cnh_category?: string
          cnh_expiry?: string | null
          cpf?: string
          created_at?: string
          id?: string
          name?: string
          phone?: string
          user_id?: string | null
        }
        Relationships: []
      }
      empresas: {
        Row: {
          created_at: string
          id_empresa: number
          nome_empresa: string | null
        }
        Insert: {
          created_at?: string
          id_empresa?: number
          nome_empresa?: string | null
        }
        Update: {
          created_at?: string
          id_empresa?: number
          nome_empresa?: string | null
        }
        Relationships: []
      }
      maintenances: {
        Row: {
          cost: number | null
          created_at: string
          date: string
          description: string
          id: string
          next_review_date: string | null
          next_review_km: number | null
          part_replaced: string
          type: Database["public"]["Enums"]["maintenance_type"]
          vehicle_id: string
          vehicle_km: number | null
          workshop: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          date: string
          description?: string
          id?: string
          next_review_date?: string | null
          next_review_km?: number | null
          part_replaced?: string
          type?: Database["public"]["Enums"]["maintenance_type"]
          vehicle_id: string
          vehicle_km?: number | null
          workshop?: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          date?: string
          description?: string
          id?: string
          next_review_date?: string | null
          next_review_km?: number | null
          part_replaced?: string
          type?: Database["public"]["Enums"]["maintenance_type"]
          vehicle_id?: string
          vehicle_km?: number | null
          workshop?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenances_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string
          cpf: string
          created_at: string
          id: string
          name: string
          notes: string
          phone: string
        }
        Insert: {
          address?: string
          cpf?: string
          created_at?: string
          id?: string
          name: string
          notes?: string
          phone?: string
        }
        Update: {
          address?: string
          cpf?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string
          phone?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          email: string
          full_name: string
          id: string
          id_empresa: number | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          full_name?: string
          id: string
          id_empresa?: number | null
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          id_empresa?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id_empresa"]
          },
        ]
      }
      trip_passengers: {
        Row: {
          has_companion: boolean
          id: string
          patient_id: string
          trip_id: string
        }
        Insert: {
          has_companion?: boolean
          id?: string
          patient_id: string
          trip_id: string
        }
        Update: {
          has_companion?: boolean
          id?: string
          patient_id?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_passengers_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_passengers_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          consult_location: string
          created_at: string
          date: string
          departure_time: string
          destination: string
          driver_id: string | null
          id: string
          notes: string
          status: Database["public"]["Enums"]["trip_status"]
          vehicle_id: string | null
        }
        Insert: {
          consult_location?: string
          created_at?: string
          date: string
          departure_time?: string
          destination?: string
          driver_id?: string | null
          id?: string
          notes?: string
          status?: Database["public"]["Enums"]["trip_status"]
          vehicle_id?: string | null
        }
        Update: {
          consult_location?: string
          created_at?: string
          date?: string
          departure_time?: string
          destination?: string
          driver_id?: string | null
          id?: string
          notes?: string
          status?: Database["public"]["Enums"]["trip_status"]
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trips_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
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
      vehicles: {
        Row: {
          ano: number | null
          capacity: number
          chassi: string
          created_at: string
          id: string
          modelo: string
          plate: string
          renavam: string
          status: Database["public"]["Enums"]["vehicle_status"]
          type: Database["public"]["Enums"]["vehicle_type"]
        }
        Insert: {
          ano?: number | null
          capacity?: number
          chassi?: string
          created_at?: string
          id?: string
          modelo?: string
          plate?: string
          renavam?: string
          status?: Database["public"]["Enums"]["vehicle_status"]
          type?: Database["public"]["Enums"]["vehicle_type"]
        }
        Update: {
          ano?: number | null
          capacity?: number
          chassi?: string
          created_at?: string
          id?: string
          modelo?: string
          plate?: string
          renavam?: string
          status?: Database["public"]["Enums"]["vehicle_status"]
          type?: Database["public"]["Enums"]["vehicle_type"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_drivers_summary: {
        Args: never
        Returns: {
          id: string
          name: string
        }[]
      }
      get_email_by_cpf: { Args: { _cpf: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "gestor" | "visualizador" | "motorista"
      maintenance_type: "preventiva" | "corretiva" | "emergencial"
      trip_status: "Confirmada" | "Cancelada" | "Concluída"
      vehicle_status: "Ativo" | "Manutenção" | "Inativo"
      vehicle_type: "Carro" | "Van" | "Ônibus"
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
      app_role: ["admin", "gestor", "visualizador", "motorista"],
      maintenance_type: ["preventiva", "corretiva", "emergencial"],
      trip_status: ["Confirmada", "Cancelada", "Concluída"],
      vehicle_status: ["Ativo", "Manutenção", "Inativo"],
      vehicle_type: ["Carro", "Van", "Ônibus"],
    },
  },
} as const
