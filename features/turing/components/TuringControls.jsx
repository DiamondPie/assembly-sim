"use client";

import { useState } from 'react';
import styles from './TuringControls.module.css';

export default function TuringControls({
  isRunning,
  isHalted,
  initialState,
  onInitialStateChange,
  haltStates,
  onHaltStatesChange,
  blankSymbol,
  onBlankSymbolChange,
  speed,
  onSpeedChange,
  tapeInput,
  onTapeInputChange,
  onLoadTape,
  onRun,
  onPause,
  onStep,
  onReset,
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <section className={styles.wrapper}>
      <div className={styles.header}>
        <span className={styles.title}>CONTROLS</span>
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setAdvancedOpen((v) => !v)}
        >
          {advancedOpen ? 'hide config' : 'show config'}
          <span
            className={`${styles.toggleCaret} ${
              advancedOpen ? styles.toggleCaretOpen : ''
            }`}
          >
            ▾
          </span>
        </button>
      </div>

      {advancedOpen && (
        <div className={styles.config}>
          <div className={styles.field}>
            <label className={styles.label}>INITIAL STATE</label>
            <input
              className={styles.input}
              value={initialState}
              onChange={(e) => onInitialStateChange(e.target.value)}
              placeholder="q0"
              disabled={isRunning}
              spellCheck={false}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>HALT STATES</label>
            <input
              className={styles.input}
              value={haltStates}
              onChange={(e) => onHaltStatesChange(e.target.value)}
              placeholder="qH, qAccept"
              disabled={isRunning}
              spellCheck={false}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>BLANK</label>
            <input
              className={`${styles.input} ${styles.inputSym}`}
              value={blankSymbol}
              onChange={(e) =>
                onBlankSymbolChange(e.target.value.slice(-1) || '_')
              }
              maxLength={1}
              disabled={isRunning}
              spellCheck={false}
            />
          </div>

          <div className={`${styles.field} ${styles.fieldWide}`}>
            <label className={styles.label}>LOAD TAPE</label>
            <div className={styles.row}>
              <input
                className={styles.input}
                value={tapeInput}
                onChange={(e) => onTapeInputChange(e.target.value)}
                placeholder="e.g. 1011"
                disabled={isRunning}
                spellCheck={false}
              />
              <button
                type="button"
                className={styles.smallBtn}
                onClick={onLoadTape}
                disabled={isRunning}
              >
                load
              </button>
            </div>
          </div>
        </div>
      )}

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