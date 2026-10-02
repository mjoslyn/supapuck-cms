// Editor adapter: renders a block with the public site's string renderer, then parses the HTML into
// React so Puck can attach its drag handle and drop zones. Where the renderer asks for inner blocks,
// the Puck slot is rendered as the wrapper element itself (so the "> * + *" layout rules still
// apply); repeated loop items after the first are rendered statically.
import { createContext, createElement, useContext, type ReactNode } from 'react';
import parse, { attributesToProps, domToReact, Element, type DOMNode, type HTMLReactParserOptions } from 'html-react-parser';
import { useGetPuck } from '@puckeditor/core';
import { rendererFor, renderItems } from '../render/engine';
import type { Block, Env, Inner } from '../render/env';
import type { PuckItem } from '../lib/puck/types';

export const EnvContext = createContext<Env | null>(null);
export const useEnv = () => {
  const env = useContext(EnvContext);
  if (!env) throw new Error('Editor env missing');
  return env;
};

const SLOT = 'cms-slot';

export interface BlockViewProps {
  type: string;
  id: string;
  attrs: Record<string, any>;
  html?: string[] | null;
  saved?: (string | null)[] | null;
  children?: (props?: Record<string, unknown>) => ReactNode;
  puck?: { dragRef: ((el: Element | null) => void) | null; isEditing: boolean };
}

/** Render a string of HTML without a wrapper element. */
export function StaticHtml({ html }: { html: string }) {
  return <>{parse(html)}</>;
}

const cssToObject = (style: string | undefined) => {
  if (!style) return undefined;
  const out: Record<string, string> = {};
  for (const decl of style.split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const p = decl.slice(0, i).trim();
    out[p.startsWith('--') ? p : p.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = decl.slice(i + 1).trim();
  }
  return out;
};

export function BlockView({ type, id, attrs = {}, html, saved, children: Slot, puck }: BlockViewProps) {
  const env = useEnv();
  const getPuck = useGetPuck();

  const childCount = () => (((getPuck().getItemById(id)?.props as any)?.children ?? []) as unknown[]).length;
  const calls: Partial<Env>[] = [];
  const inner = ((over: Partial<Env> = {}) => {
    calls.push(over);
    return `<${SLOT} data-i="${calls.length - 1}"></${SLOT}>`;
  }) as Inner;
  // One entry per child so saved HTML between inner blocks interleaves exactly as on the site;
  // the live slot sits at the first child's position.
  inner.each = (over) => {
    const n = Math.max(1, childCount());
    return [inner(over), ...Array.from({ length: n - 1 }, () => '')];
  };

  let out: string;
  try {
    out = rendererFor(type)({ type, id, attrs, html, saved } as Block, env, inner);
  } catch (e) {
    out = `<div class="cms-editor-note">${type}: ${(e as Error).message}</div>`;
  }
  if (!out.trim() && type === 'entry-content') out = `<div class="cms-editor-note">Page content: ${String(attrs.area || 'main').replace(/[<&"]/g, '')}${attrs.area && attrs.area !== 'main' ? ' (filled in on each page)' : " (the page's own content)"}</div>`;
  if (!out.trim()) out = `<div class="cms-editor-note">${type.replace(/^core\//, '')} (renders nothing here)</div>`;

  const childEnv = (i: number): Env => ({ ...env, parentLayout: attrs.layout ?? null, ...calls[i] });
  const childItems = (): PuckItem[] => ((getPuck().getItemById(id)?.props as any)?.children ?? []) as PuckItem[];

  let dragAttached = false;
  const options: HTMLReactParserOptions = {
    replace(node: DOMNode) {
      if (!(node instanceof Element)) return undefined;
      const isRoot = !dragAttached && !node.parent;
      if (isRoot) dragAttached = true;

      // Marker handling happens at the marker's parent so the slot can become that element.
      const markers = node.children.filter((c) => c instanceof Element && c.name === SLOT) as Element[];
      const significant = node.children.filter((c) => !(c.type === 'text' && !(c as any).data.trim()));
      if (markers.length === 1 && significant.length === 1) {
        const i = Number(markers[0].attribs['data-i']);
        const props = attributesToProps(node.attribs) as Record<string, any>;
        if (i === 0 && Slot) {
          return (
            <EnvContext.Provider value={childEnv(0)}>
              {Slot({ as: node.name, className: props.className, style: props.style, ...(isRoot && puck?.dragRef ? { ref: puck.dragRef } : {}) } as any)}
            </EnvContext.Provider>
          ) as any;
        }
        return createElement(node.name, { ...props, key: i }, parse(renderItems(childItems(), childEnv(i)))) as any;
      }
      if (node.name === SLOT) {
        const i = Number(node.attribs['data-i']);
        if (i === 0 && Slot) return (<EnvContext.Provider value={childEnv(0)}>{Slot({ style: { display: 'contents' } } as any)}</EnvContext.Provider>) as any;
        return (<StaticHtml html={renderItems(childItems(), childEnv(i))} />) as any;
      }
      if (isRoot && puck?.dragRef) {
        const kids = node.children.length ? domToReact(node.children as DOMNode[], options) : undefined;
        return createElement(node.name, { ...attributesToProps(node.attribs), ref: puck.dragRef }, kids) as any;
      }
      return undefined;
    },
  };
  const tree = parse(out, options);
  // Blocks whose output starts with text still need a draggable root.
  if (!dragAttached && puck?.dragRef) return <div ref={puck.dragRef as any} style={{ display: 'contents' }}>{tree}</div>;
  return <>{tree}</>;
}

export { cssToObject };
