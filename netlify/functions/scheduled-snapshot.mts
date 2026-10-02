// Scheduled snapshots (Settings > Sync): once a day Netlify runs this on the deployed site, and if
// snapshots are on and one is due (daily or weekly), it takes a snapshot of this site into its private
// sync-backups bucket: everything a sync covers, as rows. Stored images aren't included. The logic is
// scheduledSnapshot in src/lib/sync.ts; schedules only run on published deploys, not under astro dev.
import { scheduledSnapshot } from '../../src/lib/sync';

export default async () => {
  try {
    console.log(`scheduled snapshot: ${await scheduledSnapshot()}`);
  } catch (e) {
    console.error(`scheduled snapshot failed: ${(e as Error).message}`);
  }
  return new Response('ok');
};

// 07:00 UTC: early morning in the Americas.
export const config = { schedule: '0 7 * * *' };
