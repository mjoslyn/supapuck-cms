// The compose worker. A Netlify function whose name ends in `-background` answers 202 at once and runs on
// for up to 15 minutes with nobody waiting, which is what a compose build needs (30-90s or more; a
// request is cut off long before that). It has no logic of its own: runJob (src/lib/compose/job.ts) is
// the same code astro dev runs in-process. It claims the job only with the token the API gave it, and
// writes every outcome, failures included, to the job row the panel polls.
import { runJob } from '../../src/lib/compose/job';

export default async (req: Request) => {
  let body: { jobId?: string; token?: string } = {};
  try {
    body = await req.json();
  } catch {}
  if (!body.jobId || !body.token) return new Response('bad request', { status: 400 });
  await runJob(body.jobId, body.token);
  return new Response('ok');
};
