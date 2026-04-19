'use client';

import { useState } from 'react';
import styles from './SimControls.module.css';
import clsx from 'clsx';

// ── Icons ────────────────────────────────────────────────────────────────────

function IconRun() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <path d="M3 2.5l7 3.5-7 3.5V2.5z" />
    </svg>
  );
}

function IconStep() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2.5l4 3.5-4 3.5" />
      <line x1="9" y1="2.5" x2="9" y2="9.5" />
    </svg>
  );
}

function IconConfirm() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 5l2.5 2.5L8 3" />
    </svg>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

// Props (all optional — UI-only for now, wire up externally when simulator is ready):
//   inputValue      / onInputChange
//   onInputConfirm
//   flags           — { GT: bool, LT: bool, EQ: bool }
//   onRun           / onStep
//   notation        — string shown in the display box, e.g. "R0 ← R0 + R1"

export default function SimControls({
  inputValue     = '',
  onInputChange,
  onInputConfirm,
  flags          = { GT: false, LT: false, EQ: false },
  onRun,
  onStep,
  notation       = '',
  highlightInput = false,
  highlightFlags = [],
}) {
  // Local fallback state so the component is usable standalone
  const [localInput, setLocalInput] = useState('');
  const [localNotation] = useState('');

  const controlled    = onInputChange !== undefined;
  const displayInput  = controlled ? inputValue : localInput;
  const displayNote   = notation || localNotation;

  const handleInputChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    controlled ? onInputChange(val) : setLocalInput(val);
  };

  const handleConfirm = () => {
    onInputConfirm?.(displayInput);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleConfirm();
  };

  const flagEntries = [
    { key: 'GT', label: 'GT' },
    { key: 'LT', label: 'LT' },
    { key: 'EQ', label: 'EQ' },
  ];

  return (
    <div className={styles.root}>

      {/* ── Body ── */}
      <div className={styles.body}>

        {/* ── Row 1: Input + Flags ── */}
        <div className={styles.topRow}>

          {/* Input */}
          <div id="tour-input-section" className={styles.section}>
            <span className={styles.sectionLabel}>Input</span>
            <div className={styles.inputRow}>
              <input
                className={clsx(styles.numInput, highlightInput && styles.inputHighlighted)}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="0"
                value={displayInput}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                maxLength={10}
                spellCheck={false}
              />
              <button
                className={styles.confirmBtn}
                onClick={handleConfirm}
                title="Confirm input (Enter)"
              >
                <IconConfirm />
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className={styles.vDivider} />

          {/* Flags */}
          <div id="tour-flags-section" className={styles.section}>
            <span className={styles.sectionLabel}>Flags</span>
            <div className={styles.flagTable}>
              {/* Header row */}
              {flagEntries.map(f => (
                <span key={`h-${f.key}`} className={styles.flagHeader}>{f.label}</span>
              ))}
              {/* Value row */}
              {flagEntries.map(f => (
                <span
                  key={`v-${f.key}`}
                  className={clsx(
                    styles.flagValue, 
                    flags[f.key] && styles.flagActive,
                    highlightFlags.includes(f.key) && styles.flagHighlighted, 
                  )}
                  onAnimationEnd={e => e.currentTarget.classList.remove(styles.flagHighlighted)}
                >
                  {flags[f.key] ? '1' : '0'}
                </span>
              ))}
            </div>
          </div>

        </div>

        {/* ── Horizontal divider ── */}
        <div className={styles.hDivider} />

        {/* ── Row 2: Run controls ── */}
        <div className={styles.section}>
          <div className={styles.btnRow}>
            <button
              id="tour-run-btn"
              className={clsx(styles.execBtn, styles.execBtnRun)}
              onClick={onRun}
            >
              <IconRun />
              Run
            </button>
            <button
              id="tour-step-btn"
              className={clsx(styles.execBtn, styles.execBtnStep)}
              onClick={onStep}
            >
              <IconStep />
              Step
            </button>
          </div>
        </div>

        {/* ── Horizontal divider ── */}
        <div className={styles.hDivider} />

        {/* ── Row 3: Notation display ── */}
        <div className={styles.section}>
          <span className={styles.sectionLabel}>Current instruction</span>
          <div className={clsx(styles.notationBox, !displayNote && styles.notationEmpty)}>
            {displayNote
              ? <span className={styles.notationText}>{displayNote}</span>
              : <span className={styles.notationPlaceholder}>awaiting execution...</span>
            }
          </div>
        </div>

      </div>
    </div>
  );
}