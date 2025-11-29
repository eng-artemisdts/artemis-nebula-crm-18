export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_interaction_settings: Database["public"]["Tables"]["ai_interaction_settings"]
      company_documents: Database["public"]["Tables"]["company_documents"]
      lead_categories: Database["public"]["Tables"]["lead_categories"]
      leads: Database["public"]["Tables"]["leads"]
      organizations: Database["public"]["Tables"]["organizations"]
      profiles: Database["public"]["Tables"]["profiles"]
      settings: Database["public"]["Tables"]["settings"]
      whatsapp_instances: Database["public"]["Tables"]["whatsapp_instances"]
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_organization_id: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}


