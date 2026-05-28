"use client";

import styles from './StatusPanel.module.css';

const STATUS_META = {
  idle: { label: 'idle', tone: styles.toneIdle },
  running: { label: 'running', tone: styles.toneRunning },
  halted: { label: 'halted', tone: styles.toneHalted },
};

export default function StatusPanel({
  state,
  steps,
  headOffset,
  status,
  lastRule,
}) {
  const meta = STATUS_META[status] ?? STATUS_META.idle;

  return (
    <section className={styles.wrapper}>
      <div className={styles.header}>
        <span className={styles.title}>STATUS</span>
        <span className={`${styles.badge} ${meta.tone}`}>
          <span className={styles.dot} />
          {meta.label}
        </span>
      </div>

      <div className={styles.grid}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>state</span>
          <span className={`${styles.statValue} ${styles.statAccent}`}>
            {state || '1'}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>steps</span>
          <span className={styles.statValue}>{steps}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>head</span>
          <span className={styles.statValue}>
            {headOffset >= 0 ? '+' : ''}
            {headOffset}
          </span>
        </div>
      </div>

      <div className={styles.lastRule}>
        <span className={styles.lastRuleLabel}>last rule</span>
        {lastRule ? (
          <div className={styles.tuple}>
            <span className={styles.token}>{lastRule.currentState}</span>
            <span className={styles.tokenSym}>{lastRule.read}</span>
            <span className={styles.arrow}>→</span>
            <span className={styles.tokenSym}>{lastRule.write}</span>
            <span className={styles.token}>{lastRule.nextState}</span>
            <span className={styles.tokenMove}>{lastRule.move}</span>
          </div>
        ) : (
          <span className={styles.lastRuleEmpty}>—</span>
        )}
      </div>
    </section>
  );
}