import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

// Using untyped client for now. To get full type safety, run:
//   npx supabase gen types typescript --project-id <your-project-id> > src/types/database.ts
// then re-add: createClient<Database>(...)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
