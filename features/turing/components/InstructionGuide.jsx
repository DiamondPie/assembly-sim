"use client";

import styles from './InstructionGuide.module.css';

export default function InstructionGuide() {
  return (
    <footer className={styles.guide}>
      <div className={styles.inner}>
        <div className={styles.col}>
          <h3 className={styles.heading}>RULE FORMAT</h3>
          <div className={styles.tuple}>
            <span className={styles.tok}>state</span>
            <span className={styles.tokSym}>read</span>
            <span className={styles.arrow}>→</span>
            <span className={styles.tokSym}>write</span>
            <span className={styles.tok}>next</span>
            <span className={styles.tokMove}>move</span>
          </div>
          <p className={styles.text}>
            Each rule reads the symbol under the head while in{' '}
            <em>state</em>, writes <em>write</em>, switches to{' '}
            <em>next</em>, then moves the head. States may be numeric or
            multi-character alphanumeric (they do not start with{' '}
            <code>q</code>).
          </p>
        </div>

        <div className={styles.col}>
          <h3 className={styles.heading}>MOVE</h3>
          <p className={styles.text}>
            The head moves one cell each step. Direction is{' '}
            <code>L</code> (left) or <code>R</code> (right) — there is no
            stay option.
          </p>

          <h3 className={styles.heading}>SYMBOLS</h3>
          <p className={styles.text}>
            The blank is written <code className={styles.blank}>b</code> and
            rendered slightly faded. An empty cell is treated as blank, so you
            can match or write <code className={styles.blank}>b</code> directly.
          </p>
        </div>

        <div className={styles.col}>
          <h3 className={styles.heading}>HALTING</h3>
          <ul className={styles.list}>
            <li>The machine always begins in state <code>1</code>.</li>
            <li>
              Rules must be unambiguous — no two rules share the same{' '}
              <em>state</em> + <em>read</em>.
            </li>
            <li>
              There are no halt states. The machine halts exactly when no rule
              matches (or you stop it).
            </li>
          </ul>
        </div>

        <div className={styles.col}>
          <h3 className={styles.heading}>EXAMPLE</h3>
          <pre className={styles.code}>{`(1,0,1,1,R)
(1,1,0,1,R)`}</pre>
          <p className={styles.text}>
            Flips every bit while scanning right, then halts on the first blank{' '}
            <code className={styles.blank}>b</code> — no rule covers{' '}
            <code>(1, b)</code>.
          </p>

          <h3 className={styles.heading}>SHORTCUTS</h3>
          <ul className={styles.list}>
            <li>Type into a cell to write and jump to the next.</li>
            <li>Scroll over the tape to pan it left/right.</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}