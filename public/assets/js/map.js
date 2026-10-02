// Map blocks (.c-map[data-map], src/render/c/map.ts): pins for entries with coordinates, in the theme's
// accent color, each with a popup linking to the entry. Scroll-wheel zoom only after a click on the
// map. With a taxonomy, the map follows "c-filters:change" from a Filters block (terms and their
// children); "featured first" shows only featured entries until something is chosen.
(() => {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  function setup(el) {
    if (el.dataset.ready || typeof L === 'undefined') return;
    el.dataset.ready = '1';
    const data = JSON.parse(el.dataset.map || '{}');
    const markers = data.markers || [];
    if (!markers.length) return;
    const map = L.map(el, { scrollWheelZoom: false });
    map.on('click', () => map.scrollWheelZoom.enable());
    el.addEventListener('mouseleave', () => map.scrollWheelZoom.disable());
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const accent = getComputedStyle(el).getPropertyValue('--color-accent').trim() || '#b87333';
    const icon = L.divIcon({
      className: 'c-map__pin',
      html: `<svg width="24" height="36" viewBox="0 0 24 36" aria-hidden="true"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="${esc(accent)}"/><circle cx="12" cy="11" r="5" fill="#fff"/></svg>`,
      iconSize: [24, 36],
      iconAnchor: [12, 36],
      popupAnchor: [0, -34],
    });
    const layers = markers.map((m) => {
      const popup = `<div class="c-map__popup"><strong><a href="${esc(m.url)}">${esc(m.title)}</a></strong>${m.address ? `<span class="c-map__address">${esc(m.address)}</span>` : ''}</div>`;
      const layer = L.marker([m.lat, m.lng], { icon, title: m.title }).bindPopup(popup);
      layer.entry = m;
      return layer;
    });

    // A term with every term under it.
    const withChildren = (id) => {
      const out = [id];
      for (let i = 0; i < out.length; i++) for (const t of data.terms || []) if (t.parent === out[i] && !out.includes(t.id)) out.push(t.id);
      return out;
    };

    function show(ids, featuredOnly, fit) {
      const allowed = ids && ids.length ? new Set(ids.flatMap(withChildren)) : null;
      const visible = [];
      for (const layer of layers) {
        map.removeLayer(layer);
        const m = layer.entry;
        if (featuredOnly && !m.featured) continue;
        if (allowed && !m.terms.some((t) => allowed.has(t))) continue;
        layer.addTo(map);
        visible.push(layer);
      }
      if (fit && visible.length) map.fitBounds(L.featureGroup(visible).getBounds().pad(0.1));
    }

    // To begin with: the set center (or all pins) and, featured first, only those until filtered.
    const center = data.center;
    if (center) map.setView(center, data.zoom || 14);
    else map.fitBounds(L.featureGroup(layers).getBounds().pad(0.1));
    show(data.chosen, data.featuredFirst && !data.filtered, !!data.filtered || !center);

    if (data.taxonomy) {
      document.addEventListener('c-filters:change', (e) => {
        if (e.detail && e.detail.taxonomy && e.detail.taxonomy !== data.taxonomy) return;
        show(e.detail ? e.detail.ids : [], false, true);
      });
    }
  }

  const init = () => document.querySelectorAll('.c-map[data-map]').forEach(setup);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
