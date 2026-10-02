// The site's blocks and page hooks (src/site/render.ts), for the core renderer.
import siteRender from '../../site/render';
import type { SiteRender } from './extend';

export const SITE_RENDER: SiteRender = siteRender;
export const SITE_BLOCKS = siteRender.blocks;
