// Suggest an entry's SEO title and description (the SEO section's Generate): POST { type, title, text }
// with the page's current text; answers { title, description }.
import type { APIRoute } from 'astro';
import { typeLabel } from '../../../lib/site';
import { SEO_LIMITS } from '../../../lib/seo';
import { QuickError, quickAsk } from '../../../lib/compose/quick';

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => ({}));
  const title = String(body.title ?? '').slice(0, 300);
  const text = String(body.text ?? '').slice(0, 12000);
  if (!title && !text) return new Response('The page has no title or text yet.', { status: 400 });
  try {
    const out = await quickAsk<{ title?: string; description?: string }>(
      'You write search titles and meta descriptions. Write for people searching: say what the page is about in the words they would search with and give a reason to visit. No clickbait, no keyword stuffing, no site name in the title (it is added).',
      {
        name: 'seo',
        description: 'The search title and meta description.',
        input_schema: {
          type: 'object',
          required: ['title', 'description'],
          properties: {
            title: { type: 'string', description: `30 to ${SEO_LIMITS.title} characters, the page's subject first.` },
            description: { type: 'string', description: '120 to 155 characters: what the page offers and why to visit.' },
          },
        },
      },
      `A ${typeLabel(String(body.type ?? 'page')).toLowerCase()} titled "${title}".\n\nIts text:\n${text || '(none yet)'}`,
    );
    if (!out.title && !out.description) return new Response('No suggestion came back.', { status: 502 });
    return Response.json({ title: out.title?.trim() ?? '', description: out.description?.trim() ?? '' });
  } catch (e) {
    return new Response((e as Error).message, { status: e instanceof QuickError ? e.status : 502 });
  }
};
