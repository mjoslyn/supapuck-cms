// Live search for every search form (.c-search-form): as you type, the best matches from
// /api/search appear under the field (title with the matched words marked, type, short excerpt),
// plus "See all results". An ARIA combobox: arrow keys move through the list, Enter opens the
// highlighted result (or searches), Escape closes the list. Without this script the form still
// submits to /search/.
//
// A form can narrow it with data attributes: data-input (the field's name, default "q"), data-types
// (types to search, comma-separated), data-taxonomy (also suggest that taxonomy's terms), data-all
// ("false": no "See all results"), data-active-terms (term ids not to suggest). Picking a term
// fires a cancelable "c-search:term" event on the form ({ id, title, url }); unless cancelled, it goes
// to the term's page.
(() => {
  const MIN = 2;
  const DELAY = 150;
  const cache = new Map();
  let uid = 0;

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  /** The text, escaped, with each search word marked (matched in the text itself, not its escaped form). */
  function mark(text, words) {
    if (!words.length) return esc(text);
    const re = new RegExp(`(${words.map(reEsc).join('|')})`, 'gi');
    return String(text)
      .split(re)
      .map((part, i) => (i % 2 ? `<mark>${esc(part)}</mark>` : esc(part)))
      .join('');
  }

  function enhance(form) {
    const input = form.querySelector(`input[name="${form.dataset.input || 'q'}"]`);
    if (!input || input.dataset.live) return;
    input.dataset.live = '1';
    const n = ++uid;
    const list = document.createElement('ul');
    list.id = `c-search-results-${n}`;
    list.className = 'c-search-form__results';
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', 'Search suggestions');
    list.hidden = true;
    const status = document.createElement('div');
    status.className = 'c-sr-only';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    // The list goes under the field's own box when the form marks one (a Filters block's search).
    (input.closest('[data-results-anchor]') || form).append(list, status);
    form.classList.add('has-live-results');
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', list.id);
    input.setAttribute('autocomplete', 'off');

    let timer = 0;
    let active = -1;
    let controller = null;
    let shown = '';

    const options = () => [...list.querySelectorAll('[role="option"]')];

    function open(show) {
      list.hidden = !show;
      input.setAttribute('aria-expanded', show ? 'true' : 'false');
      if (!show) setActive(-1);
    }

    function setActive(i) {
      const opts = options();
      active = opts.length ? ((i % opts.length) + opts.length) % opts.length : -1;
      if (i < 0) active = -1;
      opts.forEach((o, k) => o.setAttribute('aria-selected', k === active ? 'true' : 'false'));
      if (active >= 0) {
        input.setAttribute('aria-activedescendant', opts[active].id);
        opts[active].scrollIntoView({ block: 'nearest' });
      } else input.removeAttribute('aria-activedescendant');
    }

    function render(q, data) {
      shown = q;
      const words = q.split(/\s+/).filter(Boolean);
      const all = `${form.getAttribute('action') || '/search/'}?q=${encodeURIComponent(q)}`;
      const active = (form.dataset.activeTerms || '').split(',').map(Number);
      const terms = (data.terms || []).filter((t) => !active.includes(t.id));
      list.dataset.terms = JSON.stringify(terms);
      const termItems = terms.map(
        (t, i) =>
          `<li role="option" id="${list.id}-t${i}" aria-selected="false" data-term="${i}"><a class="c-search-form__result is-term" href="${esc(t.url || '#')}" tabindex="-1">` +
          `<span class="c-search-form__result-title">${mark(t.title, words)}</span>` +
          `<span class="c-search-form__result-type">${esc(t.type)}</span></a></li>`,
      );
      const items = termItems.concat(data.results.map(
        (r, i) =>
          `<li role="option" id="${list.id}-${i}" aria-selected="false"><a class="c-search-form__result" href="${esc(r.url)}" tabindex="-1">` +
          `<span class="c-search-form__result-title">${mark(r.title, words)}</span>` +
          `<span class="c-search-form__result-type">${esc(r.type)}</span>` +
          (r.excerpt ? `<span class="c-search-form__result-excerpt">${mark(r.excerpt, words)}</span>` : '') +
          `</a></li>`,
      ));
      if (data.results.length && form.dataset.all !== 'false') {
        items.push(`<li role="option" id="${list.id}-all" aria-selected="false"><a class="c-search-form__all" href="${esc(all)}" tabindex="-1">See all ${data.total} result${data.total === 1 ? '' : 's'}</a></li>`);
      } else if (!items.length) {
        items.push(`<li class="c-search-form__none" role="presentation">No matches for &#8220;${esc(q)}&#8221;</li>`);
      }
      list.innerHTML = items.join('');
      const count = terms.length + data.results.length;
      status.textContent = count ? `${count} suggestion${count === 1 ? '' : 's'}, use the up and down arrows to review` : 'No results';
      open(document.activeElement === input);
      setActive(-1);
    }

    async function lookup() {
      const q = input.value.trim();
      if (q.length < MIN) {
        shown = '';
        list.innerHTML = '';
        status.textContent = '';
        open(false);
        return;
      }
      if (cache.has(form.dataset.types + '|' + form.dataset.taxonomy + '|' + q)) return render(q, cache.get(form.dataset.types + '|' + form.dataset.taxonomy + '|' + q));
      controller?.abort();
      controller = new AbortController();
      try {
        const extra = (form.dataset.types ? `&types=${encodeURIComponent(form.dataset.types)}` : '') + (form.dataset.taxonomy ? `&taxonomy=${encodeURIComponent(form.dataset.taxonomy)}` : '');
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=6${extra}`, { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        cache.set(form.dataset.types + '|' + form.dataset.taxonomy + '|' + q, data);
        if (input.value.trim() === q) render(q, data);
      } catch {}
    }

    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(lookup, DELAY);
    });
    input.addEventListener('focus', () => {
      if (shown && shown === input.value.trim() && list.children.length) open(true);
    });
    input.addEventListener('keydown', (e) => {
      const opts = options();
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (list.hidden) {
          if (!list.children.length) return;
          open(true);
        }
        e.preventDefault();
        setActive(active < 0 ? (e.key === 'ArrowDown' ? 0 : opts.length - 1) : active + (e.key === 'ArrowDown' ? 1 : -1));
      } else if (e.key === 'Enter' && !list.hidden && active >= 0) {
        e.preventDefault();
        choose(opts[active]);
      } else if (e.key === 'Escape' && !list.hidden) {
        // Only the list closes (not a menu or panel the form sits in), and the words stay (a search
        // field clears itself on Escape otherwise).
        e.preventDefault();
        e.stopPropagation();
        open(false);
      }
    });
    /** Open an option: a term first asks the form (a filter may take it), else its page. */
    function choose(opt) {
      if (opt.dataset.term != null) {
        const term = JSON.parse(list.dataset.terms || '[]')[Number(opt.dataset.term)];
        const picked = new CustomEvent('c-search:term', { detail: term, bubbles: true, cancelable: true });
        if (term && !form.dispatchEvent(picked)) {
          input.value = '';
          shown = '';
          open(false);
          return;
        }
      }
      const link = opt.querySelector('a');
      if (link && link.getAttribute('href') !== '#') window.location.href = link.href;
    }

    // Keep focus in the field while picking with the mouse; a click opens the option.
    list.addEventListener('mousedown', (e) => e.preventDefault());
    list.addEventListener('click', (e) => {
      const opt = e.target.closest('[role="option"]');
      if (!opt) return;
      e.preventDefault();
      choose(opt);
    });
    list.addEventListener('mousemove', (e) => {
      const opt = e.target.closest('[role="option"]');
      if (opt) setActive(options().indexOf(opt));
    });
    form.addEventListener('focusout', (e) => {
      if (!form.contains(e.relatedTarget)) open(false);
    });
  }

  const init = () => document.querySelectorAll('form.c-search-form, form[data-live-search]').forEach(enhance);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
