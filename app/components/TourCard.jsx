'use client';

import { useRef } from 'react';
import styles from './TourCard.module.css';
import clsx from 'clsx';
import { flyCardIntoFab } from './TourFlyAway';

// nextstepjs passes these props to any cardComponent:
//   { step, currentStep, totalSteps, nextStep, prevStep, skipTour, arrow }
//
// Custom field we honour on `step`:
//   step.advanceOn    — marks this step as "user-driven"; hides Next
//   step.advanceHint  — prompt shown in place of Next
export default function TourCard({
  step,
  currentStep,
  totalSteps,
  nextStep,
  prevStep,
  skipTour,
  arrow,
}) {
  const isFirst = currentStep === 0;
  const isLast  = currentStep === totalSteps - 1;
  const isInteractive = Boolean(step.advanceOn);
  const cardRef = useRef(null);

  // Intercept the terminal actions so we can snapshot the card DOM
  // *before* nextstepjs starts its exit animation.
  const handleSkip = () => {
    flyCardIntoFab(cardRef.current);
    skipTour();
  };
  const handleFinish = () => {
    flyCardIntoFab(cardRef.current);
    nextStep();  // on the last step, nextStep() completes the tour
  };

  return (
    <div ref={cardRef} className={styles.card} data-tour-card="true">
      {/* Subtle accent ring along the top edge */}
      <span className={styles.accentRing} aria-hidden />

      {/* ── Header ─────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.titleRow}>
          {step.icon && <span className={styles.icon}>{step.icon}</span>}
          <h3 className={styles.title}>{step.title}</h3>
        </div>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={handleSkip}
          aria-label="Close tour"
          title="Close tour"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
               stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="2" y1="2" x2="10" y2="10" />
            <line x1="10" y1="2" x2="2" y2="10" />
          </svg>
        </button>
      </div>

      {/* ── Content ────────────────────────────────────── */}
      <div className={styles.content}>{step.content}</div>

      {/* ── Interactive hint (replaces Next button) ───── */}
      {isInteractive && (
        <div className={styles.hint} role="status" aria-live="polite">
          <span aria-hidden>&gt;</span>
          <span className={styles.hintText}>
            {step.advanceHint || 'Interact with the highlighted element to continue'}
          </span>
        </div>
      )}

      {/* ── Progress dots ──────────────────────────────── */}
      <div className={styles.dotsRow} aria-hidden>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <span
            key={i}
            className={clsx(
              styles.dot,
              i === currentStep && styles.dotActive,
              i  <  currentStep && styles.dotDone,
            )}
          />
        ))}
      </div>

      {/* ── Footer ─────────────────────────────────────── */}
      <div className={styles.footer}>
        <span className={styles.counter}>
          {currentStep + 1} <span className={styles.counterSep}>/</span> {totalSteps}
        </span>

        <div className={styles.actions}>
          {step.showSkip && !isLast && (
            <button
              type="button"
              className={clsx(styles.btn, styles.btnGhost)}
              onClick={handleSkip}
            >
              Skip
            </button>
          )}
          {!isFirst && (
            <button
              type="button"
              className={clsx(styles.btn, styles.btnSecondary)}
              onClick={prevStep}
            >
              Back
            </button>
          )}
          {/* Next is hidden on interactive steps — the user must drive the
              tour forward by pressing the highlighted page control. */}
          {!isInteractive && (
            <button
              type="button"
              className={clsx(styles.btn, styles.btnPrimary)}
              onClick={isLast ? handleFinish : nextStep}
            >
              {isLast ? 'Finish' : 'Next'}
            </button>
          )}
        </div>
      </div>

      {/* nextstepjs arrow */}
      {arrow}
    </div>
  );
}