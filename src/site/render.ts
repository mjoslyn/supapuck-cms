// The site's blocks and page hooks (see src/lib/site/extend.ts for everything a site can add):
// blocks with a renderer, an editor category and a prepare hook; collection card designs; archive
// query filters; extra <head> markup; footer scripts. The example site adds only card designs.
import { defineRender } from '../lib/site/extend';
import { CARDS } from './lib/content/cards';

export default defineRender({
  blocks: {},
  cards: CARDS,
});
