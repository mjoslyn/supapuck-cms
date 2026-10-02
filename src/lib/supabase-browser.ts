import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/** Browser client sharing the admin session cookie set by the server login route. */
export function browserClient(): SupabaseClient {
  client ??= createBrowserClient(import.meta.env.PUBLIC_SUPABASE_URL, import.meta.env.PUBLIC_SUPABASE_ANON_KEY);
  return client;
}
