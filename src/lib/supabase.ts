import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import type { AstroCookies } from 'astro';

const url = import.meta.env?.PUBLIC_SUPABASE_URL ?? process.env.PUBLIC_SUPABASE_URL;
const anonKey = import.meta.env?.PUBLIC_SUPABASE_ANON_KEY ?? process.env.PUBLIC_SUPABASE_ANON_KEY;

/** Anonymous client for public reads (RLS limits it to published content). */
export const supabase: SupabaseClient = createClient(url, anonKey, { auth: { persistSession: false } });

/** Per-request client that carries the editor's session cookie (admin + preview). */
export function serverClient(request: Request, cookies: AstroCookies): SupabaseClient {
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => parseCookieHeader(request.headers.get('Cookie') ?? '').map((c) => ({ name: c.name, value: c.value ?? '' })),
      setAll: (list) => list.forEach(({ name, value, options }) => cookies.set(name, value, options)),
    },
  });
}

export const storagePublicUrl = (path: string) => `${url}/storage/v1/object/public/media/${path}`;

/** Service-role client for trusted server work (media processing, form submissions). */
export function serviceClient(): SupabaseClient {
  const key = import.meta.env?.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  return createClient(url, key, { auth: { persistSession: false } });
}
