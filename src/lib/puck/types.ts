// The block tree stored in content (Puck data): items of the site's own components.

export interface BlockProps {
  id: string;
  attrs: Record<string, any>;
  /** Imported, stored HTML around the inner blocks, kept until the block is edited. */
  html?: string[] | null;
  /** Imported raw markup some blocks reuse. */
  saved?: (string | null)[] | null;
  children?: PuckItem[];
}

export interface PuckItem {
  type: string;
  props: BlockProps;
}
