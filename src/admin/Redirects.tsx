// Settings > Redirects: add, change, test and remove redirects (old address -> new), and the addresses
// visitors reached that were not found, each with a button to redirect it.
import { useMemo, useRef, useState } from 'react';
import { SITE_TZ } from '../lib/site';
import type { Redirect } from '../lib/redirects';

export interface NotFound {
  path: string;
  hits: number;
  last_seen_at: string;
  referrer: string;
}

const input = 'w-full rounded-sm border border-[#1a1a2e]/20 bg-white px-2.5 py-1.5 text-sm';
const when = (s: string | null) => (s ? new Date(s).toLocaleString('en-US', { timeZone: SITE_TZ, month: 'short', day: 'numeric', year: 'numeric' }) : 'never');
const blank = { id: 0, from: '', to: '', status: 301, note: '' };

export default function Redirects({ initial, notFound: initialNotFound }: { initial: Redirect[]; notFound: NotFound[] }) {
  const [rows, setRows] = useState(initial);
  const [notFound, setNotFound] = useState(initialNotFound);
  const [form, setForm] = useState(blank);
  const [status, setStatus] = useState('');
  const [filter, setFilter] = useState('');
  const fromRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? rows.filter((r) => `${r.from_path} ${r.to_url} ${r.note}`.toLowerCase().includes(q)) : rows;
  }, [rows, filter]);

  const save = async () => {
    setStatus('Saving…');
    const res = await fetch('/api/admin/redirects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (!res.ok) return setStatus(await res.text());
    const { redirect: row, cleared, warning } = (await res.json()) as { redirect: Redirect; cleared: string[]; warning?: string };
    setRows((all) => (form.id ? all.map((r) => (r.id === row.id ? row : r)) : [row, ...all]));
    // The server says which Not found entries it cleared; drop exactly those.
    const gone = new Set(cleared);
    setNotFound((all) => all.filter((n) => !gone.has(n.path)));
    const done = form.id ? `Changed ${row.from_path}.` : `Added ${row.from_path} → ${row.to_url}.`;
    setStatus(warning ? `${done} ${warning}` : cleared.length ? `${done} Cleared ${cleared.length} Not found ${cleared.length === 1 ? 'entry' : 'entries'}.` : done);
    setForm(blank);
    fromRef.current?.focus();
  };
  const remove = async (r: Redirect) => {
    if (!window.confirm(`Remove the redirect from ${r.from_path}?`)) return;
    const res = await fetch(`/api/admin/redirects?id=${r.id}`, { method: 'DELETE' });
    if (!res.ok) return setStatus(await res.text());
    setRows((all) => all.filter((x) => x.id !== r.id));
    setStatus(`Removed ${r.from_path}.`);
  };
  const dismiss = async (path: string) => {
    const res = await fetch(`/api/admin/redirects?notFound=${encodeURIComponent(path)}`, { method: 'DELETE' });
    if (!res.ok) return setStatus(`Could not clear ${path === 'all' ? 'the Not found list' : path}: ${await res.text()}`);
    setNotFound((all) => (path === 'all' ? [] : all.filter((n) => n.path !== path)));
  };

  return (
    <div className="max-w-5xl">
      <section className="mb-8 rounded border border-[#1a1a2e]/10 bg-white p-4" aria-labelledby="redirect-form-title">
        <h2 id="redirect-form-title" className="mb-3 text-sm font-semibold tracking-wider text-[#64748b] uppercase">
          {form.id ? 'Change redirect' : 'Add a redirect'}
        </h2>
        <form
          className="grid gap-3 md:grid-cols-[1fr_1fr_10rem]"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <label className="block text-xs text-[#64748b]">
            Old address
            <input ref={fromRef} required className={`${input} mt-1`} value={form.from} placeholder="/old-page/ or /old-section/*" onChange={(e) => setForm({ ...form, from: e.target.value })} />
          </label>
          <label className="block text-xs text-[#64748b]">
            New address
            <input ref={toRef} required className={`${input} mt-1`} value={form.to} placeholder="/new-page/ or https://…" onChange={(e) => setForm({ ...form, to: e.target.value })} />
          </label>
          <label className="block text-xs text-[#64748b]">
            Type
            <select className={`${input} mt-1`} value={form.status} onChange={(e) => setForm({ ...form, status: Number(e.target.value) })}>
              <option value={301}>Permanent (301)</option>
              <option value={302}>Temporary (302)</option>
            </select>
          </label>
          <label className="block text-xs text-[#64748b] md:col-span-2">
            Note (optional)
            <input className={`${input} mt-1`} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </label>
          <div className="flex items-end gap-2">
            <button type="submit" className="rounded-sm bg-[#1a1a2e] px-4 py-2 text-xs font-semibold tracking-wider text-white uppercase hover:bg-[#b87333]">
              {form.id ? 'Save' : 'Add'}
            </button>
            {form.id > 0 && (
              <button type="button" className="px-2 py-2 text-xs text-[#64748b]" onClick={() => setForm(blank)}>
                Cancel
              </button>
            )}
          </div>
        </form>
        <p className="mt-3 text-xs text-[#64748b]">
          Redirects apply to addresses that would otherwise be Not found, so they never hide a live page. End the old address with * to move a whole section: /old-blog/* to /news/* sends /old-blog/any-post/ to
          /news/any-post/. Pages whose address changes get a redirect automatically.
        </p>
        <p className="mt-2 text-xs text-[#1a1a2e]" role="status">
          {status}
        </p>
      </section>

      <section className="mb-10" aria-labelledby="redirects-title">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="redirects-title" className="text-sm font-semibold tracking-wider text-[#64748b] uppercase">
            Redirects ({rows.length})
          </h2>
          <input aria-label="Filter redirects" className={`${input} max-w-xs`} placeholder="Filter" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
        {shown.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[#64748b]">
                <th className="pb-2 font-medium">Old address</th>
                <th className="pb-2 font-medium">New address</th>
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 font-medium">Used</th>
                <th className="pb-2 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="border-t border-[#1a1a2e]/10 align-top">
                  <td className="py-2 pr-3 font-mono text-xs break-all">
                    {r.from_path}
                    {r.note && <span className="mt-0.5 block font-sans text-[#64748b]">{r.note}</span>}
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs break-all">
                    <a className="hover:underline" href={r.to_url.replace('*', '')} target="_blank" rel="noopener">
                      {r.to_url}
                    </a>
                  </td>
                  <td className="py-2 pr-3 text-xs">{r.status === 301 ? 'Permanent' : 'Temporary'}</td>
                  <td className="py-2 pr-3 text-xs text-[#64748b]">
                    {r.hits} {r.hits === 1 ? 'time' : 'times'}
                    <span className="block">last {when(r.last_hit_at)}</span>
                  </td>
                  <td className="py-2 text-right text-xs whitespace-nowrap">
                    {!r.from_path.endsWith('*') && (
                      <a className="mr-3 text-[#b87333] hover:underline" href={r.from_path} target="_blank" rel="noopener">
                        Test
                      </a>
                    )}
                    <button
                      type="button"
                      className="mr-3"
                      onClick={() => {
                        setForm({ id: r.id, from: r.from_path, to: r.to_url, status: r.status, note: r.note });
                        fromRef.current?.focus();
                      }}
                    >
                      Edit
                    </button>
                    <button type="button" className="text-[#b3261e]" onClick={() => remove(r)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-[#64748b]">{rows.length ? 'No redirects match.' : 'No redirects yet.'}</p>
        )}
      </section>

      <section aria-labelledby="not-found-title">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <h2 id="not-found-title" className="text-sm font-semibold tracking-wider text-[#64748b] uppercase">
            Not found ({notFound.length})
          </h2>
          {notFound.length > 0 && (
            <button type="button" className="text-xs text-[#b3261e]" onClick={() => window.confirm('Clear the whole Not found list?') && dismiss('all')}>
              Clear all
            </button>
          )}
        </div>
        <p className="mb-3 text-xs text-[#64748b]">Addresses visitors reached that don't exist, most often first. Redirect the ones that should lead somewhere.</p>
        {notFound.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[#64748b]">
                <th className="pb-2 font-medium">Address</th>
                <th className="pb-2 font-medium">Visits</th>
                <th className="pb-2 font-medium">From</th>
                <th className="pb-2 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {notFound.map((n) => (
                <tr key={n.path} className="border-t border-[#1a1a2e]/10 align-top">
                  <td className="py-2 pr-3 font-mono text-xs break-all">{n.path}</td>
                  <td className="py-2 pr-3 text-xs text-[#64748b]">
                    {n.hits}
                    <span className="block">last {when(n.last_seen_at)}</span>
                  </td>
                  <td className="max-w-[16rem] py-2 pr-3 text-xs break-all text-[#64748b]">{n.referrer || '—'}</td>
                  <td className="py-2 text-right text-xs whitespace-nowrap">
                    <button
                      type="button"
                      className="mr-3 text-[#b87333] hover:underline"
                      onClick={() => {
                        setForm({ ...blank, from: n.path });
                        toRef.current?.focus();
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      Add redirect
                    </button>
                    <button type="button" className="text-[#64748b]" onClick={() => dismiss(n.path)}>
                      Dismiss
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-[#64748b]">Nothing yet.</p>
        )}
      </section>
    </div>
  );
}
