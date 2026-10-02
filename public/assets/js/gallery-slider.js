// Gallery sliders (.c-gallery.is-slider): the track scrolls natively (swipe, trackpad, keyboard);
// this adds previous/next buttons and, with data-autoplay="<seconds>", advances on a timer.
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function init(gallery) {
    const track = gallery.querySelector(':scope > .c-gallery__track');
    const prev = gallery.querySelector(':scope > .c-gallery__prev');
    const next = gallery.querySelector(':scope > .c-gallery__next');
    if (!track || !prev || !next) return;

    const step = () => {
      const item = track.firstElementChild;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return item ? item.getBoundingClientRect().width + gap : track.clientWidth;
    };
    const atStart = () => track.scrollLeft <= 1;
    const atEnd = () => track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;
    const update = () => {
      const fits = track.scrollWidth <= track.clientWidth + 1;
      prev.hidden = next.hidden = fits;
      prev.disabled = atStart();
      next.disabled = atEnd();
    };
    const go = (dir) => track.scrollBy({ left: dir * step() });

    prev.addEventListener('click', () => go(-1));
    next.addEventListener('click', () => go(1));
    track.addEventListener('scroll', update, { passive: true });
    new ResizeObserver(update).observe(track);
    update();

    const seconds = Number(gallery.dataset.autoplay);
    if (!(seconds > 0)) return;
    let paused = false;
    const pause = () => (paused = true);
    const resume = () => (paused = false);
    gallery.addEventListener('mouseenter', pause);
    gallery.addEventListener('mouseleave', resume);
    gallery.addEventListener('focusin', pause);
    gallery.addEventListener('focusout', resume);
    // A swipe means the visitor has taken over.
    track.addEventListener('touchstart', pause, { passive: true });
    setInterval(() => {
      if (paused || document.hidden || reduceMotion.matches || next.hidden) return;
      if (atEnd()) track.scrollTo({ left: 0 });
      else go(1);
    }, seconds * 1000);
  }

  document.querySelectorAll('.c-gallery.is-slider').forEach(init);
})();
