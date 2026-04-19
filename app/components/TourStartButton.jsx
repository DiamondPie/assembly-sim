'use client';

import { useEffect, useRef } from 'react';
import { useNextStep } from 'nextstepjs';
import styles from './TourStartButton.module.css';

const STORAGE_KEY = 'cs110-playground:tour-seen';

// The fly-away animation (in TourProviders) needs to know where this
// button is sitting on screen. We expose the DOM element through
// window.__tourStartBtnEl so any other module can read its bounding rect
// without having to pass a ref through React context.
export default function TourStartButton() {
  const { startNextStep } = useNextStep();
  const btnRef = useRef(null);
  const startedOnce = useRef(false);

  // Publish / un-publish DOM node for the fly-away animation.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.__tourStartBtnEl = btnRef.current;
    return () => {
      if (window.__tourStartBtnEl === btnRef.current) {
        window.__tourStartBtnEl = null;
      }
    };
  }, []);

  // Auto-start on first visit (no ?p= share-link + never seen before).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (startedOnce.current) return;

    // Be defensive: some browsers / incognito modes throw on localStorage.
    let seen = null;
    try {
      seen = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      /* ignore — treat as first-time visitor */
    }

    const hasShareLink = /[?&]p=/.test(window.location.search);
    if (hasShareLink || seen) return;

    startedOnce.current = true;                 // ← set BEFORE the timeout
    const t = setTimeout(() => {                //   so React 18 StrictMode's
      startNextStep('mainTour');                //   double-invoke in dev
      try {                                     //   can't trigger the tour twice
        window.localStorage.setItem(STORAGE_KEY, '1');
      } catch { /* ignore */ }
    }, 700);
    return () => clearTimeout(t);
  }, [startNextStep]);

  const handleClick = () => {
    startNextStep('mainTour');
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch { /* ignore */ }
  };

  return (
    <button
      ref={btnRef}
      id="tour-start-btn"
      type="button"
      className={styles.fab}
      onClick={handleClick}
      aria-label="Start guided tour"
      title="Guided tour"
    >
      {/* Question-mark icon — always visible */}
      <span className={styles.icon} aria-hidden>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-0.8 0.4-1 0.9-1 1.7" />
          <circle cx="12" cy="16.5" r="0.6" fill="currentColor" />
        </svg>
      </span>

      {/* "Tour" label — hidden by default, slides in on hover */}
      <span className={styles.label}>Tour</span>
    </button>
  );
}