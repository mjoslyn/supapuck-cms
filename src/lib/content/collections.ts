// Collection settings belong on the collection: moveItemsLayout moves columns and gap that older
// (imported) collections kept on their items block; the editor applies it on load and
// scripts/migrate-content.ts to stored content.
import type { PuckItem } from '../puck/types';

/**
 * Columns and gap kept on a collection's items block (imported collections carried them there) moved
 * onto the collection, where the renderer reads them; the collection's own values win, as they did.
 * Returns the same item when there is nothing to move.
 */
export function moveItemsLayout(item: PuckItem): PuckItem {
  const kids = item.props.children ?? [];
  const items = kids.find((k) => k.type === 'collection-items');
  const ia = items?.props.attrs ?? {};
  if (!items || (ia.columns == null && ia.gap == null)) return item;
  const a: Record<string, any> = { ...item.props.attrs };
  if (a.display !== 'list' && a.display !== 'slider' && a.variant !== 'slider' && a.columns == null && ia.columns) a.columns = ia.columns;
  if (a.itemGap == null && ia.gap != null && a.display !== 'slider' && a.variant !== 'slider') a.itemGap = ia.gap;
  const { columns: _c, gap: _g, ...rest } = ia;
  void _c, _g;
  return { ...item, props: { ...item.props, attrs: a, children: kids.map((k) => (k === items ? ({ ...k, props: { ...k.props, attrs: rest } } as PuckItem) : k)) } } as PuckItem;
}

/** moveItemsLayout on every collection in a document; returns the same array when nothing moved. */
export function migrateCollectionLayout(items: PuckItem[]): PuckItem[] {
  let changed = false;
  const walk = (list: PuckItem[]): PuckItem[] =>
    list.map((item) => {
      const kids = item.props.children;
      let next = kids?.length ? ({ ...item, props: { ...item.props, children: walk(kids) } } as PuckItem) : item;
      if (next.type === 'collection') {
        const moved = moveItemsLayout(next);
        if (moved !== next) changed = true;
        next = moved;
      }
      return next;
    });
  const out = walk(items);
  return changed ? out : items;
}
