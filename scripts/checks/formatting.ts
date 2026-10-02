// autop/texturize against known outputs (scripts/checks/formatting-cases.json): paragraphs, line breaks,
// lists, pre and code, comments, quotes, dashes and ellipses.
import fs from 'node:fs';
import { autop, texturize } from '../../src/lib/text/formatting';

const cases: { in: string; autop: string; texturize: string }[] = JSON.parse(fs.readFileSync(new URL('./formatting-cases.json', import.meta.url), 'utf8'));
let bad = 0;
const firstDiff = (want: string, got: string) => {
  let i = 0;
  while (i < want.length && want[i] === got[i]) i++;
  return `@${i}\n  want: ${JSON.stringify(want.slice(Math.max(0, i - 60), i + 80))}\n  got:  ${JSON.stringify(got.slice(Math.max(0, i - 60), i + 80))}`;
};
for (const c of cases) {
  for (const [name, fn] of [['autop', autop], ['texturize', texturize]] as const) {
    const got = fn(c.in);
    if (got !== c[name] && bad++ < 5) console.log(name.toUpperCase(), firstDiff(c[name], got));
  }
}
console.log(`${cases.length} cases; mismatches: ${bad}`);
process.exit(bad ? 1 : 0);
