// Image markup for media rows: size selection, srcset/sizes, focal-point position, and AVIF/WebP
// <picture> sources.
import type { Media } from '../types';
import { focalFor, position, shapeFor } from './focal';
import { safeDecode } from '../url';

export const UPLOADS_BASE = '/media/';

export const mediaUrl = (path: string) => UPLOADS_BASE + path;

const dir = (p: string) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/') + 1) : '');
const base = (p: string) => p.slice(p.lastIndexOf('/') + 1);

/** Scale dimensions down to a maximum width. */
function constrain(w: number, h: number, maxW: number): [number, number] {
  if (!maxW || w <= maxW) return [w, h];
  const ratio = maxW / w;
  let nw = Math.max(1, Math.round(w * ratio));
  let nh = Math.max(1, Math.round(h * ratio));
  if (nw > maxW) nw = maxW;
  return [nw, nh];
}

function matchesRatio(sw: number, sh: number, tw: number, th: number) {
  const [constrained, expected] = sw > tw ? [constrain(sw, sh, tw), [tw, th]] : [constrain(tw, th, sw), [sw, sh]];
  return Math.abs(constrained[0] - expected[0]) <= 1 && Math.abs(constrained[1] - expected[1]) <= 1;
}

/** The sizes uploads get (SIZES in process.ts, which is server-only), smallest first. */
const STANDARD_SIZES = ['thumbnail', 'medium', 'medium_large', 'large', '1536x1536', '2048x2048'];

/**
 * The file and dimensions of a named size. A standard size an image lacks is the next larger one it
 * has, else the full file (the image is smaller than that); a size name no upload gets (one an older
 * site registered) counts as `large`, so content asking for it never gets the full file (up to
 * 2560px) by mistake.
 */
export function downsize(m: Media, size: string): { path: string; width: number; height: number } {
  const full = { path: m.path, width: m.width ?? 0, height: m.height ?? 0 };
  if (size === 'full' || size === 'original_image') return full;
  const own = m.sizes?.[size];
  if (own?.width && own.height) return { path: own.path, width: own.width, height: own.height };
  const from = STANDARD_SIZES.indexOf(STANDARD_SIZES.includes(size) ? size : 'large');
  for (const name of STANDARD_SIZES.slice(from)) {
    const s = m.sizes?.[name];
    if (s?.width && s.height) return { path: s.path, width: s.width, height: s.height };
  }
  return full;
}

export function srcset(m: Media, src: { path: string; width: number; height: number }): string | null {
  if (!m.width || !m.height || !m.sizes) return null;
  const entries = Object.entries(m.sizes).filter(([k]) => k !== 'original_image');
  if (!entries.length) return null;
  const candidates = [...entries.map(([, s]) => ({ file: base(s.path), width: s.width ?? 0, height: s.height ?? 0 }))];
  const thumbGif = m.sizes.thumbnail?.mime_type === 'image/gif';
  if (!thumbGif) candidates.push({ file: base(m.path), width: m.width, height: m.height });
  const dirname = dir(m.path);
  const sources = new Map<number, string>();
  let srcMatched = false;
  for (const c of candidates) {
    let isSrc = false;
    if (!srcMatched && src.path === dirname + c.file) { srcMatched = true; isSrc = true; }
    if (c.width > 2048 && !isSrc) continue;
    if (!matchesRatio(src.width, src.height, c.width, c.height)) continue;
    const url = mediaUrl(dirname + c.file);
    if (isSrc) {
      const rest = [...sources].filter(([w]) => w !== c.width);
      sources.clear();
      sources.set(c.width, url);
      for (const [w, u] of rest) sources.set(w, u);
    } else sources.set(c.width, url);
  }
  if (!srcMatched || sources.size < 2) return null;
  return [...sources].map(([w, u]) => `${u.replace(/ /g, '%20')} ${w}w`).join(', ');
}

export interface ImgAttrs {
  width?: number;
  height?: number;
  src: string;
  className: string;
  alt: string;
  style?: string;
  srcSet?: string;
  sizes?: string;
  /** AVIF / WebP alternatives, most efficient first. */
  sources?: { type: string; srcSet: string }[];
}

