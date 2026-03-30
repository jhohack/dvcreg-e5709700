export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type StudentInformationTable = {
  Row: {
    address: string | null
    age: number | null
    civil_status: string | null
    contact: string | null
    course: string | null
    current_address: string | null
    date_created: string
    date_of_birth: string | null
    department: string | null
    elem_address: string | null
    elem_school: string | null
    elem_year: string | null
    facebook_link: string | null
    father_contact: string | null
    father_first_name: string | null
    father_last_name: string | null
    father_middle_name: string | null
    father_name: string | null
    father_occupation: string | null
    first_name: string
    gender: string | null
    id: string
    income_sources: string | null
    last_name: string
    last_school: string | null
    last_school_address: string | null
    last_school_year: string | null
    middle_name: string | null
    monthly_income: number | null
    mother_contact: string | null
    mother_first_name: string | null
    mother_last_name: string | null
    mother_middle_name: string | null
    mother_name: string | null
    mother_occupation: string | null
    nationality: string | null
    other_income: string | null
    parent_guardian: string | null
    parent_guardian_address: string | null
    parent_guardian_contact: string | null
    parent_guardian_relation: string | null
    parent_marital_status: string | null
    place_of_birth: string | null
    religion: string | null
    sec_address: string | null
    sec_parent_guardian: string | null
    sec_parent_guardian_address: string | null
    sec_parent_guardian_contact: string | null
    sec_parent_guardian_relation: string | null
    sec_school: string | null
    sec_year: string | null
    shs_track: string | null
    spouse_name: string | null
    student_lrn: string | null
    tribe: string | null
    vaccination_status: string | null
    year_level: string | null
  }
  Insert: {
    address?: string | null
    age?: number | null
    civil_status?: string | null
    contact?: string | null
    course?: string | null
    current_address?: string | null
    date_created?: string
    date_of_birth?: string | null
    department?: string | null
    elem_address?: string | null
    elem_school?: string | null
    elem_year?: string | null
    facebook_link?: string | null
    father_contact?: string | null
    father_first_name?: string | null
    father_last_name?: string | null
    father_middle_name?: string | null
    father_name?: string | null
    father_occupation?: string | null
    first_name: string
    gender?: string | null
    id?: string
    income_sources?: string | null
    last_name: string
    last_school?: string | null
    last_school_address?: string | null
    last_school_year?: string | null
    middle_name?: string | null
    monthly_income?: number | null
    mother_contact?: string | null
    mother_first_name?: string | null
    mother_last_name?: string | null
    mother_middle_name?: string | null
    mother_name?: string | null
    mother_occupation?: string | null
    nationality?: string | null
    other_income?: string | null
    parent_guardian?: string | null
    parent_guardian_address?: string | null
    parent_guardian_contact?: string | null
    parent_guardian_relation?: string | null
    parent_marital_status?: string | null
    place_of_birth?: string | null
    religion?: string | null
    sec_address?: string | null
    sec_parent_guardian?: string | null
    sec_parent_guardian_address?: string | null
    sec_parent_guardian_contact?: string | null
    sec_parent_guardian_relation?: string | null
    sec_school?: string | null
    sec_year?: string | null
    shs_track?: string | null
    spouse_name?: string | null
    student_lrn?: string | null
    tribe?: string | null
    vaccination_status?: string | null
    year_level?: string | null
  }
  Update: {
    address?: string | null
    age?: number | null
    civil_status?: string | null
    contact?: string | null
    course?: string | null
    current_address?: string | null
    date_created?: string
    date_of_birth?: string | null
    department?: string | null
    elem_address?: string | null
    elem_school?: string | null
    elem_year?: string | null
    facebook_link?: string | null
    father_contact?: string | null
    father_first_name?: string | null
    father_last_name?: string | null
    father_middle_name?: string | null
    father_name?: string | null
    father_occupation?: string | null
    first_name?: string
    gender?: string | null
    id?: string
    income_sources?: string | null
    last_name?: string
    last_school?: string | null
    last_school_address?: string | null
    last_school_year?: string | null
    middle_name?: string | null
    monthly_income?: number | null
    mother_contact?: string | null
    mother_first_name?: string | null
    mother_last_name?: string | null
    mother_middle_name?: string | null
    mother_name?: string | null
    mother_occupation?: string | null
    nationality?: string | null
    other_income?: string | null
    parent_guardian?: string | null
    parent_guardian_address?: string | null
    parent_guardian_contact?: string | null
    parent_guardian_relation?: string | null
    parent_marital_status?: string | null
    place_of_birth?: string | null
    religion?: string | null
    sec_address?: string | null
    sec_parent_guardian?: string | null
    sec_parent_guardian_address?: string | null
    sec_parent_guardian_contact?: string | null
    sec_parent_guardian_relation?: string | null
    sec_school?: string | null
    sec_year?: string | null
    shs_track?: string | null
    spouse_name?: string | null
    student_lrn?: string | null
    tribe?: string | null
    vaccination_status?: string | null
    year_level?: string | null
  }
  Relationships: []
}

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admission: StudentInformationTable
      student_information: StudentInformationTable
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
