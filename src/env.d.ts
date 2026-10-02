/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    db: import('@supabase/supabase-js').SupabaseClient;
    user: { id: string; email: string; role: 'editor' | 'admin'; name: string };
  }
}
