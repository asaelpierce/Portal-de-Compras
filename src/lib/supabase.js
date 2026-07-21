import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
  || 'https://tocyzucfgwhvpfihakvj.supabase.co'

const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvY3l6dWNmZ3dodnBmaWhha3ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NTgyODEsImV4cCI6MjEwMDIzNDI4MX0.CG1ozQTuHEINzqiBxoR3PligckncGXm-b16TDFsRz4Y'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
