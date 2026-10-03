// Third-party libraries pages may need, served from the site (public/assets/vendor/<name>-<version>/,
// cached for a year like all of /assets/), not a CDN: another domain's connection would hold up the
// page. Scripts as their exact tags (a site that adds one itself uses the same constant, so a page never
// loads it twice). Upgrading one means a new versioned folder.
export const SWIPER_SCRIPT = '<script src="/assets/vendor/swiper-11.2.10/swiper-bundle.min.js" id="swiper-js"></script>';
export const LEAFLET_SCRIPT = '<script src="/assets/vendor/leaflet-1.9.4/leaflet.js" id="leaflet-js"></script>';
/** Their stylesheets, linked in <head> only on pages that use them (ctx.assets). */
export const VENDOR_CSS: Record<string, string> = {
  swiper: '/assets/vendor/swiper-11.2.10/swiper-bundle.min.css',
  leaflet: '/assets/vendor/leaflet-1.9.4/leaflet.css',
};
