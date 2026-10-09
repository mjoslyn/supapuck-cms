// The restore worker (Settings > Backups). A function whose name ends in `-background` answers 202 at
// once and runs on for up to 15 minutes: a restore deletes rows and writes thousands back, and a
// request cut off halfway would leave the site half restored. The logic is runRestore in
// src/lib/sync.ts, which runs a job only once and only if the API queued it under this id; the screen
// polls the job. The pages' CDN copies are cleared when a restore on this site is done.
import { purgeCache } from '@netlify/functions';
import { runRestore } from '../../src/lib/sync';
import { PAGE_CACHE_TAG } from '../../src/lib/cache';

export default async (req: Request) => {
  const { job } = await req.json().catch(() => ({}));
  if (typeof job !== 'string') return new Response('bad request', { status: 400 });
  const done = await runRestore(job).catch((e: Error) => (console.error(`restore ${job}: ${e.message}`), null));
  if (done?.site === 'here') await purgeCache({ tags: [PAGE_CACHE_TAG] }).catch((e: Error) => console.error(`page cache purge failed: ${e.message}`));
  return new Response('ok');
};