/** CSS object-position for a media item cropped to `ratio` (width / height), if it has a focal point. */
export const focalPosition = (m: Pick<Media, 'focal_point' | 'crop_focals'>, ratio?: number | null) => position(focalFor(m, ratio));

/** Modern-format <source> sets mirroring a srcset (or the single src); none unless every file has one. */
function modernSources(m: Media, src: string, set: string | null): { type: string; srcSet: string }[] {
  const byPath = new Map<string, Record<string, string> | undefined>([[m.path, m.formats], ...Object.values(m.sizes ?? {}).map((s) => [s.path, s.formats] as [string, Record<string, string> | undefined])]);
  const out: { type: string; srcSet: string }[] = [];
  for (const [fmt, type] of [['avif', 'image/avif'], ['webp', 'image/webp']]) {
    const swap = (url: string) => {
      const p = safeDecode(url.slice(UPLOADS_BASE.length));
      const v = byPath.get(p)?.[fmt];
      return v ? mediaUrl(v).replace(/ /g, '%20') : null;
    };
    if (set) {
      const parts = set.split(', ').map((c) => {
        const [url, w] = c.split(' ');
        const v = swap(url);
        return v ? `${v} ${w}` : null;
      });
      if (parts.every(Boolean)) out.push({ type, srcSet: parts.join(', ') });
    } else {
      const v = swap(src);
      if (v) out.push({ type, srcSet: v });
    }
  }
  return out;
}

/**
 * A media row's URLs carry its version (when its files were last made): a new focal point re-crops the
 * sizes under the same names, and the old crop is cached for a year under the old URL.
 */
export function versioned(m: Pick<Media, 'processed_at'>, url: string): string {
  if (!m.processed_at) return url;
  const v = Date.parse(m.processed_at);
  return Number.isNaN(v) ? url : `${url}${url.includes('?') ? '&' : '?'}v=${v.toString(36)}`;
}
const versionSet = (m: Pick<Media, 'processed_at'>, set: string) => set.split(', ').map((c) => { const [u, w] = c.split(' '); return `${versioned(m, u)} ${w}`; }).join(', ');

/**
 * Image attributes for a media row at a size (loading/decoding/fetchpriority are decided in optimizeImages()).
 * Cropped to a shape (`ratio`, or the square thumbnail size) for which the row names another image
 * (crop_images, loaded as crop_media), that image is used, with the focal point set for that use (else
 * its own); the alt text is its own, else this one's.
 */
export function mediaImage(m: Media, size: string, attr: { className?: string; alt?: string; style?: string; ratio?: number | null } = {}): ImgAttrs {
  const shape = shapeFor(attr.ratio ?? (size === 'thumbnail' ? 1 : null));
  const swap = shape ? m.crop_media?.[shape.key] : undefined;
  if (swap) {
    const focal = m.crop_images?.[shape!.key]?.focal;
    const shown: Media = { ...swap, crop_media: undefined, ...(focal ? { crop_focals: { ...(swap.crop_focals ?? {}), [shape!.key]: focal } } : {}) };
    return mediaImage(shown, size, { ...attr, alt: attr.alt ?? (swap.alt || m.alt) });
  }
  const src = downsize(m, size);
  const set = srcset(m, src);
  const focal = focalPosition(m, attr.ratio);
  // A style that sets its own object-position (e.g. a block's focal point) wins.
  const style = [attr.style, focal && !attr.style?.includes('object-position') ? `object-position:${focal}` : ''].filter(Boolean).join(';');
  const sources = modernSources(m, mediaUrl(src.path), set);
  return {
    width: src.width || undefined,
    height: src.height || undefined,
    src: versioned(m, mediaUrl(src.path)),
    className: attr.className ?? '',
    alt: attr.alt ?? m.alt ?? '',
    ...(style ? { style } : {}),
    ...(set ? { srcSet: versionSet(m, set), sizes: `(max-width: ${src.width}px) 100vw, ${src.width}px` } : {}),
    ...(sources.length ? { sources: sources.map((s) => ({ ...s, srcSet: versionSet(m, s.srcSet) })) } : {}),
  };
}

