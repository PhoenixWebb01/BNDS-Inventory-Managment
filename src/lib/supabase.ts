import { createClient } from "@supabase/supabase-js";

// These are safe to expose publicly - Row Level Security
// on Supabase protects your data, not these keys.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side Supabase client (used in React components)
// We use an untyped client for simplicity — our types are in @/types/database
// Once the project matures, you can run `supabase gen types` for full type safety.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
