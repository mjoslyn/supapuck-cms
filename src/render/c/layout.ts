// Container layouts. Flex and grid settings are inline styles on the container; flow gaps and
// constrained widths apply to the children, so they are emitted as small per-instance rules on an
// l-<hash> class (collected into the page's <style>, deduplicated).
import type { RenderCtx } from '../env';
import type { Decl, Sides } from './style';

export interface Layout {
  type?: 'flow' | 'constrained' | 'row' | 'stack' | 'grid';
  contentSize?: string;
  wideSize?: string;
  justify?: 'left' | 'center' | 'right' | 'space-between' | 'stretch';
  align?: 'top' | 'center' | 'bottom' | 'stretch' | 'space-between';
  wrap?: boolean;
  columns?: number;
  minColumnWidth?: string;
}

export type Gap = string | { row?: string; column?: string };

const LAYOUT_CLASS = { flow: 'c-flow', constrained: 'c-constrained', row: 'c-row', stack: 'c-stack', grid: 'c-grid' } as const;

function hash(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

export interface LayoutOut {
  classes: string[];
  decls: Decl[];
}

/** Classes and inline declarations for a container, registering any child rules on ctx.css. */
export function layout(ctx: RenderCtx, l: Layout | undefined, gap: Gap | undefined, padding?: Sides): LayoutOut {
  const type = l?.type ?? 'flow';
  const classes: string[] = [LAYOUT_CLASS[type]];
  const decls: Decl[] = [];
  const rules: string[] = [];

  if (type === 'flow' || type === 'constrained') {
    const g = typeof gap === 'object' ? gap.row : gap;
    if (g) rules.push(`>*{margin-block-start:0;margin-block-end:0}`, `>*+*{margin-block-start:${g};margin-block-end:0}`);
  }
  if (type === 'constrained') {
    const content = l?.contentSize || l?.wideSize;
    const wide = l?.wideSize || l?.contentSize;
    const justify = l?.justify ?? 'center';
    if (content) {
      const ml = justify === 'left' ? '0' : 'auto';
      const mr = justify === 'right' ? '0' : 'auto';
      rules.push(`>:where(:not(.is-left):not(.is-right):not(.is-full)){max-width:${content};margin-left:${ml}!important;margin-right:${mr}!important}`, `>.is-wide{max-width:${wide}}`);
      // Accent rules line up with the content column's left edge, like the heading below them.
      if (justify === 'center') rules.push(`:not([style*="text-align:center"])>.c-separator.is-accent:not(.is-center):not(:has(+[style*="text-align:center"])){margin-left:max(0px,calc((100% - ${content}) / 2))!important;margin-right:auto!important}`);
    } else if (justify !== 'center') {
      rules.push(`>:where(:not(.is-left):not(.is-right):not(.is-full)){margin-${justify === 'left' ? 'left' : 'right'}:0!important}`);
    }
    // Full-width children reach past the container's side padding.
    if (padding?.right) rules.push(`>.is-full{margin-right:calc(${padding.right === '0' ? '0px' : padding.right} * -1)}`);
    if (padding?.left) rules.push(`>.is-full{margin-left:calc(${padding.left === '0' ? '0px' : padding.left} * -1)}`);
  }
  if (type === 'row' || type === 'stack' || type === 'grid') {
    const g = typeof gap === 'object' ? [gap.row, gap.column].filter(Boolean).join(' ') : gap;
    if (g) decls.push(['gap', g]);
  }
  if (type === 'row') {
    const justify = ({ left: 'flex-start', right: 'flex-end', center: 'center', 'space-between': 'space-between' } as Record<string, string>)[l?.justify ?? ''];
    const align = ({ top: 'flex-start', center: 'center', bottom: 'flex-end', stretch: 'stretch' } as Record<string, string>)[l?.align ?? ''];
    if (l?.wrap === false) decls.push(['flex-wrap', 'nowrap']);
    if (justify) decls.push(['justify-content', justify]);
    if (align) decls.push(['align-items', align]);
  }
  if (type === 'stack') {
    const justify = ({ left: 'flex-start', right: 'flex-end', center: 'center', stretch: 'stretch' } as Record<string, string>)[l?.justify ?? ''];
    const align = ({ top: 'flex-start', center: 'center', bottom: 'flex-end', 'space-between': 'space-between' } as Record<string, string>)[l?.align ?? ''];
    if (justify) decls.push(['align-items', justify]);
    if (align) decls.push(['justify-content', align]);
    if (l?.wrap === false) decls.push(['flex-wrap', 'nowrap']);
  }
  if (type === 'grid') {
    if (l?.columns) decls.push(['grid-template-columns', `repeat(${l.columns}, minmax(0, 1fr))`]);
    else decls.push(['grid-template-columns', `repeat(auto-fill, minmax(min(${l?.minColumnWidth || '12rem'}, 100%), 1fr))`], ['container-type', 'inline-size']);
  }

  if (rules.length) {
    const cls = `l-${hash(rules.join(''))}`;
    classes.push(cls);
    const css = rules.map((r) => `.${cls}${r}`).join('');
    if (!ctx.css.includes(css)) ctx.css.push(css);
  }
  return { classes, decls };
}
