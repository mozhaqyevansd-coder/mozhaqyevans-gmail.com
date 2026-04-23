import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Please set them in your environment variables.');
}

/**
 * PENTING: Pastikan Anda telah menjalankan script di DATABASE.sql 
 * pada SQL Editor Supabase Anda untuk membuat tabel dan policy RLS.
 */
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

export type Role = 'admin' | 'guru' | 'siswa';

export interface UserProfile {
  id: string;
  name: string;
  role: Role;
  created_at: string;
}

export interface StudentProfile extends UserProfile {
  nis: string;
  class: string;
}

export interface Question {
  id: string;
  question: string;
  type: 'pilihan_ganda' | 'esai';
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  correct_answer: string;
  created_by: string;
  created_at: string;
}

export interface Exam {
  id: string;
  title: string;
  subject: string;
  duration: number; // in minutes
  start_time: string | null;
  end_time: string | null;
  status: 'aktif' | 'nonaktif';
  is_active: boolean; // legacy
  created_by: string;
  role_creator?: 'admin' | 'guru';
  created_at: string;
}

export interface ExamQuestion {
  id: string;
  exam_id: string;
  question_id: string;
}

export interface Answer {
  id: string;
  user_id: string;
  exam_id: string;
  question_id: string;
  answer: string;
  created_at: string;
}

export interface Result {
  id: string;
  user_id: string;
  exam_id: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  student_answers: any[];
  feedback?: string;
  created_at: string;
}
