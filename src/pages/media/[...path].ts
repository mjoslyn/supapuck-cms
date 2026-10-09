// Serve /media/ URLs from Supabase Storage (the media bucket, same paths).
import type { APIRoute } from 'astro';
import { storagePublicUrl } from '../../lib/supabase';
import { unsafeMediaPath, MEDIA_HEADERS } from '../../lib/media/path-guard';

export const GET: APIRoute = async ({ params, url }) => {
  // Only paths inside the media bucket (the Netlify edge function does the same in production).
  if (unsafeMediaPath(url.pathname) || unsafeMediaPath(params.path ?? '')) return new Response('Not found', { status: 404 });
  const res = await fetch(storagePublicUrl(params.path ?? ''));
  if (!res.ok) return new Response('Not found', { status: 404 });
  return new Response(res.body, {
    headers: {
      'Content-Type': res.headers.get('Content-Type') ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
      ...MEDIA_HEADERS,
    },
  });
};
