"use client";

import { useState, useEffect } from 'react';
import styles from './InstructionGuide.module.css';

export default function InstructionGuide() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={styles.fab}
        onClick={() => setOpen(true)}
        aria-label="how to write rules"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M9.5 9.5a2.5 2.5 0 1 1 4.2 1.8c-.8.8-1.7 1.2-1.7 2.4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle cx="12" cy="17.5" r="1" fill="currentColor" />
        </svg>
      </button>

      {open && (
        <div className={styles.overlay} onClick={() => setOpen(false)}>
          <div
            className={styles.panel}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <header className={styles.header}>
              <div>
                <span className={styles.eyebrow}>REFERENCE</span>
                <h2 className={styles.heading}>Turing machine syntax</h2>
              </div>
              <button
                type="button"
                className={styles.close}
                onClick={() => setOpen(false)}
                aria-label="close"
              >
                ×
              </button>
            </header>

            <div className={styles.body}>
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>RULE FORMAT</h3>
                <div className={styles.codeBlock}>
                  <span className={styles.tokenState}>state</span>
                  <span className={styles.tokenSym}>read</span>
                  <span className={styles.tokenArrow}>→</span>
                  <span className={styles.tokenState}>next</span>
                  <span className={styles.tokenSym}>write</span>
                  <span className={styles.tokenMove}>move</span>
                </div>
                <p className={styles.paragraph}>
                  Each rule fires when the machine is in <em>state</em> and
                  the head reads <em>read</em>. The machine transitions to{' '}
                  <em>next</em>, writes <em>write</em> onto the tape, and
                  moves the head according to <em>move</em>.
                </p>
              </section>

              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>MOVE</h3>
                <ul className={styles.list}>
                  <li>
                    <code>L</code> — move head one cell to the left
                  </li>
                  <li>
                    <code>R</code> — move head one cell to the right
                  </li>
                  <li>
                    <code>S</code> — stay (do not move)
                  </li>
                </ul>
              </section>

              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>SYMBOLS</h3>
                <p className={styles.paragraph}>
                  Each cell holds a single character. The default blank
                  symbol is <code>_</code> and is displayed as an empty
                  cell on the tape. You can change the blank symbol from
                  the controls panel.
                </p>
              </section>

              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>EXAMPLE</h3>
                <p className={styles.paragraph}>
                  Binary increment — adds 1 to a binary number written on
                  the tape, with the head starting at the leftmost digit:
                </p>
                <pre className={styles.codeExample}>
{`q0 0 → q0 0 R     scan right over 0s
q0 1 → q0 1 R     scan right over 1s
q0 _ → q1 _ L     reached the end, go carry
q1 0 → qH 1 S     carry into a 0, done
q1 1 → q1 0 L     carry rolls over a 1
q1 _ → qH 1 S     carried past the leftmost bit`}
                </pre>
              </section>

              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>SHORTCUTS</h3>
                <ul className={styles.list}>
                  <li>
                    <kbd>Esc</kbd> — close this panel
                  </li>
                  <li>Click any tape cell (while idle) to edit it</li>
                  <li>Use the mouse wheel over the tape to scroll</li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}