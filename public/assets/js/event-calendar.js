// Events calendar block (.c-event-cal): Calendar | List toggle and month arrows, switched in place.
(() => {
  document.querySelectorAll('.c-event-cal').forEach((el) => {
    const toggles = el.querySelectorAll('.c-event-cal__toggle button');
    const panels = { calendar: el.querySelector('.c-event-cal__calendar'), list: el.querySelector('.c-event-cal__list') };
    toggles.forEach((btn) =>
      btn.addEventListener('click', () => {
        const view = btn.dataset.show;
        toggles.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
        for (const [k, panel] of Object.entries(panels)) if (panel) panel.hidden = k !== view;
        el.dataset.view = view;
      }),
    );

    const months = [...el.querySelectorAll('.c-event-cal__month')];
    const label = el.querySelector('.c-event-cal__month-label');
    const prev = el.querySelector('.c-event-cal__arrow.is-prev');
    const next = el.querySelector('.c-event-cal__arrow.is-next');
    let at = 0;
    const show = (i) => {
      at = Math.max(0, Math.min(months.length - 1, i));
      months.forEach((m, j) => (m.hidden = j !== at));
      if (label) label.textContent = months[at]?.dataset.label ?? '';
      if (prev) prev.disabled = at === 0;
      if (next) next.disabled = at === months.length - 1;
    };
    prev?.addEventListener('click', () => show(at - 1));
    next?.addEventListener('click', () => show(at + 1));
    show(0);
    el.classList.add('is-ready');
  });
})();
