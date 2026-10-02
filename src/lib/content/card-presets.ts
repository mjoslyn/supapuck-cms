// Card designs for collections: the item template a collection repeats for each entry. The designs
// come from the site (src/site/lib/content/cards.ts, through SiteRender.cards); picking one in the collection's
// settings replaces its template, and "custom" keeps the blocks as edited.
import type { PuckItem } from '../puck/types';
import type { CardPreset, CardTemplate } from '../site/extend';
import { SITE_RENDER } from '../site/render';

export type { CardPreset };
export const CARD_PRESETS: CardPreset[] = SITE_RENDER.cards ?? [];
/** The design new collections start with. */
export const DEFAULT_CARD = CARD_PRESETS[0]?.id ?? 'custom';
export const CARD_IDS = CARD_PRESETS.map((p) => p.id);

/** A preset's template with fresh block ids (Puck needs them unique). */
export function cardTemplate(id: string, prefix: string): PuckItem[] {
  const preset = CARD_PRESETS.find((p) => p.id === id);
  let n = 0;
  const copy = (items: CardTemplate[]): PuckItem[] =>
    items.map(
      (i) =>
        ({
          type: i.type,
          props: {
            id: `${prefix}-${i.type}-${n++}`,
            attrs: structuredClone(i.props.attrs),
            ...(i.props.children ? { children: copy(i.props.children) } : {}),
          },
        }) as PuckItem,
    );
  return preset ? copy(preset.template) : [];
}
