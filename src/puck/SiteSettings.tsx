// Site settings island, in tabs: General (name, tagline, front page, timezone), Types (the templates for
// each type's pages and listing), Search (the types it covers), Social (profile links, default share
// image), Redirects (saved as they are added, with the Not found log), Sync (with another copy of the
// site), Backups (snapshots and sync backups) and the site's own options. One Save for all;
// the tab is in the URL (#search), and leaving with unsaved changes asks first.
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { FieldsForm } from './entry-fields';
import { SITE_EDITOR } from '../lib/site/editor';
import { ARCHIVE_PATHS, CONTENT_TYPES, PAGELESS_TYPES, SEARCHABLE_TYPES, TYPE_BASES, site as config, taxonomiesOf, taxonomyLabel, typeDef } from '../lib/site';
import { NO_CONTENT_WARNING, chosenTemplate, defaultTaxonomyTemplates, defaultTemplates, templateLabel, type TemplateInfo, type TemplateMap } from '../lib/templates';
import { MediaPicker, Select, Text, Toggle, inputClass } from './fields';
import { NETWORKS } from '../lib/social/icons';
import Redirects, { type NotFound } from '../admin/Redirects';
import Sync from '../admin/Sync';
import BackupsTab from '../admin/Backups';
import type { Redirect } from '../lib/redirects';
import { MENU_FIELDS } from '../lib/navigation';

interface Props {
  site: { name?: string; description?: string; front_page_id?: number | null; timezone?: string; search_types?: string[]; social?: { network: string; url: string }[]; share_image?: number; share_image_url?: string; templates?: TemplateMap; taxonomy_templates?: Record<string, string>; taxonomy_pages_off?: string[]; listings_off?: string[]; icons?: Record<string, string>; icon_media_id?: number | null; icon_preview?: string };
  options: Record<string, any>;
  pages: { id: number; title: string }[];
  templates: TemplateInfo[];
  redirects: Redirect[];
  notFound: NotFound[];
}

/** Every IANA timezone the browser knows. */
const TIMEZONES: string[] = (Intl as any).supportedValuesOf?.('timeZone') ?? [config.timezone];

