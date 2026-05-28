"use client";

import { useMemo } from 'react';
import styles from './RulesEditor.module.css';

const MOVE_OPTIONS = ['L', 'R'];

let uidCounter = 0;
const uid = () => `r${Date.now().toString(36)}${(uidCounter++).toString(36)}`;

export function makeEmptyRule() {
  return {
    id: uid(),
    currentState: '',
    read: '',
    write: '',
    nextState: '',
    move: 'R',
  };
}

// Flips every bit while scanning right, then halts on the first blank `b`
// because no rule matches (state 1, read b).
const EXAMPLE_RULES = [
  { id: uid(), currentState: '1', read: '0', write: '1', nextState: '1', move: 'R' },
  { id: uid(), currentState: '1', read: '1', write: '0', nextState: '1', move: 'R' },
];

export default function RulesEditor({
  rules,
  onRulesChange,
  isRunning,
  activeRuleId,
}) {
  // A rule is "complete enough" to take part in conflict detection once it has
  // both a current state and a read symbol.
  const conflicts = useMemo(() => {
    const seen = new Map();
    const bad = new Set();
    for (const r of rules) {
      if (r.currentState === '' || r.read === '') continue;
      const key = `${r.currentState}\u0000${r.read}`;
      if (seen.has(key)) {
        bad.add(r.id);
        bad.add(seen.get(key));
      } else {
        seen.set(key, r.id);
      }
    }
    return bad;
  }, [rules]);

  const updateRule = (id, patch) => {
    onRulesChange(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const addRule = () => {
    onRulesChange([...rules, makeEmptyRule()]);
  };

  const removeRule = (id) => {
    const next = rules.filter((r) => r.id !== id);
    onRulesChange(next.length ? next : [makeEmptyRule()]);
  };

  const loadExample = () => {
    onRulesChange(EXAMPLE_RULES.map((r) => ({ ...r, id: uid() })));
  };

  const clearAll = () => {
    onRulesChange([makeEmptyRule()]);
  };

  const exportRules = () => {
    const text = rules
      .filter(
        (r) =>
          r.currentState !== '' &&
          r.read !== '' &&
          r.write !== '' &&
          r.nextState !== ''
      )
      .map(
        (r) =>
          `(${r.currentState},${r.read},${r.write},${r.nextState},${r.move})`
      )
      .join('\n');
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  };

  return (
    <section className={styles.wrapper}>
      <div className={styles.header}>
        <span className={styles.title}>RULES</span>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.headerBtn}
            onClick={loadExample}
            disabled={isRunning}
          >
            load example
          </button>
          <button
            type="button"
            className={styles.headerBtn}
            onClick={exportRules}
          >
            copy tuples
          </button>
        </div>
      </div>

      <div className={styles.tableHead}>
        <span>#</span>
        <span>STATE</span>
        <span>READ</span>
        <span className={styles.headArrow}>→</span>
        <span>WRITE</span>
        <span>NEXT</span>
        <span>MOVE</span>
        <span />
      </div>

      <div className={styles.tableBody}>
        {rules.map((rule, i) => {
          const isActive = rule.id === activeRuleId;
          const isConflict = conflicts.has(rule.id);
          return (
            <div
              key={rule.id}
              className={`${styles.row} ${isActive ? styles.rowActive : ''} ${
                isConflict ? styles.rowConflict : ''
              }`}
            >
              <span className={styles.index}>{i + 1}</span>

              <input
                className={styles.input}
                value={rule.currentState}
                onChange={(e) =>
                  updateRule(rule.id, {
                    currentState: e.target.value.replace(/\s/g, ''),
                  })
                }
                placeholder="1"
                disabled={isRunning}
                spellCheck={false}
              />

              <input
                className={`${styles.input} ${styles.inputSym}`}
                value={rule.read}
                onChange={(e) =>
                  updateRule(rule.id, {
                    read: e.target.value.replace(/\s/g, '').slice(-1),
                  })
                }
                placeholder="0"
                maxLength={1}
                disabled={isRunning}
                spellCheck={false}
              />

              <span className={styles.rowArrow}>→</span>

              <input
                className={`${styles.input} ${styles.inputSym}`}
                value={rule.write}
                onChange={(e) =>
                  updateRule(rule.id, {
                    write: e.target.value.replace(/\s/g, '').slice(-1),
                  })
                }
                placeholder="1"
                maxLength={1}
                disabled={isRunning}
                spellCheck={false}
              />

              <input
                className={styles.input}
                value={rule.nextState}
                onChange={(e) =>
                  updateRule(rule.id, {
                    nextState: e.target.value.replace(/\s/g, ''),
                  })
                }
                placeholder="1"
                disabled={isRunning}
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
                className={styles.removeBtn}
                onClick={() => removeRule(rule.id)}
                disabled={isRunning}
                aria-label="remove rule"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      <div className={styles.footer}>
        <div className={styles.footerActions}>
          <button
            type="button"
            className={styles.footerBtn}
            onClick={addRule}
            disabled={isRunning}
          >
            + add rule
          </button>
          <button
            type="button"
            className={styles.footerBtnGhost}
            onClick={clearAll}
            disabled={isRunning}
          >
            clear
          </button>
        </div>
        <div className={styles.stats}>
          <span className={styles.stat}>
            rules <strong>{rules.length}</strong>
          </span>
          <span
            className={`${styles.stat} ${
              conflicts.size > 0 ? styles.statWarn : ''
            }`}
          >
            conflicts <strong>{conflicts.size}</strong>
          </span>
        </div>
      </div>
    </section>
  );
}