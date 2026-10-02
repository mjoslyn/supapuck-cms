// Netlify _redirects generated at build time: media URLs proxy straight to Supabase Storage (a CDN
// rewrite, no function invocation; the Astro route at /media/ covers local dev), and path prefixes
// the site moved 301 to their new paths (src/site/moved-paths.json).
import fs from 'node:fs';

const url = process.env.PUBLIC_SUPABASE_URL;
const MOVES = JSON.parse(fs.readFileSync('src/site/moved-paths.json', 'utf8'));
const lines = MOVES.map(([from, to]) => (from.endsWith('/') ? `${from}*  ${to}:splat  301` : `${from}  ${to}  301`));
if (url) lines.unshift(`/media/*  ${url}/storage/v1/object/public/media/:splat  200`);
else console.warn('PUBLIC_SUPABASE_URL not set; /media/ is served by the Astro route');
fs.writeFileSync('public/_redirects', lines.join('\n') + '\n');
console.log('public/_redirects written');