export default function SiteSettings({ site: initialSite, options: initialOptions, pages, templates, redirects, notFound }: Props) {
  const [site, setSite] = useState(initialSite);
  const [options, setOptions] = useState(initialOptions);
  const [status, setStatus] = useState('');
  const [tab, setTab] = useState('general');
  const [saved, setSaved] = useState(() => JSON.stringify({ site: initialSite, options: initialOptions }));
  const dirty = JSON.stringify({ site, options }) !== saved;
  // The tab named in the URL (after hydration, so the server and browser render the same first).
  useEffect(() => {
    const fromHash = () => {
      const id = location.hash.slice(1);
      if (id) setTab(id);
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => {
    if (dirty && status.startsWith('Saved')) setStatus('');
  }, [dirty]);
  const save = async () => {
    // Types whose pages would lose their own content with the template chosen for them.
    const lacking = Object.entries(site.templates ?? {})
      .filter(([, m]) => m.single && templates.some((t) => t.slug === m.single && !t.content))
      .map(([type]) => typeDef(type)?.label ?? type);
    if (lacking.length && !window.confirm(`${lacking.join(', ')}: the template chosen has no Page content block, so their own content won't show on the site. Save anyway?`)) return;
    setStatus('Saving…');
    const res = await fetch('/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ site, options }) });
    if (!res.ok) return setStatus(`Save failed: ${await res.text()}`);
    const { moved } = await res.json();
    setSaved(JSON.stringify({ site, options }));
    setStatus(`Saved ${new Date().toLocaleTimeString()}${moved ? `; ${moved} event${moved === 1 ? '' : 's'} moved to the new timezone` : ''}`);
  };
  const tabs: { id: string; label: string; panel: ReactNode }[] = [
    {
      id: 'general',
      label: 'General',
      panel: (
        <>
        <Text title="Site name" value={site.name} onChange={(v) => setSite({ ...site, name: v })} />
        <Text title="Tagline" value={site.description} onChange={(v) => setSite({ ...site, description: v })} />
        <Select title="Front page" value={site.front_page_id ? String(site.front_page_id) : ''} options={pages.map((p) => [String(p.id), p.title])} onChange={(v) => setSite({ ...site, front_page_id: v ? Number(v) : null })} />
        <Select
          title="Timezone"
          value={site.timezone ?? ''}
          options={TIMEZONES.map((t) => [t, t.replace(/_/g, ' ')] as [string, string])}
          onChange={(v) => setSite({ ...site, timezone: v || undefined })}
        />
        <p className="-mt-2 mb-3 text-xs text-[#64748b]">Default: {config.timezone.replace(/_/g, ' ')}. Event times, dates and calendars use it; events on the old timezone keep their local times when it changes.</p>
        </>
      ),
    },
    {
      id: 'types',
      label: 'Types',
      panel: (
        <>
          <TypeTemplates value={site.templates ?? {}} off={site.listings_off ?? []} templates={templates} onChange={(m) => setSite({ ...site, templates: m })} onListings={(off) => setSite({ ...site, listings_off: off })} />
          <TaxonomyTemplatesPanel value={site.taxonomy_templates ?? {}} off={site.taxonomy_pages_off ?? []} templates={templates} onChange={(m) => setSite({ ...site, taxonomy_templates: Object.keys(m).length ? m : undefined })} onPages={(off) => setSite({ ...site, taxonomy_pages_off: off.length ? off : undefined })} />
        </>
      ),
    },
    {
      id: 'search',
      label: 'Search',
      panel: (
        <>
        <p className="mb-3 text-xs text-[#64748b]">What site search and its live results cover.</p>
        {SEARCHABLE_TYPES.map((type) => {
          const chosen = site.search_types ?? SEARCHABLE_TYPES;
          const on = chosen.includes(type);
          return (
            <Toggle
              key={type}
              title={typeDef(type)?.label ?? type}
              value={on}
              onChange={(v) => {
                const next = v ? SEARCHABLE_TYPES.filter((t) => t === type || chosen.includes(t)) : chosen.filter((t) => t !== type);
                if (!next.length) return setStatus('Search needs at least one type.');
                setSite({ ...site, search_types: next });
              }}
            />
          );
        })}
        </>
      ),
    },
    {
      id: 'social',
      label: 'Social',
      panel: (
        <>
        <p className="mb-3 text-xs text-[#64748b]">Profiles shown by the Social links block and listed for search engines.</p>
        {(site.social ?? []).map((l, i, all) => {
          const update = (patch: Partial<{ network: string; url: string }>) => setSite({ ...site, social: all.map((x, k) => (k === i ? { ...x, ...patch } : x)) });
          const move = (d: number) => {
            const next = [...all];
            [next[i], next[i + d]] = [next[i + d], next[i]];
            setSite({ ...site, social: next });
          };
          return (
            <div key={i} className="mb-3 rounded border border-[#1a1a2e]/10 bg-white p-2">
              <div className="mb-1 flex gap-2">
                <select aria-label="Network" className={inputClass} value={l.network} onChange={(e) => update({ network: e.target.value })}>
                  {Object.entries(NETWORKS).map(([k, n]) => (
                    <option key={k} value={k}>
                      {n.label}
                    </option>
                  ))}
                </select>
              </div>
              <input aria-label={`${NETWORKS[l.network]?.label ?? 'Link'} address`} className={inputClass} value={l.url} placeholder={l.network === 'email' ? 'mailto:info@example.org' : 'https://'} onChange={(e) => update({ url: e.target.value })} />
              {l.url && !/^(https?:\/\/|mailto:)/i.test(l.url.trim()) && <p className="mt-1 text-xs text-[#b3261e]">Start with https:// (or mailto: for email).</p>}
              <div className="mt-1 flex gap-3 text-xs">
                <button type="button" disabled={i === 0} className="disabled:opacity-30" onClick={() => move(-1)}>Up</button>
                <button type="button" disabled={i === all.length - 1} className="disabled:opacity-30" onClick={() => move(1)}>Down</button>
                <button type="button" className="text-[#b3261e]" onClick={() => setSite({ ...site, social: all.filter((_, k) => k !== i) })}>Remove</button>
              </div>
            </div>
          );
        })}
        <button type="button" className="mb-4 rounded-sm border border-dashed border-[#1a1a2e]/25 px-3 py-1.5 text-xs text-[#64748b] hover:border-[#1a1a2e]/50" onClick={() => setSite({ ...site, social: [...(site.social ?? []), { network: 'facebook', url: '' }] })}>
          Add link
        </button>
        <MediaPicker title="Site icon (favicon)" url={site.icon_preview ?? site.icons?.['192']} onSelect={(m) => setSite({ ...site, icon_media_id: m.id ?? m.mediaId ?? null, icon_preview: m.url })} />
        <p className="-mt-2 mb-3 text-xs text-[#64748b]">A square image at least 512px wide works best (it's cropped square around its focal point). Shown in browser tabs, on phone home screens and in the site header; made into the icon files when you save.</p>
        {(site.icon_media_id || site.icons?.['192']) && (
          <button type="button" className="mb-4 block text-xs text-[#b3261e]" onClick={() => setSite({ ...site, icon_media_id: null, icon_preview: undefined, icons: undefined })}>
            Remove site icon
          </button>
        )}
        <MediaPicker title="Default share image" url={site.share_image_url} onSelect={(m) => setSite({ ...site, share_image: m.id ?? m.mediaId ?? undefined, share_image_url: m.url })} />
        <p className="-mt-2 mb-3 text-xs text-[#64748b]">Shown when a page without its own image is shared.</p>
        {!!site.share_image && (
          <button type="button" className="mb-3 block text-xs text-[#b3261e]" onClick={() => setSite({ ...site, share_image: undefined, share_image_url: undefined })}>
            Remove default share image
          </button>
        )}
        </>
      ),
    },
    {
      id: 'menu',
      label: 'Menu',
      panel: (
        <>
          <p className="mb-3 text-xs text-[#64748b]">The Navigation block's items. An item with links, an intro or cards opens a panel; cards are the entries you pick, or the latest of a type (upcoming, for events).</p>
          <FieldsForm defs={MENU_FIELDS} value={options} onChange={setOptions} />
        </>
      ),
    },
    { id: 'redirects', label: 'Redirects', panel: <Redirects initial={redirects} notFound={notFound} /> },
    { id: 'sync', label: 'Sync', panel: <Sync /> },
    { id: 'backups', label: 'Backups', panel: <BackupsTab /> },
    ...(SITE_EDITOR.settingsFields?.length
      ? [{ id: 'site', label: SITE_EDITOR.settingsTitle ?? 'Site options', panel: <FieldsForm defs={SITE_EDITOR.settingsFields} value={options} onChange={setOptions} /> }]
      : []),
  ];
  const current = tabs.find((t) => t.id === tab) ?? tabs[0];
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const choose = (id: string, focus = false) => {
    setTab(id);
    history.replaceState(null, '', `#${id}`);
    if (focus) refs.current[id]?.focus();
  };
  const onKey = (e: KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.id === current.id);
    const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    choose(tabs[(to + tabs.length) % tabs.length].id, true);
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-[#1a1a2e]/10">
        <div role="tablist" aria-label="Settings" className="flex gap-1" onKeyDown={onKey}>
          {tabs.map((t) => {
            const selected = t.id === current.id;
            return (
              <button
                key={t.id}
                ref={(el) => {
                  refs.current[t.id] = el;
                }}
                type="button"
                role="tab"
                id={`settings-tab-${t.id}`}
                aria-selected={selected}
                aria-controls={`settings-panel-${t.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => choose(t.id)}
                className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${selected ? 'border-[#b87333] text-[#1a1a2e]' : 'border-transparent text-[#64748b] hover:text-[#1a1a2e]'}`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3 pb-2">
          <p className="text-xs text-[#64748b]" role="status">
            {status || (dirty ? 'Unsaved changes' : '')}
          </p>
          {/* Redirects, Sync and Backups save as they go; Save covers the other tabs. */}
          {(!['redirects', 'sync', 'backups'].includes(current.id) || dirty) && (
            <button type="button" onClick={save} className="rounded-sm bg-[#1a1a2e] px-4 py-2 text-xs font-semibold tracking-wider text-white uppercase hover:bg-[#b87333]">
              Save settings
            </button>
          )}
        </div>
      </div>
      {tabs.map((t) => (
        <section key={t.id} role="tabpanel" id={`settings-panel-${t.id}`} aria-labelledby={`settings-tab-${t.id}`} tabIndex={0} hidden={t.id !== current.id} className={['redirects', 'sync', 'backups'].includes(t.id) ? 'max-w-5xl' : t.id === 'site' || t.id === 'types' ? 'max-w-3xl' : 'max-w-md'}>
          {t.panel}
        </section>
      ))}
    </div>
  );
}

/** Types with pages of their own, and the template for their entries and their listing page. */
function TypeTemplates({ value, off, templates, onChange, onListings }: { value: TemplateMap; off: string[]; templates: TemplateInfo[]; onChange: (m: TemplateMap) => void; onListings: (off: string[]) => void }) {
  const have = new Set(templates.map((t) => t.slug));
  const types = CONTENT_TYPES.filter((t) => !PAGELESS_TYPES.has(t.type));
  const set = (type: string, kind: 'single' | 'archive', slug: string) => {
    const next: TemplateMap = { ...value, [type]: { ...value[type], [kind]: slug || undefined } };
    if (!next[type].single && !next[type].archive) delete next[type];
    onChange(next);
  };
  const pick = (type: string, kind: 'single' | 'archive') => {
    const chosen = chosenTemplate(value, type, kind);
    const fallback = defaultTemplates(type, kind).find((s) => have.has(s));
    const shown = chosen && have.has(chosen) ? chosen : fallback;
    const lacking = kind === 'single' && chosen && templates.some((t) => t.slug === chosen && !t.content);
    return (
      <>
      <div className="flex items-center gap-2">
        <select aria-label={`${typeDef(type)?.label ?? type}: ${kind === 'single' ? 'page' : 'listing'} template`} className={inputClass} value={chosen ?? ''} onChange={(e) => set(type, kind, e.target.value)}>
          <option value="">Default{fallback ? ` (${fallback})` : ''}</option>
          {templates.map((t) => (
            <option key={t.slug} value={t.slug}>
              {templateLabel(t)}
            </option>
          ))}
        </select>
        {shown && (
          <a className="shrink-0 text-xs text-[#b87333] hover:underline" href={`/admin/templates/template/${shown}/`}>
            Edit
          </a>
        )}
      </div>
      {lacking && <p className="mt-1 text-xs text-[#b3261e]">{NO_CONTENT_WARNING}</p>}
      </>
    );
  };
  return (
    <>
      <p className="mb-4 text-xs text-[#64748b]">The template for each type's pages, and its listing page: on or off, and its template. A template chosen on an entry itself (in its settings) comes first. Under each type, its taxonomies (set in the site config; each gets a picker in an entry's settings).</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-[#64748b]">
            <th className="pb-2 font-medium">Type</th>
            <th className="pb-2 font-medium">Pages</th>
            <th className="pb-2 font-medium">Listing page</th>
          </tr>
        </thead>
        <tbody>
          {types.map((t) => (
            <tr key={t.type} className="border-t border-[#1a1a2e]/10 align-top">
              <th scope="row" className="py-3 pr-4 text-left font-medium">
                {t.label}
                <span className="block text-xs font-normal text-[#64748b]">{TYPE_BASES[t.type] ? `/${TYPE_BASES[t.type]}/<slug>/` : '/<slug>/'}</span>
                <span className="block text-xs font-normal text-[#64748b]">{[...taxonomiesOf(t.type).map(taxonomyLabel), ...(t.type !== 'global' ? ['Tags'] : [])].join(', ') || 'No taxonomies'}</span>
              </th>
              <td className="py-3 pr-4">{pick(t.type, 'single')}</td>
              <td className="py-3">
                {ARCHIVE_PATHS[t.type] ? (
                  <>
                    <label className="mb-2 flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={!off.includes(t.type)} onChange={(e) => onListings(e.target.checked ? off.filter((x) => x !== t.type) : [...off, t.type])} />
                      On at {ARCHIVE_PATHS[t.type]}
                    </label>
                    {off.includes(t.type) ? (
                      <span className="block text-xs text-[#64748b]">Off: the address shows a page with that address, if there is one, or Not found.{t.type === 'event' ? ' The calendar views (month, day, past) are off too.' : ''}</span>
                    ) : (
                      pick(t.type, 'archive')
                    )}
                  </>
                ) : (
                  <span className="text-xs text-[#64748b]">No listing page</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

/** Settings > Types: the template for each taxonomy's term pages (a term can choose its own). */
function TaxonomyTemplatesPanel({ value, off, templates, onChange, onPages }: { value: Record<string, string>; off: string[]; templates: TemplateInfo[]; onChange: (m: Record<string, string>) => void; onPages: (off: string[]) => void }) {
  const have = new Set(templates.map((t) => t.slug));
  const taxonomies = config.taxonomies.filter((t) => t.base);
  return (
    <>
      <h3 className="mt-8 mb-1 text-sm font-semibold">Taxonomy pages</h3>
      <p className="mb-3 text-xs text-[#64748b]">Each taxonomy's term pages: on or off, and their template. A term can choose its own template under Content &gt; Taxonomies, and the terms under it share it. With the pages off, terms still group and filter entries, shown without links.</p>
      <table className="w-full text-sm">
        <tbody>
          {taxonomies.map((t) => {
            const fallback = defaultTaxonomyTemplates(t.name).find((s) => have.has(s));
            const chosen = value[t.name];
            const shown = chosen && have.has(chosen) ? chosen : fallback;
            return (
              <tr key={t.name} className="border-t border-[#1a1a2e]/10 align-top">
                <th scope="row" className="py-3 pr-4 text-left font-medium">
                  {t.label}
                  <span className="block text-xs font-normal text-[#64748b]">/{t.base}/&lt;slug&gt;/</span>
                </th>
                <td className="py-3">
                  <label className="mb-2 flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={!off.includes(t.name)} onChange={(e) => onPages(e.target.checked ? off.filter((x) => x !== t.name) : [...off, t.name])} />
                    On at /{t.base}/&lt;slug&gt;/
                  </label>
                  {off.includes(t.name) ? (
                    <span className="block text-xs text-[#64748b]">Off: those addresses show a page with that address, if there is one, or Not found.</span>
                  ) : (
                  <div className="flex items-center gap-2">
                    <select aria-label={`${t.label}: term page template`} className={inputClass} value={chosen ?? ''} onChange={(e) => {
                      const next = { ...value };
                      if (e.target.value) next[t.name] = e.target.value;
                      else delete next[t.name];
                      onChange(next);
                    }}>
                      <option value="">Default{fallback ? ` (${fallback})` : ''}</option>
                      {templates.map((tp) => (
                        <option key={tp.slug} value={tp.slug}>
                          {templateLabel(tp)}
                        </option>
                      ))}
                    </select>
                    {shown && (
                      <a className="shrink-0 text-xs text-[#b87333] hover:underline" href={`/admin/templates/template/${shown}/`}>
                        Edit
                      </a>
                    )}
                  </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
