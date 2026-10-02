// Focal points: the main point, plus optional overrides for common crop shapes.
import type { Media } from '../types';

export type Point = { x: number; y: number };

export const SHAPES: { key: string; ratio: number; name: string }[] = [
  { key: '1/1', ratio: 1, name: 'Square' },
  { key: '16/9', ratio: 16 / 9, name: 'Wide' },
  { key: '4/3', ratio: 4 / 3, name: 'Landscape' },
  { key: '3/4', ratio: 3 / 4, name: 'Portrait' },
];

/** "4/3", "4 / 3", "1.333" or a number -> width / height. */
export function parseRatio(v: unknown): number | null {
  if (typeof v === 'number') return v > 0 ? v : null;
  const s = String(v ?? '').trim();
  const m = s.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (m) return Number(m[1]) / Number(m[2]) || null;
  const n = Number(s);
  return n > 0 ? n : null;
}

/** The shape a crop of this ratio counts as (within 15%), if any. */
export function shapeFor(ratio: number | null | undefined) {
  if (!ratio) return null;
  let best: (typeof SHAPES)[number] | null = null;
  for (const s of SHAPES) if (Math.abs(ratio / s.ratio - 1) <= 0.15 && (!best || Math.abs(ratio / s.ratio - 1) < Math.abs(ratio / best.ratio - 1))) best = s;
  return best;
}

/** Focal point for a crop of the given ratio: its shape's override, else the main point. */
export function focalFor(m: Pick<Media, 'focal_point'> & { crop_focals?: Record<string, Point> | null }, ratio?: number | null): Point | null {
  const shape = shapeFor(ratio);
  return (shape && m.crop_focals?.[shape.key]) || m.focal_point || null;
}

export const position = (p: Point | null) => (p ? `${Math.round(p.x * 100)}% ${Math.round(p.y * 100)}%` : '');
