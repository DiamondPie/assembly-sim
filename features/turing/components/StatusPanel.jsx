"use client";

import styles from './StatusPanel.module.css';

function statusLabel(status) {
  switch (status) {
    case 'running':
      return { text: 'running', tone: 'accent' };
    case 'halted':
      return { text: 'halted', tone: 'success' };
    case 'rejected':
      return { text: 'rejected', tone: 'error' };
    case 'idle':
    default:
      return { text: 'idle', tone: 'muted' };
  }
}

export default function StatusPanel({
  state,
  steps,
  headOffset,
  status = 'idle',
  lastRule = null,
}) {
  const label = statusLabel(status);

  return (
    <section className={styles.wrapper}>
      <div className={styles.header}>
        <span className={styles.title}>MACHINE STATUS</span>
        <span
          className={`${styles.statusDot} ${styles[`tone_${label.tone}`]}`}
        >
          <span className={styles.statusDotInner} />
          {label.text}
        </span>
      </div>

      <div className={styles.grid}>
        <div className={styles.cell}>
          <span className={styles.cellLabel}>STATE</span>
          <span className={`${styles.cellValue} ${styles.cellValueAccent}`}>
            {state || '—'}
          </span>
        </div>
        <div className={styles.cell}>
          <span className={styles.cellLabel}>STEPS</span>
          <span className={styles.cellValue}>{steps}</span>
        </div>
        <div className={styles.cell}>
          <span className={styles.cellLabel}>HEAD</span>
          <span className={styles.cellValue}>
            {headOffset >= 0 ? '+' : ''}
            {headOffset}
          </span>
        </div>
      </div>

      <div className={styles.lastRule}>
        <span className={styles.lastRuleLabel}>LAST RULE</span>
        <div className={styles.lastRuleBox}>
          {lastRule ? (
            <>
              <span className={styles.token}>{lastRule.currentState}</span>
              <span className={styles.tokenSym}>{lastRule.read}</span>
              <span className={styles.tokenArrow}>→</span>
              <span className={styles.token}>{lastRule.nextState}</span>
              <span className={styles.tokenSym}>{lastRule.write}</span>
              <span className={styles.tokenMove}>{lastRule.move}</span>
            </>
          ) : (
            <span className={styles.placeholder}>awaiting execution …</span>
          )}
        </div>
      </div>
    </section>
  );
}