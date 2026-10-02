// Editor: replace pattern references with the pattern's blocks,
// so pattern content is editable in place and saved inline. A linked pattern instead becomes a
// container of its blocks (expandLinked) that saving turns back into the reference (collapseAll). Rendering is unchanged: the public
// pattern renderer outputs exactly these items in the same position.
import type { Loader } from '../lib/data';
import type { PuckItem } from '../lib/puck/types';
import { mapBlocks } from '../lib/puck/tree';
import { expandLinked } from '../lib/content/linked-patterns';

/** Copies of blocks with their ids prefixed, so a copy never shares ids with the original. */
export function reId(items: PuckItem[], prefix: string): PuckItem[] {
  return mapBlocks(items, (item) => ({ type: item.type, props: { ...item.props, id: `${prefix}-${item.props.id}` } }));
}

export async function inlinePatterns(items: PuckItem[], loader: Loader, depth = 0): Promise<PuckItem[]> {
  if (depth > 5) return items;
  const out: PuckItem[] = [];
  for (const item of items) {
    if ((item.type === 'core/pattern' || item.type === 'pattern') && item.props.attrs?.slug) {
      const doc = await loader.template('pattern', item.props.attrs.slug);
      const content = (doc?.content ?? []) as PuckItem[];
      if (content.length && item.props.attrs.linked) {
        out.push(expandLinked(item, content));
        continue;
      }
      if (content.length) {
        out.push(...(await inlinePatterns(reId(content, item.props.id), loader, depth + 1)));
        continue;
      }
    }
    const children = item.props.children ? await inlinePatterns(item.props.children, loader, depth) : undefined;
    out.push(children ? { ...item, props: { ...item.props, children } } : item);
  }
  return out;
}
