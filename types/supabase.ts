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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      _backup_graduated_csr: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          coach_id: number | null
          id: number | null
          student_id: number | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          coach_id?: number | null
          id?: number | null
          student_id?: number | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          coach_id?: number | null
          id?: number | null
          student_id?: number | null
        }
        Relationships: []
      }
      _backup_graduated_pcr: {
        Row: {
          created_at: string | null
          id: number | null
          parent_id: number | null
          relation_type: string | null
          student_id: number | null
        }
        Insert: {
          created_at?: string | null
          id?: number | null
          parent_id?: number | null
          relation_type?: string | null
          student_id?: number | null
        }
        Update: {
          created_at?: string | null
          id?: number | null
          parent_id?: number | null
          relation_type?: string | null
          student_id?: number | null
        }
        Relationships: []
      }
      admins: {
        Row: {
          created_at: string
          full_name: string
          id: number
          invitation_code: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: number
          invitation_code: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: number
          invitation_code?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_sender_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_cache: {
        Row: {
          cache_key: string
          cache_type: string
          cached_content: string
          created_at: string
          entity_id: string
          first_generated_at: string
          hit_count: number
          id: number
          langfuse_trace_id: string | null
          last_accessed_at: string
          student_id: number | null
          updated_at: string
        }
        Insert: {
          cache_key: string
          cache_type: string
          cached_content: string
          created_at?: string
          entity_id?: string
          first_generated_at?: string
          hit_count?: number
          id?: number
          langfuse_trace_id?: string | null
          last_accessed_at?: string
          student_id?: number | null
          updated_at?: string
        }
        Update: {
          cache_key?: string
          cache_type?: string
          cached_content?: string
          created_at?: string
          entity_id?: string
          first_generated_at?: string
          hit_count?: number
          id?: number
          langfuse_trace_id?: string | null
          last_accessed_at?: string
          student_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_cache_langfuse_trace_id_fkey"
            columns: ["langfuse_trace_id"]
            isOneToOne: false
            referencedRelation: "langfuse_traces"
            referencedColumns: ["trace_id"]
          },
          {
            foreignKeyName: "ai_cache_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      answer_sessions: {
        Row: {
          answers_revealed: boolean
          attempt_number: number
          completed_at: string | null
          created_at: string
          id: number
          is_latest: boolean
          max_score: number | null
          question_set_id: number
          started_at: string
          status: string
          student_id: number
          total_score: number | null
        }
        Insert: {
          answers_revealed?: boolean
          attempt_number?: number
          completed_at?: string | null
          created_at?: string
          id?: number
          is_latest?: boolean
          max_score?: number | null
          question_set_id: number
          started_at?: string
          status?: string
          student_id: number
          total_score?: number | null
        }
        Update: {
          answers_revealed?: boolean
          attempt_number?: number
          completed_at?: string | null
          created_at?: string
          id?: number
          is_latest?: boolean
          max_score?: number | null
          question_set_id?: number
          started_at?: string
          status?: string
          student_id?: number
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "answer_sessions_question_set_id_fkey"
            columns: ["question_set_id"]
            isOneToOne: false
            referencedRelation: "question_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answer_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_masters: {
        Row: {
          assessment_type: string
          attempt_number: number
          created_at: string
          grade: string
          id: string
          max_score: number
          session_number: number
          title: string | null
        }
        Insert: {
          assessment_type: string
          attempt_number: number
          created_at?: string
          grade: string
          id?: string
          max_score: number
          session_number: number
          title?: string | null
        }
        Update: {
          assessment_type?: string
          attempt_number?: number
          created_at?: string
          grade?: string
          id?: string
          max_score?: number
          session_number?: number
          title?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          created_at: string
          id: number
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          operation: string
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
          user_role: Database["public"]["Enums"]["user_role"] | null
        }
        Insert: {
          created_at?: string
          id?: number
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          operation: string
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
          user_role?: Database["public"]["Enums"]["user_role"] | null
        }
        Update: {
          created_at?: string
          id?: number
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          operation?: string
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
          user_role?: Database["public"]["Enums"]["user_role"] | null
        }
        Relationships: []
      }
      class_assessments: {
        Row: {
          assessment_date: string
          created_at: string
          grade_at_submission: string
          grader_id: string
          id: string
          is_resubmission: boolean
          master_id: string
          max_score_at_submission: number
          modified_by: string | null
          score: number | null
          source: string
          status: Database["public"]["Enums"]["assessment_status"]
          student_id: number
          updated_at: string
        }
        Insert: {
          assessment_date: string
          created_at?: string
          grade_at_submission: string
          grader_id: string
          id?: string
          is_resubmission?: boolean
          master_id: string
          max_score_at_submission: number
          modified_by?: string | null
          score?: number | null
          source?: string
          status?: Database["public"]["Enums"]["assessment_status"]
          student_id: number
          updated_at?: string
        }
        Update: {
          assessment_date?: string
          created_at?: string
          grade_at_submission?: string
          grader_id?: string
          id?: string
          is_resubmission?: boolean
          master_id?: string
          max_score_at_submission?: number
          modified_by?: string | null
          score?: number | null
          source?: string
          status?: Database["public"]["Enums"]["assessment_status"]
          student_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_assessments_master_id_fkey"
            columns: ["master_id"]
            isOneToOne: false
            referencedRelation: "assessment_masters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_assessments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_feedbacks: {
        Row: {
          batch_id: string | null
          created_at: string | null
          feedback_text: string
          id: number
          langfuse_trace_id: string | null
          prompt_hash: string | null
          prompt_version: string
          session_id: number
          student_id: number
          study_log_id: number
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          feedback_text: string
          id?: number
          langfuse_trace_id?: string | null
          prompt_hash?: string | null
          prompt_version: string
          session_id: number
          student_id: number
          study_log_id: number
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          feedback_text?: string
          id?: number
          langfuse_trace_id?: string | null
          prompt_hash?: string | null
          prompt_version?: string
          session_id?: number
          student_id?: number
          study_log_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "coach_feedbacks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_feedbacks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_feedbacks_study_log_id_fkey"
            columns: ["study_log_id"]
            isOneToOne: false
            referencedRelation: "study_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_student_relations: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          coach_id: number
          id: number
          student_id: number
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          coach_id: number
          id?: number
          student_id: number
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          coach_id?: number
          id?: number
          student_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "coach_student_relations_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_student_relations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      coaches: {
        Row: {
          created_at: string
          full_name: string
          furigana: string | null
          id: number
          invitation_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          furigana?: string | null
          id?: number
          invitation_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          furigana?: string | null
          id?: number
          invitation_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_sender_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_messages: {
        Row: {
          content: string
          created_at: string
          id: number
          langfuse_trace_id: string | null
          role: string
          sent_at: string
          session_id: number
          turn_number: number
        }
        Insert: {
          content: string
          created_at?: string
          id?: number
          langfuse_trace_id?: string | null
          role: string
          sent_at?: string
          session_id: number
          turn_number: number
        }
        Update: {
          content?: string
          created_at?: string
          id?: number
          langfuse_trace_id?: string | null
          role?: string
          sent_at?: string
          session_id?: number
          turn_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "coaching_messages_langfuse_trace_id_fkey"
            columns: ["langfuse_trace_id"]
            isOneToOne: false
            referencedRelation: "langfuse_traces"
            referencedColumns: ["trace_id"]
          },
          {
            foreignKeyName: "coaching_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "coaching_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          id: number
          started_at: string
          status: string
          student_id: number
          summary_text: string | null
          total_turns: number | null
          updated_at: string
          week_end_date: string
          week_start_date: string
          week_type: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: number
          started_at?: string
          status?: string
          student_id: number
          summary_text?: string | null
          total_turns?: number | null
          updated_at?: string
          week_end_date: string
          week_start_date: string
          week_type?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: number
          started_at?: string
          status?: string
          student_id?: number
          summary_text?: string | null
          total_turns?: number | null
          updated_at?: string
          week_end_date?: string
          week_start_date?: string
          week_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coaching_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      encouragement_messages: {
        Row: {
          ai_cache_key: string | null
          created_at: string
          id: number
          is_ai_generated: boolean
          langfuse_trace_id: string | null
          message: string
          read_at: string | null
          related_study_log_id: number | null
          sender_id: string
          sender_role: Database["public"]["Enums"]["user_role"]
          sent_at: string
          student_id: number
          support_type: string
        }
        Insert: {
          ai_cache_key?: string | null
          created_at?: string
          id?: number
          is_ai_generated?: boolean
          langfuse_trace_id?: string | null
          message: string
          read_at?: string | null
          related_study_log_id?: number | null
          sender_id: string
          sender_role: Database["public"]["Enums"]["user_role"]
          sent_at?: string
          student_id: number
          support_type: string
        }
        Update: {
          ai_cache_key?: string | null
          created_at?: string
          id?: number
          is_ai_generated?: boolean
          langfuse_trace_id?: string | null
          message?: string
          read_at?: string | null
          related_study_log_id?: number | null
          sender_id?: string
          sender_role?: Database["public"]["Enums"]["user_role"]
          sent_at?: string
          student_id?: number
          support_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "encouragement_messages_langfuse_trace_id_fkey"
            columns: ["langfuse_trace_id"]
            isOneToOne: false
            referencedRelation: "langfuse_traces"
            referencedColumns: ["trace_id"]
          },
          {
            foreignKeyName: "encouragement_messages_related_study_log_id_fkey"
            columns: ["related_study_log_id"]
            isOneToOne: false
            referencedRelation: "study_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encouragement_messages_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: number
          role: Database["public"]["Enums"]["user_role"]
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: number
          role: Database["public"]["Enums"]["user_role"]
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: number
          role?: Database["public"]["Enums"]["user_role"]
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitation_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_sender_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_codes_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_codes_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "public_sender_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      langfuse_batch_runs: {
        Row: {
          batch_name: string
          completed_at: string | null
          created_at: string
          errors: Json | null
          id: string
          scores_created: number
          scores_sent: number
          started_at: string
        }
        Insert: {
          batch_name: string
          completed_at?: string | null
          created_at?: string
          errors?: Json | null
          id: string
          scores_created?: number
          scores_sent?: number
          started_at: string
        }
        Update: {
          batch_name?: string
          completed_at?: string | null
          created_at?: string
          errors?: Json | null
          id?: string
          scores_created?: number
          scores_sent?: number
          started_at?: string
        }
        Relationships: []
      }
      langfuse_scores: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          metadata: Json | null
          score_name: string
          sent_at: string | null
          status: string
          trace_id: string
          value: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          score_name: string
          sent_at?: string | null
          status?: string
          trace_id: string
          value: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          score_name?: string
          sent_at?: string | null
          status?: string
          trace_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "langfuse_scores_trace_id_fkey"
            columns: ["trace_id"]
            isOneToOne: false
            referencedRelation: "langfuse_traces"
            referencedColumns: ["trace_id"]
          },
        ]
      }
      langfuse_traces: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          input: string
          metadata: Json | null
          output: string
          tags: string[] | null
          trace_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          input: string
          metadata?: Json | null
          output: string
          tags?: string[] | null
          trace_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          input?: string
          metadata?: Json | null
          output?: string
          tags?: string[] | null
          trace_id?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          expires_at: string | null
          id: number
          is_read: boolean
          notification_type: string
          read_at: string | null
          related_entity_id: number | null
          related_entity_type: string | null
          sent_at: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          expires_at?: string | null
          id?: number
          is_read?: boolean
          notification_type: string
          read_at?: string | null
          related_entity_id?: number | null
          related_entity_type?: string | null
          sent_at?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          expires_at?: string | null
          id?: number
          is_read?: boolean
          notification_type?: string
          read_at?: string | null
          related_entity_id?: number | null
          related_entity_type?: string | null
          sent_at?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      parent_child_relations: {
        Row: {
          created_at: string
          id: number
          parent_id: number
          relation_type: string | null
          student_id: number
        }
        Insert: {
          created_at?: string
          id?: number
          parent_id: number
          relation_type?: string | null
          student_id: number
        }
        Update: {
          created_at?: string
          id?: number
          parent_id?: number
          relation_type?: string | null
          student_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "parent_child_relations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_child_relations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      parents: {
        Row: {
          created_at: string
          full_name: string
          furigana: string | null
          id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          furigana?: string | null
          id?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          furigana?: string | null
          id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_sender_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      past_exam_results: {
        Row: {
          attempt_number: number
          created_at: string
          exam_type: string
          exam_year: number
          id: number
          reflection: string | null
          score: number
          student_id: number
          taken_at: string
          updated_at: string
        }
        Insert: {
          attempt_number: number
          created_at?: string
          exam_type: string
          exam_year: number
          id?: number
          reflection?: string | null
          score: number
          student_id: number
          taken_at?: string
          updated_at?: string
        }
        Update: {
          attempt_number?: number
          created_at?: string
          exam_type?: string
          exam_year?: number
          id?: number
          reflection?: string | null
          score?: number
          student_id?: number
          taken_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "past_exam_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      problem_counts: {
        Row: {
          created_at: string
          id: number
          session_id: number
          study_content_type_id: number
          total_problems: number
        }
        Insert: {
          created_at?: string
          id?: number
          session_id: number
          study_content_type_id: number
          total_problems: number
        }
        Update: {
          created_at?: string
          id?: number
          session_id?: number
          study_content_type_id?: number
          total_problems?: number
        }
        Relationships: [
          {
            foreignKeyName: "problem_counts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "problem_counts_study_content_type_id_fkey"
            columns: ["study_content_type_id"]
            isOneToOne: false
            referencedRelation: "study_content_types"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_id: string
          avatar_url: string | null
          created_at: string
          custom_avatar_url: string | null
          display_name: string | null
          id: string
          nickname: string
          role: Database["public"]["Enums"]["user_role"]
          setup_completed: boolean | null
          theme_color: string | null
          updated_at: string
        }
        Insert: {
          avatar_id: string
          avatar_url?: string | null
          created_at?: string
          custom_avatar_url?: string | null
          display_name?: string | null
          id: string
          nickname?: string
          role: Database["public"]["Enums"]["user_role"]
          setup_completed?: boolean | null
          theme_color?: string | null
          updated_at?: string
        }
        Update: {
          avatar_id?: string
          avatar_url?: string | null
          created_at?: string
          custom_avatar_url?: string | null
          display_name?: string | null
          id?: string
          nickname?: string
          role?: Database["public"]["Enums"]["user_role"]
          setup_completed?: boolean | null
          theme_color?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      question_sets: {
        Row: {
          assessment_master_id: string | null
          created_at: string
          created_by: string | null
          display_order: number
          grade: number
          id: number
          session_id: number
          status: string
          study_content_type_id: number | null
          subject_id: number
          title: string | null
          updated_at: string
        }
        Insert: {
          assessment_master_id?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          grade: number
          id?: number
          session_id: number
          status?: string
          study_content_type_id?: number | null
          subject_id: number
          title?: string | null
          updated_at?: string
        }
        Update: {
          assessment_master_id?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          grade?: number
          id?: number
          session_id?: number
          status?: string
          study_content_type_id?: number | null
          subject_id?: number
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_sets_assessment_master_id_fkey"
            columns: ["assessment_master_id"]
            isOneToOne: false
            referencedRelation: "assessment_masters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_sets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_sets_study_content_type_id_fkey"
            columns: ["study_content_type_id"]
            isOneToOne: false
            referencedRelation: "study_content_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_sets_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          answer_config: Json | null
          answer_type: string
          correct_answer: string | null
          created_at: string
          display_order: number
          id: number
          points: number
          question_number: string
          question_set_id: number
          section_name: string
          unit_label: string | null
        }
        Insert: {
          answer_config?: Json | null
          answer_type: string
          correct_answer?: string | null
          created_at?: string
          display_order: number
          id?: number
          points?: number
          question_number: string
          question_set_id: number
          section_name: string
          unit_label?: string | null
        }
        Update: {
          answer_config?: Json | null
          answer_type?: string
          correct_answer?: string | null
          created_at?: string
          display_order?: number
          id?: number
          points?: number
          question_number?: string
          question_set_id?: number
          section_name?: string
          unit_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_question_set_id_fkey"
            columns: ["question_set_id"]
            isOneToOne: false
            referencedRelation: "question_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_logs: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          request_count: number
          user_id: string
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          request_count?: number
          user_id: string
          window_start: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          request_count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      student_answers: {
        Row: {
          answer_session_id: number
          answer_value: string | null
          answered_at: string
          id: number
          is_correct: boolean | null
          question_id: number
          raw_input: string | null
          scored_at: string | null
        }
        Insert: {
          answer_session_id: number
          answer_value?: string | null
          answered_at?: string
          id?: number
          is_correct?: boolean | null
          question_id: number
          raw_input?: string | null
          scored_at?: string | null
        }
        Update: {
          answer_session_id?: number
          answer_value?: string | null
          answered_at?: string
          id?: number
          is_correct?: boolean | null
          question_id?: number
          raw_input?: string | null
          scored_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_answers_answer_session_id_fkey"
            columns: ["answer_session_id"]
            isOneToOne: false
            referencedRelation: "answer_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          course: Database["public"]["Enums"]["course_level"] | null
          created_at: string
          current_streak: number
          full_name: string
          furigana: string | null
          grade: number
          graduated_at: string | null
          id: number
          last_study_date: string | null
          login_id: string
          max_streak: number
          streak_updated_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          course?: Database["public"]["Enums"]["course_level"] | null
          created_at?: string
          current_streak?: number
          full_name: string
          furigana?: string | null
          grade: number
          graduated_at?: string | null
          id?: number
          last_study_date?: string | null
          login_id: string
          max_streak?: number
          streak_updated_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          course?: Database["public"]["Enums"]["course_level"] | null
          created_at?: string
          current_streak?: number
          full_name?: string
          furigana?: string | null
          grade?: number
          graduated_at?: string | null
          id?: number
          last_study_date?: string | null
          login_id?: string
          max_streak?: number
          streak_updated_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_sender_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_content_types: {
        Row: {
          content_name: string
          course: Database["public"]["Enums"]["course_level"]
          created_at: string
          display_order: number
          grade: number
          id: number
          subject_id: number
        }
        Insert: {
          content_name: string
          course: Database["public"]["Enums"]["course_level"]
          created_at?: string
          display_order: number
          grade: number
          id?: number
          subject_id: number
        }
        Update: {
          content_name?: string
          course?: Database["public"]["Enums"]["course_level"]
          created_at?: string
          display_order?: number
          grade?: number
          id?: number
          subject_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "study_content_types_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      study_logs: {
        Row: {
          batch_id: string | null
          correct_count: number
          created_at: string
          id: number
          logged_at: string
          reflection_text: string | null
          session_id: number
          student_id: number
          study_content_type_id: number
          study_date: string
          subject_id: number
          total_problems: number
          updated_at: string
          version: number
        }
        Insert: {
          batch_id?: string | null
          correct_count: number
          created_at?: string
          id?: number
          logged_at?: string
          reflection_text?: string | null
          session_id: number
          student_id: number
          study_content_type_id: number
          study_date?: string
          subject_id: number
          total_problems: number
          updated_at?: string
          version?: number
        }
        Update: {
          batch_id?: string | null
          correct_count?: number
          created_at?: string
          id?: number
          logged_at?: string
          reflection_text?: string | null
          session_id?: number
          student_id?: number
          study_content_type_id?: number
          study_date?: string
          subject_id?: number
          total_problems?: number
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "study_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_logs_study_content_type_id_fkey"
            columns: ["study_content_type_id"]
            isOneToOne: false
            referencedRelation: "study_content_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_logs_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sessions: {
        Row: {
          created_at: string
          end_date: string
          grade: number
          id: number
          session_number: number
          start_date: string
        }
        Insert: {
          created_at?: string
          end_date: string
          grade: number
          id?: number
          session_number: number
          start_date: string
        }
        Update: {
          created_at?: string
          end_date?: string
          grade?: number
          id?: number
          session_number?: number
          start_date?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          color_code: string | null
          created_at: string
          display_order: number
          id: number
          name: string
        }
        Insert: {
          color_code?: string | null
          created_at?: string
          display_order: number
          id?: number
          name: string
        }
        Update: {
          color_code?: string | null
          created_at?: string
          display_order?: number
          id?: number
          name?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string | null
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      test_goals: {
        Row: {
          ai_session_id: number | null
          commitment_text: string | null
          created_at: string
          goal_thoughts: string | null
          id: number
          japanese_target: number | null
          math_target: number | null
          science_target: number | null
          social_target: number | null
          student_id: number
          target_class: number | null
          target_course: string | null
          test_schedule_id: number
          total_target: number | null
          updated_at: string
        }
        Insert: {
          ai_session_id?: number | null
          commitment_text?: string | null
          created_at?: string
          goal_thoughts?: string | null
          id?: number
          japanese_target?: number | null
          math_target?: number | null
          science_target?: number | null
          social_target?: number | null
          student_id: number
          target_class?: number | null
          target_course?: string | null
          test_schedule_id: number
          total_target?: number | null
          updated_at?: string
        }
        Update: {
          ai_session_id?: number | null
          commitment_text?: string | null
          created_at?: string
          goal_thoughts?: string | null
          id?: number
          japanese_target?: number | null
          math_target?: number | null
          science_target?: number | null
          social_target?: number | null
          student_id?: number
          target_class?: number | null
          target_course?: string | null
          test_schedule_id?: number
          total_target?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_goals_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_goals_test_schedule_id_fkey"
            columns: ["test_schedule_id"]
            isOneToOne: false
            referencedRelation: "test_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      test_results: {
        Row: {
          created_at: string
          id: number
          japanese_deviation: number | null
          japanese_score: number | null
          math_deviation: number | null
          math_score: number | null
          result_class: number | null
          result_course: string | null
          result_entered_at: string
          science_deviation: number | null
          science_score: number | null
          social_deviation: number | null
          social_score: number | null
          student_id: number
          test_schedule_id: number
          total_deviation: number | null
          total_score: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          japanese_deviation?: number | null
          japanese_score?: number | null
          math_deviation?: number | null
          math_score?: number | null
          result_class?: number | null
          result_course?: string | null
          result_entered_at?: string
          science_deviation?: number | null
          science_score?: number | null
          social_deviation?: number | null
          social_score?: number | null
          student_id: number
          test_schedule_id: number
          total_deviation?: number | null
          total_score?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          japanese_deviation?: number | null
          japanese_score?: number | null
          math_deviation?: number | null
          math_score?: number | null
          result_class?: number | null
          result_course?: string | null
          result_entered_at?: string
          science_deviation?: number | null
          science_score?: number | null
          social_deviation?: number | null
          social_score?: number | null
          student_id?: number
          test_schedule_id?: number
          total_deviation?: number | null
          total_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_results_test_schedule_id_fkey"
            columns: ["test_schedule_id"]
            isOneToOne: false
            referencedRelation: "test_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      test_schedules: {
        Row: {
          created_at: string
          goal_setting_end_date: string
          goal_setting_start_date: string
          id: number
          result_entry_end_date: string | null
          result_entry_start_date: string | null
          test_date: string
          test_number: number
          test_type_id: number
        }
        Insert: {
          created_at?: string
          goal_setting_end_date: string
          goal_setting_start_date: string
          id?: number
          result_entry_end_date?: string | null
          result_entry_start_date?: string | null
          test_date: string
          test_number: number
          test_type_id: number
        }
        Update: {
          created_at?: string
          goal_setting_end_date?: string
          goal_setting_start_date?: string
          id?: number
          result_entry_end_date?: string | null
          result_entry_start_date?: string | null
          test_date?: string
          test_number?: number
          test_type_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "test_schedules_test_type_id_fkey"
            columns: ["test_type_id"]
            isOneToOne: false
            referencedRelation: "test_types"
            referencedColumns: ["id"]
          },
        ]
      }
      test_types: {
        Row: {
          created_at: string
          display_order: number
          grade: number
          id: number
          name: string
          type_category: string
        }
        Insert: {
          created_at?: string
          display_order: number
          grade: number
          id?: number
          name: string
          type_category: string
        }
        Update: {
          created_at?: string
          display_order?: number
          grade?: number
          id?: number
          name?: string
          type_category?: string
        }
        Relationships: []
      }
      user_events: {
        Row: {
          content_id: number | null
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: number
          langfuse_trace_id: string | null
          student_id: number | null
          user_id: string
          user_role: string
        }
        Insert: {
          content_id?: number | null
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: number
          langfuse_trace_id?: string | null
          student_id?: number | null
          user_id: string
          user_role: string
        }
        Update: {
          content_id?: number | null
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: number
          langfuse_trace_id?: string | null
          student_id?: number | null
          user_id?: string
          user_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_events_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_analysis: {
        Row: {
          advice: string | null
          challenges: string | null
          created_at: string
          generated_at: string
          generated_by_batch: boolean
          id: number
          langfuse_trace_id: string | null
          strengths: string | null
          student_id: number
          week_end_date: string
          week_start_date: string
        }
        Insert: {
          advice?: string | null
          challenges?: string | null
          created_at?: string
          generated_at?: string
          generated_by_batch?: boolean
          id?: number
          langfuse_trace_id?: string | null
          strengths?: string | null
          student_id: number
          week_end_date: string
          week_start_date: string
        }
        Update: {
          advice?: string | null
          challenges?: string | null
          created_at?: string
          generated_at?: string
          generated_by_batch?: boolean
          id?: number
          langfuse_trace_id?: string | null
          strengths?: string | null
          student_id?: number
          week_end_date?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_analysis_langfuse_trace_id_fkey"
            columns: ["langfuse_trace_id"]
            isOneToOne: false
            referencedRelation: "langfuse_traces"
            referencedColumns: ["trace_id"]
          },
          {
            foreignKeyName: "weekly_analysis_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      parent_students: {
        Row: {
          course: Database["public"]["Enums"]["course_level"] | null
          created_at: string | null
          full_name: string | null
          grade: number | null
          id: number | null
          login_id: string | null
          parent_id: number | null
          relation_type: string | null
          student_created_at: string | null
          student_id: number | null
          student_updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parent_child_relations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_child_relations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_sender_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      public_sender_profiles: {
        Row: {
          avatar_url: string | null
          display_name: string | null
          id: string | null
        }
        Insert: {
          avatar_url?: string | null
          display_name?: string | null
          id?: string | null
        }
        Update: {
          avatar_url?: string | null
          display_name?: string | null
          id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      begin_math_retry: {
        Args: { p_session_id: number; p_student_id: number }
        Returns: {
          answers_revealed: boolean
          attempt_number: number
          completed_at: string | null
          created_at: string
          id: number
          is_latest: boolean
          max_score: number | null
          question_set_id: number
          started_at: string
          status: string
          student_id: number
          total_score: number | null
        }
        SetofOptions: {
          from: "*"
          to: "answer_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cleanup_old_ai_cache: { Args: never; Returns: number }
      cleanup_old_audit_logs: { Args: never; Returns: number }
      cleanup_old_notifications: { Args: never; Returns: number }
      cleanup_old_weekly_analysis: { Args: never; Returns: number }
      create_notification: {
        Args: {
          p_body?: string
          p_expires_at?: string
          p_notification_type: string
          p_related_entity_id?: number
          p_related_entity_type?: string
          p_title: string
          p_user_id: string
        }
        Returns: number
      }
      current_coach_id: { Args: never; Returns: number }
      current_parent_id: { Args: never; Returns: number }
      current_student_id: { Args: never; Returns: number }
      generate_student_login_id: { Args: never; Returns: string }
      get_assigned_student_ids: { Args: never; Returns: number[] }
      get_assigned_students_user_ids: { Args: never; Returns: string[] }
      get_children_student_ids: { Args: never; Returns: number[] }
      get_children_user_ids: { Args: never; Returns: string[] }
      get_math_grading_history: {
        Args: { p_student_id: number }
        Returns: {
          attempt_history: Json
          display_order: number
          latest_answers_revealed: boolean
          latest_attempt_number: number
          latest_completed_at: string
          latest_max_score: number
          latest_session_id: number
          latest_status: string
          latest_total_score: number
          question_count: number
          question_set_id: number
          session_number: number
          title: string
        }[]
      }
      get_math_master_detail: {
        Args: { p_question_set_id: number }
        Returns: Json
      }
      get_math_master_summary: { Args: { p_grade: number }; Returns: Json }
      get_sender_profile: {
        Args: { sender_id: string }
        Returns: {
          avatar_id: string
          avatar_url: string
          custom_avatar_url: string
          display_name: string
          id: string
          nickname: string
        }[]
      }
      get_sender_profiles: {
        Args: { sender_ids: string[] }
        Returns: {
          avatar_id: string
          avatar_url: string
          custom_avatar_url: string
          display_name: string
          id: string
          nickname: string
        }[]
      }
      get_study_logs_for_encouragement: {
        Args: {
          p_has_encouragement?: string
          p_limit?: number
          p_offset?: number
          p_sort_by?: string
          p_sort_order?: string
          p_student_id: number
          p_subject_id?: number
        }
        Returns: {
          batch_id: string
          content_name: string
          correct_count: number
          created_at: string
          has_encouragement: boolean
          id: number
          logged_at: string
          reflection_text: string
          session_grade: number
          session_id: number
          session_number: number
          student_id: number
          study_content_type_id: number
          study_date: string
          subject_id: number
          subject_name: string
          total_count: number
          total_problems: number
        }[]
      }
      is_encouragement_sender_for_current_user: {
        Args: { profile_id: string }
        Returns: boolean
      }
      lock_answer_session: {
        Args: {
          p_expected_status?: string
          p_session_id: number
          p_student_id: number
        }
        Returns: {
          answers_revealed: boolean
          attempt_number: number
          completed_at: string | null
          created_at: string
          id: number
          is_latest: boolean
          max_score: number | null
          question_set_id: number
          started_at: string
          status: string
          student_id: number
          total_score: number | null
        }
        SetofOptions: {
          from: "*"
          to: "answer_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      register_parent_with_children: {
        Args: {
          p_children: Json
          p_parent_full_name: string
          p_parent_furigana: string
          p_parent_user_id: string
        }
        Returns: Database["public"]["CompositeTypes"]["parent_child_registration_result"]
        SetofOptions: {
          from: "*"
          to: "parent_child_registration_result"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reveal_math_answers: {
        Args: { p_session_id: number; p_student_id: number }
        Returns: {
          answers_revealed: boolean
          attempt_number: number
          completed_at: string | null
          created_at: string
          id: number
          is_latest: boolean
          max_score: number | null
          question_set_id: number
          started_at: string
          status: string
          student_id: number
          total_score: number | null
        }
        SetofOptions: {
          from: "*"
          to: "answer_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      run_data_retention_cleanup: {
        Args: never
        Returns: {
          cleanup_type: string
          deleted_count: number
        }[]
      }
    }
    Enums: {
      assessment_status: "completed" | "absent" | "not_submitted"
      course_level: "A" | "B" | "C" | "S"
      user_role: "student" | "parent" | "coach" | "admin"
    }
    CompositeTypes: {
      parent_child_registration_result: {
        parent_id: number | null
        student_ids: number[] | null
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      assessment_status: ["completed", "absent", "not_submitted"],
      course_level: ["A", "B", "C", "S"],
      user_role: ["student", "parent", "coach", "admin"],
    },
  },
} as const