const escAttr = (s: string) => s.replace(/&(?!(?:#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);)/gi, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** The <img> tag (in a <picture> when there are modern formats), marked for optimizeImages(). */
export function mediaImgTag(a: ImgAttrs, opts: { loading?: 'lazy' | 'eager'; extra?: string } = {}): string {
  const img = imgTag(a, opts);
  if (!a.sources?.length) return img;
  const sizes = a.sizes ? ` sizes="${a.sizes}"` : '';
  return `<picture>${a.sources.map((s) => `<source type="${s.type}" srcset="${s.srcSet}"${sizes} />`).join('')}${img}</picture>`;
}

function imgTag(a: ImgAttrs, opts: { loading?: 'lazy' | 'eager'; extra?: string }): string {
  return `<img${a.width ? ` width="${a.width}"` : ''}${a.height ? ` height="${a.height}"` : ''} src="${a.src}"${a.className ? ` class="${a.className}"` : ''} alt="${escAttr(a.alt)}"${a.style ? ` style="${escAttr(a.style)}"` : ''}${opts.extra ?? ''}${opts.loading ? ` loading="${opts.loading}"` : ''}${a.srcSet ? ` srcset="${a.srcSet}" sizes="${a.sizes}"` : ''} data-cms-img="attachment" />`;
}

/** Tag every <img> in a static HTML fragment with where it was rendered (for loading attributes). */
export function markImages(html: string, context: string): string {
  if (!html.includes('<img')) return html;
  return html.replace(/<img\b(?![^>]*data-cms-img)/g, `<img data-cms-img="${context}"`);
}

/**
 * Loading attributes (lazy, fetchpriority, decoding) applied in document order over the rendered page.
 * Contexts: template (static template markup: untouched), part-header, part-<area>, content,
 * attachment, loop (inside the main query loop on any request), noloop (never in the main loop), cover
 * (a cover or hero background).
 * `inLoop` is true on singular requests, where block themes run the main loop.
 */
export function optimizeImages(html: string, inLoop: boolean): string {
  let count = 0;
  let highAvailable = true;
  return html.replace(/<img\b[^>]*\bdata-cms-img="([^"]+)"[^>]*>/g, (tag, ctx: string) => {
    tag = tag.replace(/\sdata-cms-img="[^"]+"/, '');
    if (ctx === 'template') return tag;
    const attr = (n: string) => tag.match(new RegExp(`\\s${n}="([^"]*)"`))?.[1];
    const add = (s: string) => (tag = tag.replace(/\s*\/?>$/, (end) => ` ${s}${end.includes('/') ? ' />' : '>'}`));
    if (!attr('decoding')) add('decoding="async"');
    // Cover and hero backgrounds (no width or height: they fill their block). The first on the page is
    // usually its largest paint, so it loads first; later ones wait until they near the screen.
    if (ctx === 'cover') {
      if (attr('loading') || attr('fetchpriority')) return tag;
      if (highAvailable) {
        add('fetchpriority="high"');
        highAvailable = false;
      } else add('loading="lazy"');
      return tag;
    }
    const w = Number(attr('width')), h = Number(attr('height'));
    if (!w || !h) return tag;
    let inViewport: boolean | null = null;
    let increase = false, maybeIncrease = false;
    const loading = attr('loading');
    if (loading) inViewport = loading !== 'lazy';
    if (attr('fetchpriority') === 'high') inViewport = true;
    if (inViewport === null) {
      if (ctx === 'part-header') { inViewport = true; maybeIncrease = true; }
      else if (ctx === 'loop' || (inLoop && ctx !== 'noloop')) { inViewport = count < 3; increase = true; }
      else inViewport = false;
    }
    if (inViewport) {
      if (!attr('fetchpriority') && loading !== 'lazy' && highAvailable && w * h >= 50000) {
        add('fetchpriority="high"');
        highAvailable = false;
      }
    } else if (!loading) add('loading="lazy"');
    if (increase || (maybeIncrease && w * h >= 50000)) count++;
    // Lazy images let the browser size from layout (sizes="auto").
    if ((attr('loading') ?? '') === 'lazy') tag = tag.replace(/\ssizes="(?!auto)([^"]*)"/, ' sizes="auto, $1"');
    return tag;
  });
}
