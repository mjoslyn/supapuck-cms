// /media/ is a rewrite to the Supabase Storage bucket (public/_redirects). A path that tries to leave
// the bucket ("..", a backslash, their %-escapes) would reach other paths on the Supabase host through
// the site's domain (and be cached a year), so it is refused here, before the rewrite. Other requests
// pass on untouched.
import type { Config, Context } from '@netlify/edge-functions';

/** Same check as src/lib/media/path-guard.ts (kept here so the edge bundle has no app imports). */
function unsafeMediaPath(pathname: string): boolean {
  let p = pathname;
  for (let i = 0; i < 3; i++) {
    try {
      const next = decodeURIComponent(p);
      if (next === p) break;
      p = next;
    } catch {
      return true;
    }
  }
  return /(^|[/\\])\.\.([/\\]|$)/.test(p) || p.includes('\\') || /%(2e|5c|2f)/i.test(p);
}

export default async (request: Request, context: Context) => {
  if (unsafeMediaPath(new URL(request.url).pathname)) return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  return context.next();
};

export const config: Config = { path: '/media/*' };
