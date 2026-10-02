// String renderer for Puck item trees. The public site outputs these strings verbatim.
import type { PuckItem } from '../lib/puck/types';
import type { Block, Env, Inner, Renderer } from './env';
import { visibilityPasses } from './blocks/visibility';

const registry = new Map<string, Renderer>();
let fallback: Renderer = () => '';

export function register(map: Record<string, Renderer>, fallbackRenderer?: Renderer) {
  for (const [k, v] of Object.entries(map)) registry.set(k, v);
  if (fallbackRenderer) fallback = fallbackRenderer;
}

export const rendererFor = (type: string): Renderer => registry.get(type) ?? fallback;

/** Whether a block type has a renderer (a known component). */
export const isRegistered = (type: string) => registry.has(type);

export function toBlock(item: PuckItem): Block {
  return { type: item.type, ...item.props } as Block;
}

export function innerFor(item: PuckItem, env: Env): Inner {
  const childEnv = (over: Partial<Env> = {}): Env => ({ ...env, parentLayout: item.props.attrs?.layout ?? null, ...over });
  const inner = ((over?: Partial<Env>) => renderItems(item.props.children, childEnv(over))) as Inner;
  inner.each = (over) => (item.props.children ?? []).map((c) => renderItem(c, childEnv(over)));
  return inner;
}

export function renderItem(item: PuckItem, env: Env): string {
  // Visibility rules apply to every block.
  const vis = item.props.attrs?.visibility;
  if (vis?.enabled && !visibilityPasses(vis.rules ?? {})) return '';
  const out = rendererFor(item.type)(toBlock(item), env, innerFor(item, env));
  // A block is recorded after its inner blocks, so styles load in that order.
  if (!env.ctx.rendered.includes(item.type)) env.ctx.rendered.push(item.type);
  return out;
}

/** Record the block types in a subtree whose output is not shown, so their assets still load. */
export function markRendered(items: PuckItem[] | undefined, env: Env) {
  for (const item of items ?? []) {
    markRendered(item.props.children, env);
    if (!env.ctx.rendered.includes(item.type)) env.ctx.rendered.push(item.type);
  }
}

export function renderItems(items: PuckItem[] | undefined, env: Env): string {
  if (!items?.length) return '';
  let out = '';
  for (const item of items) out += renderItem(item, env);
  return out;
}
