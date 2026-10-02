// Render block HTML as React, placing a child node (the Puck slot) where inner blocks go.
import parse, { type DOMNode, Element, type HTMLReactParserOptions } from 'html-react-parser';
import type { ReactNode } from 'react';

const SLOT_TAG = 'cms-slot';
const SLOT = `<${SLOT_TAG}></${SLOT_TAG}>`;

/** Join markup chunks, marking where inner blocks render. */
export function joinChunks(chunks: string[]): string {
  if (chunks.length <= 1) return chunks[0] ?? '';
  const middle = chunks.slice(1, -1).filter((c) => c.trim());
  return chunks[0] + SLOT + middle.join('') + chunks[chunks.length - 1];
}

export function Html({ html, slot, replace }: { html: string; slot?: ReactNode; replace?: (el: Element) => ReactNode | undefined }) {
  const options: HTMLReactParserOptions = {
    replace(node: DOMNode) {
      if (node instanceof Element) {
        if (node.name === SLOT_TAG) return <>{slot}</>;
        const r = replace?.(node);
        if (r !== undefined) return r as any;
      }
      return undefined;
    },
  };
  return <>{parse(html, options)}</>;
}

export function Chunks({ chunks, slot }: { chunks: string[]; slot?: ReactNode }) {
  return <Html html={joinChunks(chunks)} slot={slot} />;
}

/** Add classes to the first element of an HTML string. */
export function addClassToFirstTag(html: string, classes: string[]): string {
  if (!classes.length) return html;
  return html.replace(/<([a-zA-Z][\w-]*)([^>]*)>/, (m, tag, rest: string) => {
    const cls = rest.match(/\sclass=(["'])(.*?)\1/);
    if (cls) {
      const existing = cls[2].split(/\s+/).filter(Boolean);
      const merged = [...existing, ...classes.filter((c) => !existing.includes(c))].join(' ');
      return `<${tag}${rest.replace(cls[0], ` class="${merged}"`)}>`;
    }
    return `<${tag} class="${classes.join(' ')}"${rest}>`;
  });
}

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
