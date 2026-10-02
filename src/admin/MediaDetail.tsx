// Media library detail panel: alt text, title, caption, and the focal point (click or drag on the
// image). Crop previews show how the image fills common shapes. Opens on `cms:media-open` events.
import { useCallback, useEffect, useRef, useState } from 'react';
import { browserClient } from '../lib/supabase-browser';
import { mediaUrl } from '../lib/media/image';
import type { Media } from '../lib/types';
import { SHAPES, position, type Point } from '../lib/media/focal';

const input = 'w-full rounded border border-[#1a1a2e]/15 bg-white px-2 py-1.5 text-sm outline-none focus:border-[#b87333]';
const label = 'mb-1 block text-xs font-medium text-[#64748b]';

type Row = Media & { processed_at?: string | null };

export default function MediaDetail() {
  const [m, setM] = useState<Row | null>(null);
  const [draft, setDraft] = useState<{ alt: string; title: string; caption: string; focal: Point | null; crops: Record<string, Point> }>({ alt: '', title: '', caption: '', focal: null, crops: {} });
  // Which point clicks on the image set: the main one, or a crop shape's own.
  const [editing, setEditing] = useState<string>('main');
  const [status, setStatus] = useState('');
  const frame = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    const open = async (e: Event) => {
      const id = (e as CustomEvent<number>).detail;
      setStatus('');
      const { data } = await browserClient().from('media').select('*').eq('id', id).single();
      if (!data) return;
      setM(data as Row);
      setDraft({ alt: data.alt ?? '', title: data.title ?? '', caption: data.caption ?? '', focal: data.focal_point ?? null, crops: data.crop_focals ?? {} });
      setEditing('main');
    };
    window.addEventListener('cms:media-open', open);
    document.body.dataset.mediaReady = '1';
    return () => window.removeEventListener('cms:media-open', open);
  }, []);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setM(null);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);

  const pick = useCallback((e: { clientX: number; clientY: number }) => {
    const r = frame.current?.getBoundingClientRect();
    if (!r) return;
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    const p = { x: +x.toFixed(3), y: +y.toFixed(3) };
    setDraft((d) => (editing === 'main' ? { ...d, focal: p } : { ...d, crops: { ...d.crops, [editing]: p } }));
  }, [editing]);

  if (!m) return null;
  const src = mediaUrl((m.sizes?.large ?? m.sizes?.medium_large ?? m).path);
  const focal = draft.focal ?? { x: 0.5, y: 0.5 };
  const pointFor = (key: string) => draft.crops[key] ?? focal;
  const marker = editing === 'main' ? focal : pointFor(editing);
  const focusChanged = JSON.stringify(draft.focal) !== JSON.stringify(m.focal_point ?? null) || JSON.stringify(draft.crops) !== JSON.stringify(m.crop_focals ?? {});
  const changed = draft.alt !== (m.alt ?? '') || draft.title !== (m.title ?? '') || draft.caption !== (m.caption ?? '') || focusChanged;
  const formats = Object.keys(m.formats ?? {});

  const save = async () => {
    setStatus(focusChanged ? 'Saving and re-cropping thumbnails...' : 'Saving...');
    const res = await fetch(`/api/admin/media/${m.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alt: draft.alt, title: draft.title, caption: draft.caption, focal_point: draft.focal, crop_focals: draft.crops }) });
    if (!res.ok) return setStatus(await res.text());
    setM(await res.json());
    setStatus('Saved');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1a2e]/50 p-6" onClick={() => setM(null)}>
      <div className="flex max-h-full w-full max-w-5xl overflow-hidden rounded bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex min-w-0 flex-1 flex-col bg-[#f1efeb] p-4">
          <div className="mb-2 flex flex-wrap items-center gap-1 text-xs">
            <span className="mr-1 text-[#64748b]">Click the image to set the focal point for</span>
            {[{ key: 'main', name: 'All crops' }, ...SHAPES].map((s) => (
              <button key={s.key} type="button" onClick={() => setEditing(s.key)} className={`rounded px-2 py-0.5 ${editing === s.key ? 'bg-[#1a1a2e] text-white' : 'bg-white text-[#1a1a2e] hover:bg-[#e5e1dc]'}`}>
                {s.name}
              </button>
            ))}
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <div
              ref={frame}
              className="relative cursor-crosshair select-none"
              onMouseDown={(e) => {
                dragging.current = true;
                pick(e);
              }}
              onMouseMove={(e) => dragging.current && pick(e)}
              onMouseUp={() => (dragging.current = false)}
              onMouseLeave={() => (dragging.current = false)}
            >
              <img src={src} alt="" draggable={false} className="block max-h-[60vh] max-w-full" />
              <span
                className="pointer-events-none absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(26,26,46,0.6),inset_0_0_0_2px_rgba(26,26,46,0.6)]"
                style={{ left: `${marker.x * 100}%`, top: `${marker.y * 100}%` }}
              />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-3">
            {SHAPES.map((s) => (
              <figure key={s.key} className="m-0">
                <button type="button" onClick={() => setEditing(s.key)} className={`block w-full rounded ${editing === s.key ? 'ring-2 ring-[#b87333] ring-offset-2' : ''}`}>
                  <img src={src} alt="" className="block w-full rounded object-cover" style={{ aspectRatio: s.key.replace('/', ' / '), objectPosition: position(pointFor(s.key)) }} />
                </button>
                <figcaption className="mt-1 text-center text-[11px] text-[#64748b]">
                  {s.name} · {draft.crops[s.key] ? 'own point' : 'main point'}
                  {draft.crops[s.key] && (
                    <button type="button" className="ml-1 underline" onClick={() => setDraft({ ...draft, crops: Object.fromEntries(Object.entries(draft.crops).filter(([k]) => k !== s.key)) })}>
                      reset
                    </button>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
        <aside className="w-80 shrink-0 overflow-y-auto p-4">
          <div className="mb-3 flex items-start justify-between gap-2">
            <p className="text-sm font-medium break-all">{m.path.split('/').pop()}</p>
            <button type="button" className="text-sm text-[#64748b] hover:text-[#1a1a2e]" onClick={() => setM(null)}>
              Close
            </button>
          </div>
          <label className="mb-3 block">
            <span className={label}>Alt text (describes the image for screen readers)</span>
            <textarea className={input} rows={3} value={draft.alt} onChange={(e) => setDraft({ ...draft, alt: e.target.value })} />
          </label>
          <label className="mb-3 block">
            <span className={label}>Title</span>
            <input className={input} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </label>
          <label className="mb-3 block">
            <span className={label}>Caption</span>
            <textarea className={input} rows={2} value={draft.caption} onChange={(e) => setDraft({ ...draft, caption: e.target.value })} />
          </label>
          <div className="mb-3 flex items-center justify-between text-xs text-[#64748b]">
            <span>Main focal point: {draft.focal ? `${Math.round(focal.x * 100)}%, ${Math.round(focal.y * 100)}%` : 'centre (default)'}</span>
            {draft.focal && (
              <button type="button" className="underline" onClick={() => setDraft({ ...draft, focal: null })}>
                Reset
              </button>
            )}
          </div>
          <button type="button" disabled={!changed || status.startsWith('Saving')} onClick={save} className="w-full rounded bg-[#b87333] px-4 py-2 text-sm font-medium text-white hover:bg-[#9a5f2a] disabled:opacity-40">
            Save
          </button>
          {status && <p className={`mt-2 text-xs ${status === 'Saved' ? 'text-[#047857]' : 'text-[#64748b]'}`}>{status}</p>}
          <dl className="mt-5 space-y-1 border-t border-[#1a1a2e]/10 pt-3 text-xs text-[#64748b]">
            <div className="flex justify-between">
              <dt>Dimensions</dt>
              <dd>{m.width && m.height ? `${m.width} × ${m.height}` : '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Type</dt>
              <dd>{m.mime_type}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Modern formats</dt>
              <dd>{formats.length ? formats.map((f) => f.toUpperCase()).join(', ') : m.processed_at ? 'Not applicable' : 'Pending'}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Sizes</dt>
              <dd>{Object.keys(m.sizes ?? {}).filter((k) => k !== 'original_image').length}</dd>
            </div>
          </dl>
          <a href={mediaUrl(m.path)} target="_blank" className="mt-3 inline-block text-xs text-[#64748b] underline hover:text-[#b87333]">
            Open original
          </a>
        </aside>
      </div>
    </div>
  );
}
