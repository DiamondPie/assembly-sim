'use client';

import { useEffect, useRef } from 'react';
import { useNextStep } from 'nextstepjs';
import styles from './TourStartButton.module.css';

const STORAGE_KEY = 'cs110-playground:tour-seen';

export default function TourStartButton() {
  const { startNextStep } = useNextStep();
  const startedOnce = useRef(false);

  // Auto-start on first visit (no ?p= share-link + never seen before).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (startedOnce.current) return;

    const hasShareLink = /[?&]p=/.test(window.location.search);
    const seen = window.localStorage.getItem(STORAGE_KEY);

    if (!hasShareLink && !seen) {
      startedOnce.current = true;
      const t = setTimeout(() => {
        startNextStep('mainTour');
        window.localStorage.setItem(STORAGE_KEY, '1');
      }, 700);
      return () => clearTimeout(t);
    }
  }, [startNextStep]);

  const handleClick = () => {
    startNextStep('mainTour');
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, '1');
    }
  };

  return (
    <button
      type="button"
      className={styles.fab}
      onClick={handleClick}
      aria-label="Start guided tour"
      title="Guided tour"
    >
      <svg
        width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-0.8 0.4-1 0.9-1 1.7" />
        <circle cx="12" cy="16.5" r="0.6" fill="currentColor" />
      </svg>
      <span className={styles.label}>Tour</span>
    </button>
  );
}