// What Claude writes can carry instructions from the materials it read (a web page, a document), so its
// markup is cleaned before it reaches a page: inline HTML keeps a few formatting tags and links with a
// safe address, and addresses must be web, mail, phone or site links.

const INLINE_TAGS = new Set(['a', 'strong', 'b', 'em', 'i', 'u', 's', 'br', 'code', 'mark', 'sub', 'sup', 'small', 'span']);
const NAMED: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", colon: ':', tab: '\t', newline: '\n' };

const decode = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);?/gi, (m, e: string) => {
    const k = e.toLowerCase();
    if (!k.startsWith('#')) return NAMED[k] ?? m;
    const cp = k.startsWith('#x') ? parseInt(k.slice(2), 16) : Number(k.slice(1));
    return String.fromCodePoint(cp > 0 && cp <= 0x10ffff ? cp : 0xfffd);
  });

/** An address that is safe in href/src: http(s), mailto, tel, or relative (no other scheme). */
export function isSafeUrl(url: string): boolean {
  // Browsers ignore whitespace and control characters in a scheme and decode entities in attributes.
  const u = decode(decode(url)).replace(/[\x00-\x20\x7f-\x9f]/g, '').toLowerCase();
  const scheme = u.match(/^([a-z][a-z0-9+.-]*):/);
  return !scheme || ['http', 'https', 'mailto', 'tel'].includes(scheme[1]);
}

const escAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Inline HTML with only formatting tags and safe links; any other markup is removed, stray < and > escaped. */
export function cleanInlineHtml(html: string): string {
  return html
    .replace(/<!--[\s\S]*?(?:-->|$)/g, '')
    .replace(/<(script|style|iframe|object|embed|svg|math|template|noscript|textarea|title)\b[\s\S]*?(?:<\/\1\s*>|$)/gi, '')
    .replace(/<(\/?)([a-z][\w-]*)([^>]*)>|[<>]/gi, (m, close: string, tag: string, rest: string) => {
      if (!tag) return m === '<' ? '&lt;' : '&gt;';
      const t = tag.toLowerCase();
      if (!INLINE_TAGS.has(t)) return '';
      if (close) return `</${t}>`;
      if (t !== 'a') return `<${t}>`;
      const h = rest.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i);
      const href = h ? (h[1] ?? h[2] ?? h[3]) : '';
      return href && isSafeUrl(href) ? `<a href="${escAttr(decode(href))}">` : '<a>';
    });
}
