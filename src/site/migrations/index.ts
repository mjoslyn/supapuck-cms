// The site's content migrations, in the order scripts/migrate-content.ts and an importer apply them.
// Each takes a document's items and returns them rewritten (the same array when nothing changed).
import type { PuckItem } from '../../lib/puck/types';

export const MIGRATIONS: ((items: PuckItem[]) => PuckItem[])[] = [];
