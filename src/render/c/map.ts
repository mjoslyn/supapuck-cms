// Map block: the published entries of a type that have coordinates, as pins on an OpenStreetMap map
// (Leaflet; public/assets/js/map.js). A pin's popup links to the entry and shows its address. With a
// taxonomy, the map follows a Filters block's choices of that taxonomy's terms (and their children);
// "featured first" shows only featured entries until something is chosen.
import type { Renderer, RenderCtx } from '../env';
import { esc } from '../html';
import { permalink } from '../../lib/permalink';
import { decodeEntities } from '../../lib/text/entities';
import { activeFilters, type FilterSpec } from './filters';

export const LEAFLET_SCRIPT = '<script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js" id="leaflet-js"></script>';

const bool = (v: unknown) => v === true || v === 1 || v === '1';
const plain = (s: unknown) => decodeEntities(String(s ?? '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

/** Load the entries and terms a map shows (from prepare). */
export async function prepareMap(id: string, a: Record<string, any>, ctx: RenderCtx) {
  const postType = String(a.postType || '');
  if (!postType) return;
  const lat = a.latField || 'latitude';
  const lng = a.lngField || 'longitude';
  const all = await ctx.loader.query({ postType, perPage: 10000, orderBy: 'date', order: 'desc', terms: {} });
  const markers = all.ids
    .map((eid) => ctx.loader.entries.get(eid)!)
    .filter((e) => e && !(a.excludeField && bool(e.fields?.[a.excludeField])))
    .map((e) => {
      const la = parseFloat(e.fields?.[lat]);
      const ln = parseFloat(e.fields?.[lng]);
      if (!Number.isFinite(la) || !Number.isFinite(ln) || (!la && !ln)) return null;
      return {
        title: plain(e.title_rendered ?? e.title),
        url: permalink(e),
        lat: la,
        lng: ln,
        address: a.addressField === '' ? '' : plain(e.fields?.[a.addressField || 'address']),
        terms: a.taxonomy ? (e.term_ids ?? []).filter((t) => ctx.loader.terms.get(t)?.taxonomy === a.taxonomy) : [],
        featured: bool(e.fields?.featured),
      };
    })
    .filter(Boolean);
  const terms = a.taxonomy ? [...ctx.loader.terms.values()].filter((t) => t.taxonomy === a.taxonomy).map((t) => ({ id: t.id, parent: t.parent_id ?? 0 })) : [];
  // Chosen on the page already (a Filters block for the same taxonomy, from the address).
  const spec = ((ctx.data.get('filters') as FilterSpec[] | undefined) ?? []).find((f) => f.taxonomy && f.taxonomy === a.taxonomy);
  const chosen = spec ? activeFilters(spec, ctx.queried.url) : { search: '', terms: [] };
  ctx.data.set(`map:${id}`, { markers, terms, taxonomy: a.taxonomy || '', chosen: chosen.terms, filtered: !!(chosen.search || chosen.terms.length) });
  ctx.assets.add('leaflet');
  for (const tag of [LEAFLET_SCRIPT, '<script src="/assets/js/map.js" defer></script>']) if (!ctx.scripts.includes(tag)) ctx.scripts.push(tag);
}

export const mapBlock: Renderer = (b, { ctx }) => {
  const a = b.attrs ?? {};
  const data = ctx.data.get(`map:${b.id}`) as { markers: unknown[] } | undefined;
  if (!data?.markers.length) {
    return `<p class="c-map__empty">${a.postType ? 'Nothing to show on the map yet: add coordinates to show entries here.' : 'Choose what the map shows in its settings.'}</p>`;
  }
  const [cLat, cLng] = String(a.center ?? '').split(',').map((v) => parseFloat(v));
  const config = {
    ...data,
    center: Number.isFinite(cLat) && Number.isFinite(cLng) ? [cLat, cLng] : null,
    zoom: Number(a.zoom) || 14,
    featuredFirst: bool(a.featuredFirst),
  };
  const height = esc(String(a.height || '500px'));
  return `<div class="c-map${a.className ? ` ${esc(a.className)}` : ''}" style="height:${height}" data-map="${esc(JSON.stringify(config))}" role="region" aria-label="Map"></div>`;
};

export const MAP_RENDERERS: Record<string, Renderer> = { map: mapBlock };
