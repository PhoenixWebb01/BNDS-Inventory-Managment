// Re-export the browser client for backwards compatibility with existing client components.
// Prefer importing from @/lib/supabase/client directly in new code.
import { createClient } from "@/lib/supabase/client";

export const supabase = createClient();
