import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tuivwlhwwrtboaprxtit.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Database types
export interface Program {
  id: string
  name: string
  day_of_week?: string
  time?: string
  created_at: string
}

export interface Student {
  id: string
  name: string
  phone_number: string
  created_at: string
}

export interface Attendance {
  id: string
  student_id: string
  program_id: string
  date: string
  status: 'Geldi' | 'Gelmedi'
  created_at: string
} 