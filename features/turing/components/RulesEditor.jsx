"use client";

import { useMemo, useRef, useState } from 'react';
import styles from './RulesEditor.module.css';

const MOVE_OPTIONS = ['L', 'R', 'S'];

// A canonical "binary increment" example, useful as a sanity check.
const EXAMPLE_RULES = [
  { currentState: 'q0', read: '0', nextState: 'q0', write: '0', move: 'R' },
  { currentState: 'q0', read: '1', nextState: 'q0', write: '1', move: 'R' },
  { currentState: 'q0', read: '_', nextState: 'q1', write: '_', move: 'L' },
  { currentState: 'q1', read: '0', nextState: 'qH', write: '1', move: 'S' },
  { currentState: 'q1', read: '1', nextState: 'q1', write: '0', move: 'L' },
  { currentState: 'q1', read: '_', nextState: 'qH', write: '1', move: 'S' },
];

let __rid = 0;
const nextId = () => ++__rid;

export const makeEmptyRule = () => ({
  id: nextId(),
  currentState: '',
  read: '',
  nextState: '',
  write: '',
  move: 'R',
});

export const makeExampleRules = () =>
  EXAMPLE_RULES.map((r) => ({ id: nextId(), ...r }));

export default function RulesEditor({
  rules,
  onRulesChange,
  isRunning,
  activeRuleId = null,
}) {
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef(null);

  const stats = useMemo(() => {
    const states = new Set();
    rules.forEach((r) => {
      if (r.currentState) states.add(r.currentState);
      if (r.nextState) states.add(r.nextState);
    });
    const defined = rules.filter(
      (r) => r.currentState && r.read && r.nextState && r.write
    ).length;
    return { states: states.size, defined };
  }, [rules]);

  const updateRule = (id, patch) => {
    if (isRunning) return;
    onRulesChange(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRule = (id) => {
    if (isRunning) return;
    if (rules.length <= 1) {
      onRulesChange([makeEmptyRule()]);
      return;
    }
    onRulesChange(rules.filter((r) => r.id !== id));
  };

  const addRule = () => {
    if (isRunning) return;
    onRulesChange([...rules, makeEmptyRule()]);
  };

  const clearAll = () => {
    if (isRunning) return;
    onRulesChange([makeEmptyRule()]);
  };

  const loadExample = () => {
    if (isRunning) return;
    onRulesChange(makeExampleRules());
  };

  const exportAs = (format) => {
    const text =
      format === 'json'
        ? JSON.stringify(
            rules.map(({ id, ...rest }) => rest),
            null,
            2
          )
        : rules
            .filter((r) => r.currentState && r.read && r.nextState && r.write)
            .map(
              (r) =>
                `${r.currentState} ${r.read} -> ${r.nextState} ${r.write} ${r.move}`
            )
            .join('\n');
    navigator.clipboard?.writeText(text).catch(() => {});
    setExportOpen(false);
  };

  return (
    <section className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.title}>TRANSITION RULES</span>
        </div>

        <div className={styles.toolbar}>
          <button
            type="button"
            className={styles.btnGhost}
            onClick={clearAll}
            disabled={isRunning}
          >
            Clear
          </button>
          <button
            type="button"
            className={styles.btnGhost}
            onClick={loadExample}
            disabled={isRunning}
          >
            Load example
          </button>
          <div className={styles.exportWrap} ref={exportRef}>
            <button
              type="button"
              className={styles.btnAccent}
              onClick={() => setExportOpen((v) => !v)}
              disabled={isRunning}
            >
              Export
              <span className={styles.caret}>▾</span>
            </button>
            {exportOpen && !isRunning && (
              <div className={styles.exportMenu}>
                <button onClick={() => exportAs('text')}>
                  copy as text
                </button>
                <button onClick={() => exportAs('json')}>
                  copy as JSON
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.table}>
        <div className={styles.tableHead}>
          <span className={styles.colAddr}>#</span>
          <span className={styles.colState}>STATE</span>
          <span className={styles.colRead}>READ</span>
          <span className={styles.colArrow}> </span>
          <span className={styles.colState}>NEXT</span>
          <span className={styles.colWrite}>WRITE</span>
          <span className={styles.colMove}>MOVE</span>
          <span className={styles.colAction}> </span>
        </div>

        <div className={styles.tableBody}>
          {rules.map((rule, idx) => {
            const isActive = rule.id === activeRuleId;
            return (
              <div
                key={rule.id}
                className={`${styles.row} ${
                  isActive ? styles.rowActive : ''
                }`}
              >
                <span className={styles.addr}>
                  {String(idx).padStart(2, '0')}
                </span>

                <input
                  className={styles.input}
                  value={rule.currentState}
                  onChange={(e) =>
                    updateRule(rule.id, { currentState: e.target.value })
                  }
                  placeholder="q0"
                  disabled={isRunning}
                  spellCheck={false}
                />

                <input
                  className={`${styles.input} ${styles.inputSym}`}
                  value={rule.read}
                  onChange={(e) =>
                    updateRule(rule.id, { read: e.target.value.slice(-1) })
                  }
                  placeholder="0"
                  disabled={isRunning}
                  maxLength={1}
                  spellCheck={false}
                />

                <span className={styles.arrow}>→</span>

                <input
                  className={styles.input}
                  value={rule.nextState}
                  onChange={(e) =>
                    updateRule(rule.id, { nextState: e.target.value })
                  }
                  placeholder="q1"
                  disabled={isRunning}
                  spellCheck={false}
                />

                <input
                  className={`${styles.input} ${styles.inputSym}`}
                  value={rule.write}
                  onChange={(e) =>
                    updateRule(rule.id, { write: e.target.value.slice(-1) })
                  }
                  placeholder="1"
                  disabled={isRunning}
                  maxLength={1}
                  spellCheck={false}
                />

                <div className={styles.moveGroup}>
                  {MOVE_OPTIONS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`${styles.moveBtn} ${
                        rule.move === m ? styles.moveBtnActive : ''
                      }`}
                      onClick={() => updateRule(rule.id, { move: m })}
                      disabled={isRunning}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className={styles.deleteBtn}
                  onClick={() => removeRule(rule.id)}
                  disabled={isRunning}
                  aria-label="delete rule"
                  title="delete rule"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          className={styles.addRow}
          onClick={addRule}
          disabled={isRunning}
        >
          + add rule
        </button>
      </div>

      <div className={styles.footer}>
        <span className={styles.stat}>
          rules <strong>{rules.length}</strong>
        </span>
        <span className={styles.stat}>
          complete <strong>{stats.defined}</strong>
        </span>
        <span className={styles.stat}>
          states <strong>{stats.states}</strong>
        </span>
      </div>
    </section>
  );
}