// YouTube and Vimeo links as embeds (used by Compose materials and the video gallery's panel).

export interface VideoLink {
  provider: 'youtube' | 'vimeo';
  /** Player URL for the iframe. */
  src: string;
  /** Width / height: 9/16 for YouTube Shorts, 16/9 otherwise. */
  ratio: number;
}

/** A YouTube or Vimeo link's player, or null for any other link. */
export function videoLink(url: string): VideoLink | null {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\.|^m\./, '');
  const shorts = /(^|\.)youtube\.com$/.test(host) && u.pathname.startsWith('/shorts/');
  const yt = host === 'youtu.be' ? u.pathname.slice(1) : /(^|\.)youtube\.com$/.test(host) ? (u.searchParams.get('v') ?? u.pathname.match(/\/(?:embed|shorts|live)\/([\w-]+)/)?.[1]) : null;
  const vimeo = /(^|\.)vimeo\.com$/.test(host) ? u.pathname.match(/\/(\d+)/)?.[1] : null;
  if (yt && /^[\w-]+$/.test(yt)) return { provider: 'youtube', src: `https://www.youtube-nocookie.com/embed/${yt}`, ratio: shorts ? 9 / 16 : 16 / 9 };
  if (vimeo) return { provider: 'vimeo', src: `https://player.vimeo.com/video/${vimeo}`, ratio: 16 / 9 };
  return null;
}

export function videoIframe(src: string, title = ''): string {
  const safeTitle = title.replace(/[<>"&]/g, '');
  return `<iframe title="${safeTitle || 'Video'}" src="${src}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
}

/** Attrs of an `embed` block for a video link, or null when it isn't YouTube or Vimeo. */
export function videoEmbedAttrs(url: string, title = ''): { url: string; provider: string; html: string; ratio: number } | null {
  const v = videoLink(url);
  return v ? { url: url.trim(), provider: v.provider, html: videoIframe(v.src, title), ratio: Number(v.ratio.toFixed(4)) } : null;
}
