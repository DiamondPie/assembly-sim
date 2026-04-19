// app/components/tourFlyAway.js
// ---------------------------------------------------------------
// Clones the tour card DOM node and animates the clone toward the
// "Tour" start FAB in the bottom-left corner. Called *synchronously*
// from TourCard's close/finish handlers, BEFORE we tell nextstepjs to
// actually end the tour — this way the card is still in its "live"
// visual state when we snapshot it.
// ---------------------------------------------------------------

/**
 * @param {HTMLElement | null} cardEl  The live tour-card root element
 *        (captured via a ref inside TourCard).
 */
export function flyCardIntoFab(cardEl) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (!cardEl) return;

  // Respect user's motion preferences — skip the animation entirely.
  const prefersReduced = window.matchMedia?.(
    '(prefers-reduced-motion: reduce)'
  ).matches;
  if (prefersReduced) return;

  const fabEl = window.__tourStartBtnEl;
  if (!fabEl) return;

  const cardRect = cardEl.getBoundingClientRect();
  const fabRect  = fabEl.getBoundingClientRect();
  if (cardRect.width === 0 || cardRect.height === 0) return;

  // 1. Deep-clone the live card. Clear the id / data attrs so we don't
  //    end up with duplicates that querySelector could re-hit.
  const clone = cardEl.cloneNode(true);
  clone.removeAttribute('id');
  clone.removeAttribute('data-tour-card');

  // 2. Pin the clone at the original card's viewport coordinates.
  Object.assign(clone.style, {
    position:        'fixed',
    left:            `${cardRect.left}px`,
    top:             `${cardRect.top}px`,
    width:           `${cardRect.width}px`,
    height:          `${cardRect.height}px`,
    margin:          '0',
    zIndex:          '9999',
    pointerEvents:   'none',
    transformOrigin: 'center center',
    willChange:      'transform, opacity, filter',
    // Single transition covers the whole flight.
    transition: [
      'transform 700ms cubic-bezier(0.5, 0, 0.2, 1)',
      'opacity   700ms cubic-bezier(0.4, 0, 0.2, 1)',
      'filter    700ms ease-out',
    ].join(', '),
  });

  document.body.appendChild(clone);

  // 3. Compute delta from card-center to FAB-center.
  const cardCx = cardRect.left + cardRect.width  / 2;
  const cardCy = cardRect.top  + cardRect.height / 2;
  const fabCx  = fabRect.left  + fabRect.width   / 2;
  const fabCy  = fabRect.top   + fabRect.height  / 2;

  const dx    = fabCx - cardCx;
  const dy    = fabCy - cardCy;
  const scale = Math.max(fabRect.width / cardRect.width, 0.04);

  // 4. Kick off the flight on the next frame — we need a layout pass
  //    between appending the clone with its starting styles and
  //    mutating them, otherwise the transition won't fire.
  requestAnimationFrame(() => {
    // Second rAF ensures the browser has committed the initial styles.
    requestAnimationFrame(() => {
      clone.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
      clone.style.opacity   = '0';
      clone.style.filter    = 'blur(2px)';
    });
  });

  // 5. Cleanup: remove the clone + give the FAB a little "received" pulse.
  let finished = false;
  const cleanup = () => {
    if (finished) return;
    finished = true;
    clone.remove();
    // Skip pulse if the FAB has since been unmounted.
    if (!fabEl.isConnected || typeof fabEl.animate !== 'function') return;
    fabEl.animate(
      [
        { transform: 'translateY(0)    scale(1)',    boxShadow: '0 8px 24px rgba(0,0,0,0.45), 0 0 0 0  rgba(233,160,255,0)'    },
        { transform: 'translateY(-1px) scale(1.18)', boxShadow: '0 8px 24px rgba(0,0,0,0.45), 0 0 0 10px rgba(233,160,255,0.18)' },
        { transform: 'translateY(0)    scale(1)',    boxShadow: '0 8px 24px rgba(0,0,0,0.45), 0 0 0 0  rgba(233,160,255,0)'    },
      ],
      { duration: 480, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
    );
  };

  clone.addEventListener('transitionend', cleanup, { once: true });
  // Safety net in case transitionend never fires.
  setTimeout(cleanup, 900);
}