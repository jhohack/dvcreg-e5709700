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
      admission: {
        Row: {
          academic_year: string | null
          address: string | null
          admission_status: string
          age: number | null
          civil_status: string | null
          contact: string | null
          course: string | null
          current_address: string | null
          date_created: string
          date_of_birth: string | null
          department: string
          elem_address: string | null
          elem_school: string | null
          elem_year: string | null
          email: string | null
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
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sec_address: string | null
          sec_parent_guardian: string | null
          sec_parent_guardian_address: string | null
          sec_parent_guardian_contact: string | null
          sec_parent_guardian_relation: string | null
          sec_school: string | null
          sec_year: string | null
          semester: string | null
          shs_track: string | null
          spouse_name: string | null
          student_information_id: string | null
          student_lrn: string | null
          tribe: string | null
          updated_at: string
          vaccination_status: string | null
          year_level: string | null
        }
        Insert: {
          academic_year?: string | null
          address?: string | null
          admission_status?: string
          age?: number | null
          civil_status?: string | null
          contact?: string | null
          course?: string | null
          current_address?: string | null
          date_created?: string
          date_of_birth?: string | null
          department?: string
          elem_address?: string | null
          elem_school?: string | null
          elem_year?: string | null
          email?: string | null
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
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sec_address?: string | null
          sec_parent_guardian?: string | null
          sec_parent_guardian_address?: string | null
          sec_parent_guardian_contact?: string | null
          sec_parent_guardian_relation?: string | null
          sec_school?: string | null
          sec_year?: string | null
          semester?: string | null
          shs_track?: string | null
          spouse_name?: string | null
          student_information_id?: string | null
          student_lrn?: string | null
          tribe?: string | null
          updated_at?: string
          vaccination_status?: string | null
          year_level?: string | null
        }
        Update: {
          academic_year?: string | null
          address?: string | null
          admission_status?: string
          age?: number | null
          civil_status?: string | null
          contact?: string | null
          course?: string | null
          current_address?: string | null
          date_created?: string
          date_of_birth?: string | null
          department?: string
          elem_address?: string | null
          elem_school?: string | null
          elem_year?: string | null
          email?: string | null
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
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sec_address?: string | null
          sec_parent_guardian?: string | null
          sec_parent_guardian_address?: string | null
          sec_parent_guardian_contact?: string | null
          sec_parent_guardian_relation?: string | null
          sec_school?: string | null
          sec_year?: string | null
          semester?: string | null
          shs_track?: string | null
          spouse_name?: string | null
          student_information_id?: string | null
          student_lrn?: string | null
          tribe?: string | null
          updated_at?: string
          vaccination_status?: string | null
          year_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admission_student_information_id_fkey"
            columns: ["student_information_id"]
            isOneToOne: false
            referencedRelation: "student_information"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_lines: {
        Row: {
          amount: number
          assessment_id: string
          description: string
          fee_item_id: string | null
          id: string
          line_total: number
          qty: number
        }
        Insert: {
          amount?: number
          assessment_id: string
          description: string
          fee_item_id?: string | null
          id?: string
          line_total?: number
          qty?: number
        }
        Update: {
          amount?: number
          assessment_id?: string
          description?: string
          fee_item_id?: string | null
          id?: string
          line_total?: number
          qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_lines_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_lines_fee_item_id_fkey"
            columns: ["fee_item_id"]
            isOneToOne: false
            referencedRelation: "fee_items"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          created_at: string
          discount_total: number
          gross_total: number
          id: string
          net_total: number
          school_year_id: string
          status: string
          student_enrollment_id: string
          term: string
        }
        Insert: {
          created_at?: string
          discount_total?: number
          gross_total?: number
          id?: string
          net_total?: number
          school_year_id: string
          status?: string
          student_enrollment_id: string
          term: string
        }
        Update: {
          created_at?: string
          discount_total?: number
          gross_total?: number
          id?: string
          net_total?: number
          school_year_id?: string
          status?: string
          student_enrollment_id?: string
          term?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_school_year_id_fkey"
            columns: ["school_year_id"]
            isOneToOne: false
            referencedRelation: "school_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_student_enrollment_id_fkey"
            columns: ["student_enrollment_id"]
            isOneToOne: false
            referencedRelation: "student_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_table: string
          id: string
          metadata: Json | null
          performed_by: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_table: string
          id?: string
          metadata?: Json | null
          performed_by?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_table?: string
          id?: string
          metadata?: Json | null
          performed_by?: string | null
        }
        Relationships: []
      }
      curricula: {
        Row: {
          academic_year: string
          copied_from_curriculum_id: string | null
          created_at: string
          created_by: string | null
          curriculum_name: string
          curriculum_version: string
          department: string
          id: string
          program_id: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          academic_year: string
          copied_from_curriculum_id?: string | null
          created_at?: string
          created_by?: string | null
          curriculum_name: string
          curriculum_version: string
          department: string
          id?: string
          program_id: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          academic_year?: string
          copied_from_curriculum_id?: string | null
          created_at?: string
          created_by?: string | null
          curriculum_name?: string
          curriculum_version?: string
          department?: string
          id?: string
          program_id?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "curricula_copied_from_curriculum_id_fkey"
            columns: ["copied_from_curriculum_id"]
            isOneToOne: false
            referencedRelation: "curricula"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curricula_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "system_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_subjects: {
        Row: {
          created_at: string
          curriculum_id: string
          id: string
          semester: string
          sort_order: number
          subject_id: string
          updated_at: string
          year_level: string
        }
        Insert: {
          created_at?: string
          curriculum_id: string
          id?: string
          semester: string
          sort_order?: number
          subject_id: string
          updated_at?: string
          year_level: string
        }
        Update: {
          created_at?: string
          curriculum_id?: string
          id?: string
          semester?: string
          sort_order?: number
          subject_id?: string
          updated_at?: string
          year_level?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_subjects_curriculum_id_fkey"
            columns: ["curriculum_id"]
            isOneToOne: false
            referencedRelation: "curricula"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollment_periods: {
        Row: {
          created_at: string
          end_date: string
          id: string
          school_year_id: string
          start_date: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          school_year_id: string
          start_date: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          school_year_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_periods_school_year_id_fkey"
            columns: ["school_year_id"]
            isOneToOne: true
            referencedRelation: "school_years"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          address: string | null
          birthdate: string | null
          contact_number: string | null
          division: string
          email: string | null
          fees: Json | null
          full_name: string
          gender: string | null
          id: string
          level: string
          payment_status: string
          program: string
          remarks: string | null
          school_id: string
          school_year: string
          semester: string
          status: string
          student_id: string | null
          student_type: string
          subjects: Json
          units: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          birthdate?: string | null
          contact_number?: string | null
          division?: string
          email?: string | null
          fees?: Json | null
          full_name?: string
          gender?: string | null
          id?: string
          level?: string
          payment_status?: string
          program?: string
          remarks?: string | null
          school_id?: string
          school_year?: string
          semester?: string
          status?: string
          student_id?: string | null
          student_type?: string
          subjects?: Json
          units?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          birthdate?: string | null
          contact_number?: string | null
          division?: string
          email?: string | null
          fees?: Json | null
          full_name?: string
          gender?: string | null
          id?: string
          level?: string
          payment_status?: string
          program?: string
          remarks?: string | null
          school_id?: string
          school_year?: string
          semester?: string
          status?: string
          student_id?: string | null
          student_type?: string
          subjects?: Json
          units?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_information"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_weeks: {
        Row: {
          created_at: string
          end_date: string
          id: string
          school_year_id: string
          start_date: string
          term: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          school_year_id: string
          start_date: string
          term: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          school_year_id?: string
          start_date?: string
          term?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_weeks_school_year_id_fkey"
            columns: ["school_year_id"]
            isOneToOne: false
            referencedRelation: "school_years"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category_id: string | null
          category_name: string
          created_at: string
          description: string | null
          expense_date: string
          id: string
          method: string
          reference_no: string | null
          vendor: string | null
        }
        Insert: {
          amount?: number
          category_id?: string | null
          category_name: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          method?: string
          reference_no?: string | null
          vendor?: string | null
        }
        Update: {
          amount?: number
          category_id?: string | null
          category_name?: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          method?: string
          reference_no?: string | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_group_items: {
        Row: {
          amount: number
          created_at: string
          fee_group_id: string
          fee_item_id: string
          id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          fee_group_id: string
          fee_item_id: string
          id?: string
        }
        Update: {
          amount?: number
          created_at?: string
          fee_group_id?: string
          fee_item_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_group_items_fee_group_id_fkey"
            columns: ["fee_group_id"]
            isOneToOne: false
            referencedRelation: "fee_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_group_items_fee_item_id_fkey"
            columns: ["fee_item_id"]
            isOneToOne: false
            referencedRelation: "fee_items"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_groups: {
        Row: {
          course_key: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          course_key: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          course_key?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      fee_items: {
        Row: {
          calculate_per_unit: boolean
          category: string | null
          code: string
          created_at: string
          default_amount: number
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          calculate_per_unit?: boolean
          category?: string | null
          code: string
          created_at?: string
          default_amount?: number
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          calculate_per_unit?: boolean
          category?: string | null
          code?: string
          created_at?: string
          default_amount?: number
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          assessment_id: string
          created_at: string
          id: string
          method: string
          notes: string | null
          payment_date: string
          reference_no: string | null
          status: string
          student_enrollment_id: string
        }
        Insert: {
          amount: number
          assessment_id: string
          created_at?: string
          id?: string
          method: string
          notes?: string | null
          payment_date?: string
          reference_no?: string | null
          status?: string
          student_enrollment_id: string
        }
        Update: {
          amount?: number
          assessment_id?: string
          created_at?: string
          id?: string
          method?: string
          notes?: string | null
          payment_date?: string
          reference_no?: string | null
          status?: string
          student_enrollment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_enrollment_id_fkey"
            columns: ["student_enrollment_id"]
            isOneToOne: false
            referencedRelation: "student_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          id: string
          issued_at: string
          payment_id: string
          printed_count: number
          receipt_no: string
        }
        Insert: {
          id?: string
          issued_at?: string
          payment_id: string
          printed_count?: number
          receipt_no: string
        }
        Update: {
          id?: string
          issued_at?: string
          payment_id?: string
          printed_count?: number
          receipt_no?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_verifications: {
        Row: {
          attempt_count: number
          code_hash: string
          created_at: string
          email: string
          expires_at: string
          id: string
          legacy_payload: Json
          payload: Json
          resend_count: number
          updated_at: string
          used_at: string | null
          verified_at: string | null
        }
        Insert: {
          attempt_count?: number
          code_hash: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          legacy_payload: Json
          payload: Json
          resend_count?: number
          updated_at?: string
          used_at?: string | null
          verified_at?: string | null
        }
        Update: {
          attempt_count?: number
          code_hash?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          legacy_payload?: Json
          payload?: Json
          resend_count?: number
          updated_at?: string
          used_at?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      school_years: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      student_enrollments: {
        Row: {
          course: string | null
          created_at: string
          id: string
          number_of_units: number
          overpayment_last_semester: number
          previous_balance: number
          rolled_over_into_enrollment_id: string | null
          school_year_id: string
          semester: string | null
          status: string
          strand: string | null
          student_profile_id: string
          year_level: string | null
        }
        Insert: {
          course?: string | null
          created_at?: string
          id?: string
          number_of_units?: number
          overpayment_last_semester?: number
          previous_balance?: number
          rolled_over_into_enrollment_id?: string | null
          school_year_id: string
          semester?: string | null
          status?: string
          strand?: string | null
          student_profile_id: string
          year_level?: string | null
        }
        Update: {
          course?: string | null
          created_at?: string
          id?: string
          number_of_units?: number
          overpayment_last_semester?: number
          previous_balance?: number
          rolled_over_into_enrollment_id?: string | null
          school_year_id?: string
          semester?: string | null
          status?: string
          strand?: string | null
          student_profile_id?: string
          year_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_enrollments_rolled_over_into_enrollment_id_fkey"
            columns: ["rolled_over_into_enrollment_id"]
            isOneToOne: false
            referencedRelation: "student_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_enrollments_school_year_id_fkey"
            columns: ["school_year_id"]
            isOneToOne: false
            referencedRelation: "school_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_enrollments_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_information: {
        Row: {
          academic_year: string | null
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
          email: string | null
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
          semester: string | null
          shs_track: string | null
          spouse_name: string | null
          student_lrn: string | null
          student_school_id: string
          tribe: string | null
          vaccination_status: string | null
          year_level: string | null
        }
        Insert: {
          academic_year?: string | null
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
          email?: string | null
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
          semester?: string | null
          shs_track?: string | null
          spouse_name?: string | null
          student_lrn?: string | null
          student_school_id: string
          tribe?: string | null
          vaccination_status?: string | null
          year_level?: string | null
        }
        Update: {
          academic_year?: string | null
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
          email?: string | null
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
          semester?: string | null
          shs_track?: string | null
          spouse_name?: string | null
          student_lrn?: string | null
          student_school_id?: string
          tribe?: string | null
          vaccination_status?: string | null
          year_level?: string | null
        }
        Relationships: []
      }
      student_profiles: {
        Row: {
          created_at: string
          first_name: string
          id: string
          last_name: string
          middle_name: string | null
          student_no: string
        }
        Insert: {
          created_at?: string
          first_name: string
          id?: string
          last_name: string
          middle_name?: string | null
          student_no: string
        }
        Update: {
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          middle_name?: string | null
          student_no?: string
        }
        Relationships: []
      }
      subject_coverages: {
        Row: {
          created_at: string
          id: string
          program_id: string
          subject_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          program_id: string
          subject_id: string
        }
        Update: {
          created_at?: string
          id?: string
          program_id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_coverages_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "system_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_coverages_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_prerequisites: {
        Row: {
          created_at: string
          id: string
          prerequisite_subject_id: string
          subject_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          prerequisite_subject_id: string
          subject_id: string
        }
        Update: {
          created_at?: string
          id?: string
          prerequisite_subject_id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_prerequisites_prerequisite_subject_id_fkey"
            columns: ["prerequisite_subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_prerequisites_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string
          coverage_mode: string
          created_at: string
          created_by: string | null
          curriculum_label: string | null
          default_semester: string | null
          default_year_level: string | null
          description: string
          id: string
          status: string
          subject_type: string
          units: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          coverage_mode: string
          created_at?: string
          created_by?: string | null
          curriculum_label?: string | null
          default_semester?: string | null
          default_year_level?: string | null
          description: string
          id?: string
          status?: string
          subject_type: string
          units: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          coverage_mode?: string
          created_at?: string
          created_by?: string | null
          curriculum_label?: string | null
          default_semester?: string | null
          default_year_level?: string | null
          description?: string
          id?: string
          status?: string
          subject_type?: string
          units?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      system_academic_settings: {
        Row: {
          current_academic_year: string
          current_semester: string
          singleton: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          current_academic_year: string
          current_semester: string
          singleton?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          current_academic_year?: string
          current_semester?: string
          singleton?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      system_academic_settings_history: {
        Row: {
          academic_year: string
          changed_at: string
          changed_by: string | null
          id: string
          semester: string
        }
        Insert: {
          academic_year: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          semester: string
        }
        Update: {
          academic_year?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          semester?: string
        }
        Relationships: []
      }
      system_program_levels: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          level_name: string
          program_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          level_name: string
          program_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          level_name?: string
          program_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "system_program_levels_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "system_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      system_programs: {
        Row: {
          created_at: string
          created_by: string | null
          education_level: string
          id: string
          program_name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          education_level: string
          id?: string
          program_name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          education_level?: string
          id?: string
          program_name?: string
          updated_at?: string
          updated_by?: string | null
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
          role: Database["public"]["Enums"]["app_role"]
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
      withdrawal_charge_rules: {
        Row: {
          charge_type: string
          created_at: string
          id: string
          label: string
          rule_order: number
          school_year_id: string
          up_to_term: string | null
        }
        Insert: {
          charge_type: string
          created_at?: string
          id?: string
          label: string
          rule_order: number
          school_year_id: string
          up_to_term?: string | null
        }
        Update: {
          charge_type?: string
          created_at?: string
          id?: string
          label?: string
          rule_order?: number
          school_year_id?: string
          up_to_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_charge_rules_school_year_id_fkey"
            columns: ["school_year_id"]
            isOneToOne: false
            referencedRelation: "school_years"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_records: {
        Row: {
          balance_due: number
          charge_amount: number
          charge_basis: string | null
          created_at: string
          id: string
          notes: string | null
          school_year_id: string
          student_enrollment_id: string
          total_paid: number
          withdrawal_date: string
        }
        Insert: {
          balance_due?: number
          charge_amount?: number
          charge_basis?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          school_year_id: string
          student_enrollment_id: string
          total_paid?: number
          withdrawal_date?: string
        }
        Update: {
          balance_due?: number
          charge_amount?: number
          charge_basis?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          school_year_id?: string
          student_enrollment_id?: string
          total_paid?: number
          withdrawal_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_records_school_year_id_fkey"
            columns: ["school_year_id"]
            isOneToOne: false
            referencedRelation: "school_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_records_student_enrollment_id_fkey"
            columns: ["student_enrollment_id"]
            isOneToOne: false
            referencedRelation: "student_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_exam_week_student_status: { Args: never; Returns: undefined }
      compute_student_enrollment_rollover_balance: {
        Args: { _student_enrollment_id: string }
        Returns: number
      }
      create_system_program: {
        Args: {
          education_level_input: string
          levels_input: string[]
          program_name_input: string
          updated_by_input?: string
        }
        Returns: {
          created_at: string
          created_by: string | null
          education_level: string
          id: string
          program_name: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "system_programs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_system_program: {
        Args: { program_id_input: string }
        Returns: {
          created_at: string
          created_by: string | null
          education_level: string
          id: string
          program_name: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "system_programs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      generate_student_school_id: {
        Args: { target_year?: number }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      manually_assess_student: {
        Args: { _student_enrollment_id: string }
        Returns: undefined
      }
      recompute_term_assessment_closure: {
        Args: { _student_enrollment_id: string }
        Returns: undefined
      }
      reenroll_student_profile: {
        Args: {
          _course: string
          _number_of_units?: number
          _semester: string
          _status?: string
          _strand: string
          _student_profile_id: string
          _year_level: string
        }
        Returns: string
      }
      resolve_student_contact_email: {
        Args: { legacy_contact: string; primary_email: string }
        Returns: string
      }
      review_admission: {
        Args: {
          admission_id_input: string
          decision_input: string
          review_notes_input?: string
          reviewed_by_input?: string
        }
        Returns: {
          academic_year: string | null
          address: string | null
          admission_status: string
          age: number | null
          civil_status: string | null
          contact: string | null
          course: string | null
          current_address: string | null
          date_created: string
          date_of_birth: string | null
          department: string
          elem_address: string | null
          elem_school: string | null
          elem_year: string | null
          email: string | null
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
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sec_address: string | null
          sec_parent_guardian: string | null
          sec_parent_guardian_address: string | null
          sec_parent_guardian_contact: string | null
          sec_parent_guardian_relation: string | null
          sec_school: string | null
          sec_year: string | null
          semester: string | null
          shs_track: string | null
          spouse_name: string | null
          student_information_id: string | null
          student_lrn: string | null
          tribe: string | null
          updated_at: string
          vaccination_status: string | null
          year_level: string | null
        }
        SetofOptions: {
          from: "*"
          to: "admission"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_curriculum_structure: {
        Args: {
          academic_year_input?: string
          copied_from_curriculum_id_input?: string
          curriculum_id_input?: string
          curriculum_name_input?: string
          curriculum_version_input?: string
          department_input?: string
          placements_input?: Json
          program_id_input?: string
          status_input?: string
          updated_by_input?: string
        }
        Returns: {
          academic_year: string
          copied_from_curriculum_id: string | null
          created_at: string
          created_by: string | null
          curriculum_name: string
          curriculum_version: string
          department: string
          id: string
          program_id: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "curricula"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_subject_catalog_entry: {
        Args: {
          code_input?: string
          coverage_mode_input?: string
          coverage_program_ids_input?: string[]
          curriculum_label_input?: string
          default_semester_input?: string
          default_year_level_input?: string
          description_input?: string
          prerequisite_subject_ids_input?: string[]
          status_input?: string
          subject_id_input?: string
          subject_type_input?: string
          units_input?: number
          updated_by_input?: string
        }
        Returns: {
          code: string
          coverage_mode: string
          created_at: string
          created_by: string | null
          curriculum_label: string | null
          default_semester: string | null
          default_year_level: string | null
          description: string
          id: string
          status: string
          subject_type: string
          units: number
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "subjects"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_global_academic_settings: {
        Args: {
          academic_year_input: string
          semester_input: string
          updated_by_input?: string
        }
        Returns: {
          current_academic_year: string
          current_semester: string
          singleton: boolean
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "system_academic_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      sync_student_enrollment_completion_status: {
        Args: { _student_enrollment_id: string }
        Returns: undefined
      }
      update_system_program: {
        Args: {
          levels_input: string[]
          program_id_input: string
          program_name_input: string
          updated_by_input?: string
        }
        Returns: {
          created_at: string
          created_by: string | null
          education_level: string
          id: string
          program_name: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "system_programs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "superadmin" | "admin" | "user"
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
      app_role: ["superadmin", "admin", "user"],
    },
  },
} as const
