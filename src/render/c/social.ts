// The site's social profiles (Settings > Social) as a row of icon links.
import { esc } from '../html';
import { attrs, styleDecls } from './style';
import type { Renderer } from '../env';
import { NETWORKS } from '../../lib/social/icons';
import { socialLinks } from '../../lib/social/links';

export const socialLinksBlock: Renderer = (b, env) => {
  const a = b.attrs;
  const links = socialLinks(env.ctx.settings.site);
  if (!links.length) return env.ctx.editor ? '<p style="padding:1rem;border:1px dashed #ccc">Add the site\'s social links under Settings &gt; Social.</p>' : '';
  const size = Math.min(64, Math.max(12, Number(a.size) || 22));
  const items = links.map((l) => {
    const n = NETWORKS[l.network];
    const external = !l.url.startsWith('mailto:');
    return (
      `<li><a class="c-social-links__link" href="${esc(l.url)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}${a.showLabels ? '' : ` aria-label="${esc(n.label)}"`}>` +
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="${n.path}"/></svg>` +
      (a.showLabels ? `<span>${esc(n.label)}</span>` : '') +
      `</a></li>`
    );
  });
  const justify = a.justify === 'center' || a.justify === 'right' ? `is-justify-${a.justify}` : null;
  return `<ul ${attrs(['c-social-links', justify, a.showLabels ? 'has-labels' : null, a.className], styleDecls(a.style))}>${items.join('')}</ul>`;
};

export const SOCIAL_RENDERERS: Record<string, Renderer> = { 'social-links': socialLinksBlock };
