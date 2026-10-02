// "Load more" for collections: fetch the next page of the same URL and append that collection's items.
(() => {
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('.c-collection__more-button');
    if (!button || button.getAttribute('aria-busy') === 'true') return;
    const collection = button.closest('[data-collection]');
    const list = collection && collection.querySelector(':scope > .c-collection__items, :scope .c-collection__items');
    if (!list) return;
    button.setAttribute('aria-busy', 'true');
    try {
      const res = await fetch(button.dataset.next, { headers: { Accept: 'text/html' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
      const next = doc.querySelector(`[data-collection="${CSS.escape(collection.dataset.collection)}"]`);
      next?.querySelectorAll('.c-collection__items > li').forEach((li) => list.appendChild(document.importNode(li, true)));
      const more = next?.querySelector('.c-collection__more-button');
      if (more) {
        button.dataset.next = more.dataset.next;
        button.removeAttribute('aria-busy');
      } else button.parentElement.remove();
    } catch (err) {
      button.removeAttribute('aria-busy');
      console.error('Load more failed:', err);
    }
  });
})();
