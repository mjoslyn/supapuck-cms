// A readable outline of page content (headings, text, images, videos, buttons, lists), so Claude can
// see what is on a page, including edits made by hand since its last plan.
import type { PuckItem } from '../puck/types';

const plain = (html: unknown) =>
  String(html ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&[#\w]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export function outline(items: PuckItem[] | undefined, max = 120): string {
  const out: string[] = [];
  const walk = (list: PuckItem[] | undefined, depth: number) => {
    for (const i of list ?? []) {
      if (out.length >= max) return;
      const a = i.props?.attrs ?? {};
      const pad = '  '.repeat(depth);
      if (i.type === 'hero') {
        out.push(`${pad}[hero${a.src ? ' with image' : ''}]${a.eyebrow ? ` ${plain(a.eyebrow)}:` : ''} # ${plain(a.title)}`);
        if (a.text) out.push(`${pad}${plain(a.text).slice(0, 300)}`);
        for (const [l, h] of [[a.primaryLabel, a.primaryHref], [a.secondaryLabel, a.secondaryHref]]) if (l && h) out.push(`${pad}[button "${plain(l)}" -> ${h}]`);
      } else if (i.type === 'heading') out.push(`${pad}# ${plain(a.content)}`);
      else if (i.type === 'text' && plain(a.content)) out.push(`${pad}${plain(a.content).slice(0, 300)}`);
      else if (i.type === 'list-item') out.push(`${pad}- ${plain(a.content).slice(0, 200)}`);
      else if (i.type === 'image' || i.type === 'cover') out.push(`${pad}[image ${a.alt ? `"${plain(a.alt)}"` : a.src ?? ''}]`);
      else if (i.type === 'embed' || i.type === 'video') out.push(`${pad}[video ${a.url ?? a.src ?? ''}]`);
      else if (i.type === 'button') out.push(`${pad}[button "${plain(a.text)}" -> ${a.href ?? ''}]`);
      else if (i.type === 'collection') out.push(`${pad}[list of ${[].concat(a.query?.postType ?? 'post').join(', ')}${a.display && a.display !== 'grid' ? `, ${a.display}` : ''}${a.shuffle ? ', shuffled' : ''}]`);
      else if (i.type === 'gallery' || i.type === 'video-gallery') out.push(`${pad}[${i.type === 'gallery' ? 'image' : 'video'} gallery, ${a.display ?? 'grid'}]`);
      else if (i.type === 'quote') out.push(`${pad}> quote:`);
      if (i.type !== 'collection') walk(i.props?.children, i.type === 'section' || i.type === 'cover' ? depth : depth + 1);
    }
  };
  walk(items, 0);
  return out.join('\n');
}

/** Top-level blocks built by a compose session (their ids start with its prefix). */
export const isComposed = (item: { props: { id: string } }, prefix: string) => item.props.id.startsWith(`${prefix}-`);
