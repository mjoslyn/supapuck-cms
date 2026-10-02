// Copy storage objects (the media library and its sizes/AVIF/WebP copies) from the local Supabase to a
// hosted project. Resumable: objects already on the target are skipped. The target comes from
// TARGET_SUPABASE_URL and TARGET_SERVICE_ROLE_KEY; the source is the local stack in .env.
//   TARGET_SUPABASE_URL=... TARGET_SERVICE_ROLE_KEY=... npx tsx --env-file=.env scripts/copy-storage.ts [bucket]
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const bucket = process.argv[2] ?? 'media';
const src = createClient(process.env.PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const dst = createClient(process.env.TARGET_SUPABASE_URL!, process.env.TARGET_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
if (!process.env.TARGET_SUPABASE_URL || !process.env.TARGET_SERVICE_ROLE_KEY) throw new Error('Set TARGET_SUPABASE_URL and TARGET_SERVICE_ROLE_KEY.');
if (process.env.TARGET_SUPABASE_URL === process.env.PUBLIC_SUPABASE_URL) throw new Error('Source and target are the same project.');

/** Every object path in a bucket, walking folders (list() is one level at a time). */
async function listAll(db: SupabaseClient, prefix = ''): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.storage.from(bucket).list(prefix, { limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw error;
    for (const o of data) {
      const path = prefix ? `${prefix}/${o.name}` : o.name;
      if (o.id === null) for (const [k, v] of await listAll(db, path)) out.set(k, v);
      else out.set(path, (o.metadata as any)?.mimetype ?? 'application/octet-stream');
    }
    if (data.length < 1000) break;
  }
  return out;
}

const [have, want] = await Promise.all([listAll(dst), listAll(src)]);
const todo = [...want].filter(([p]) => !have.has(p));
console.log(`${want.size} objects in ${bucket}; ${have.size} already there; copying ${todo.length}`);

let done = 0;
let failed = 0;
const started = Date.now();
async function worker() {
  for (;;) {
    const next = todo.shift();
    if (!next) return;
    const [path, type] = next;
    for (let attempt = 1; ; attempt++) {
      try {
        const { data, error } = await src.storage.from(bucket).download(path);
        if (error) throw error;
        const { error: up } = await dst.storage.from(bucket).upload(path, data, { contentType: type, cacheControl: '31536000', upsert: true });
        if (up) throw up;
        break;
      } catch (e) {
        if (attempt >= 3) {
          failed++;
          console.error(`failed ${path}: ${(e as Error).message}`);
          break;
        }
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
    if (++done % 500 === 0) console.log(`${done} copied (${Math.round((Date.now() - started) / 1000)}s)`);
  }
}
await Promise.all(Array.from({ length: 12 }, worker));
console.log(`done: ${done - failed} copied, ${failed} failed, ${Math.round((Date.now() - started) / 1000)}s`);
