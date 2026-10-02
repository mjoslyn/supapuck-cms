// Content areas: a template can have several Page content blocks, each showing one area of the page.
// "main" (the default) is the page's content as always; another area ("sidebar", "intro"...) is a
// separate list of blocks each page fills in, stored as a slot prop of its content's root
// (root.props["area-<name>"]), which the editor shows where the template has it.
import type { PuckItem } from '../puck/types';
import { eachBlock, mapBlocks } from '../puck/tree';

export const MAIN_AREA = 'main';

/** An area name as stored: lowercase letters, digits and hyphens; empty means main. */
export const areaName = (v: unknown) => String(v ?? '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || MAIN_AREA;

/** The root prop that holds an area's blocks. */
export const areaProp = (area: string) => `area-${area}`;

/** An area's blocks in an entry's content. */
export function areaItems(doc: { content?: unknown[]; root?: { props?: Record<string, unknown> } } | null | undefined, area: string): any[] {
  const name = areaName(area);
  const items = name === MAIN_AREA ? doc?.content : doc?.root?.props?.[areaProp(name)];
  return (Array.isArray(items) ? items : []) as any[];
}

/** The content areas a template has (its Page content blocks), main first. */
export function templateAreas(items: PuckItem[] | undefined): string[] {
  const out = new Set<string>();
  eachBlock(items, (i) => {
    if (i.type === 'entry-content') out.add(areaName(i.props.attrs?.area));
  });
  return [...out].sort((a, b) => (a === MAIN_AREA ? -1 : b === MAIN_AREA ? 1 : a.localeCompare(b)));
}

/**
 * A template's blocks with each Page content block showing its own area: a block that repeats an
 * area an earlier one already shows (as a second block added without a name does, both "main") gets
 * the next free name, area-2, area-3... Returns the same list when nothing needed a name.
 */
export function uniqueAreas(items: PuckItem[]): PuckItem[] {
  const seen = new Set<string>();
  let repeats = 0;
  eachBlock(items, (i) => {
    if (i.type !== 'entry-content') return;
    const name = areaName(i.props.attrs?.area);
    if (seen.has(name)) repeats++;
    else seen.add(name);
  });
  if (!repeats) return items;
  // Rename the repeats in the same order, to names no block uses.
  const kept = new Set<string>();
  let n = 2;
  return mapBlocks(items, (i) => {
    if (i.type !== 'entry-content') return i;
    const name = areaName(i.props.attrs?.area);
    if (!kept.has(name)) {
      kept.add(name);
      return i;
    }
    while (seen.has(`area-${n}`)) n++;
    const next = `area-${n}`;
    seen.add(next);
    kept.add(next);
    return { ...i, props: { ...i.props, attrs: { ...(i.props.attrs ?? {}), area: next } } };
  });
}
