"use client";

import styles from './TuringControls.module.css';

export default function TuringControls({
  isRunning,
  isHalted,
  speed,
  onSpeedChange,
  onRun,
  onPause,
  onStep,
  onReset,
}) {
  return (
    <section className={styles.wrapper}>
      <div className={styles.header}>
        <span className={styles.title}>CONTROLS</span>
      </div>

      <div className={styles.speed}>
        <div className={styles.speedHeader}>
          <span className={styles.label}>SPEED</span>
          <span className={styles.speedValue}>
            {speed === 0 ? 'instant' : `${speed} ms / step`}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={500}
          step={20}
          value={speed}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
          className={styles.slider}
        />
      </div>

      <div className={styles.actions}>
        {isRunning ? (
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={onPause}
          >
            <span className={styles.btnIcon}>❚❚</span>
            Pause
          </button>
        ) : (
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={onRun}
            disabled={isHalted}
          >
            <span className={styles.btnIcon}>▶</span>
            Run
          </button>
        )}

        <button
          type="button"
          className={`${styles.btn} ${styles.btnSecondary}`}
          onClick={onStep}
          disabled={isRunning || isHalted}
        >
          <span className={styles.btnIcon}>⇥</span>
          Step
        </button>

        <button
          type="button"
          className={`${styles.btn} ${styles.btnGhost}`}
          onClick={onReset}
        >
          <span className={styles.btnIcon}>↺</span>
          Reset
        </button>
      </div>
    </section>
  );
}