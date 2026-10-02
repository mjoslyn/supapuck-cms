// Shuffled collections ([data-shuffle="<shown>"]): the page shows the first entries of a pool and keeps
// the rest in a <template>; on each visit pick a fresh random set from the whole pool. Runs (deferred)
// before sliders start on DOMContentLoaded.
(() => {
  const shuffle = (list) => {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  };

  document.querySelectorAll('[data-shuffle]').forEach((el) => {
    const template = el.querySelector(':scope > .c-collection__pool');
    const list = el.querySelector(':scope > .c-collection__items, :scope > .swiper > .swiper-wrapper');
    if (!list) return;
    const spare = template ? template.content.querySelectorAll('.c-collection__items > *, .swiper-slide') : [];
    const items = shuffle([...list.children, ...spare]);
    const shown = Number(el.dataset.shuffle) || items.length;
    list.replaceChildren(...items.slice(0, shown).map((n) => (n.ownerDocument === document ? n : document.importNode(n, true))));
    template?.remove();
  });
})();
