'use client';

import { useState, useRef } from 'react';
import styles from './AsmEditor.module.css';
import clsx from 'clsx';

const EXAMPLE_ROWS = [
  { label: '.START', opcode: 'LOAD',  operand: 'R0, #0' },
  { label: '',       opcode: 'LOAD',  operand: 'R1, #10' },
  { label: '.LOOP',  opcode: 'ADD',   operand: 'R0, R0, #1' },
  { label: '',       opcode: 'CMP',   operand: 'R0, R1' },
  { label: '',       opcode: 'BNE',   operand: '.LOOP' },
  { label: '.END',   opcode: 'STORE', operand: 'R0, MEM[0]' },
  { label: '',       opcode: 'HALT',  operand: '' },
];

let _id = 0;
const makeRow = (label = '', opcode = '', operand = '') => ({
  id: _id++,
  label,
  opcode,
  operand,
});

export default function AsmEditor({ rows: externalRows, onRowsChange }) {
  // const [rows, setRows] = useState(() => EXAMPLE_ROWS.map(r => makeRow(r.label, r.opcode, r.operand)));
  const isControlled = externalRows !== undefined;
  const [internalRows, setInternalRows] = useState(() => EXAMPLE_ROWS.map(r => makeRow(r.label, r.opcode, r.operand)));
  const rows = isControlled ? externalRows : internalRows;

  const [focusedId, setFocusedId] = useState(null);
  const [copied, setCopied] = useState(false);
  const inputRefs = useRef({});

  const setRows = (updater) => {
    if (isControlled) {
      // updater 可能是函数也可能是直接值
      const next = typeof updater === 'function' ? updater(rows) : updater;
      onRowsChange?.(next);
    } else {
      setInternalRows(updater);
    }
  };

  const setRef = (id, col, el) => {
    if (!inputRefs.current[id]) inputRefs.current[id] = {};
    inputRefs.current[id][col] = el;
  };

  const focusCell = (id, col) => {
    inputRefs.current[id]?.[col]?.focus();
  };

  const addRow = (afterId = null) => {
    const newRow = makeRow();
    setRows(prev => {
      if (afterId === null) return [...prev, newRow];
      const idx = prev.findIndex(r => r.id === afterId);
      const next = [...prev];
      next.splice(idx + 1, 0, newRow);
      return next;
    });
    return newRow.id;
  };

  const deleteRow = id => {
    setRows(prev => {
      if (prev.length <= 1) return [makeRow()];
      return prev.filter(r => r.id !== id);
    });
  };

  const updateCell = (id, col, value) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [col]: value } : r));
  };

  const handleKeyDown = (e, id, col) => {
    const cols = ['label', 'opcode', 'operand'];
    const colIdx = cols.indexOf(col);

    if (e.key === 'Enter') {
      e.preventDefault();
      const currentRowIdx = rows.findIndex(r => r.id === id);
      const isLast = currentRowIdx === rows.length - 1;
      if (isLast) {
        const newId = _id;
        addRow(id);
        setTimeout(() => focusCell(newId, 'label'), 0);
      } else {
        const nextId = rows[currentRowIdx + 1].id;
        focusCell(nextId, 'label');
      }
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const dir = e.shiftKey ? -1 : 1;
      const nextColIdx = colIdx + dir;
      if (nextColIdx >= 0 && nextColIdx < cols.length) {
        focusCell(id, cols[nextColIdx]);
      } else if (nextColIdx >= cols.length) {
        const currentRowIdx = rows.findIndex(r => r.id === id);
        const isLast = currentRowIdx === rows.length - 1;
        if (isLast) {
          const newId = _id;
          addRow(id);
          setTimeout(() => focusCell(newId, 'label'), 0);
        } else {
          focusCell(rows[currentRowIdx + 1].id, 'label');
        }
      } else {
        const currentRowIdx = rows.findIndex(r => r.id === id);
        if (currentRowIdx > 0) focusCell(rows[currentRowIdx - 1].id, 'operand');
      }
    }

    if ((e.key === 'Backspace' || e.key === 'Delete') && e.altKey) {
      e.preventDefault();
      deleteRow(id);
    }
  };

  const handleExport = () => {
    const lines = rows
      .filter(r => r.label || r.opcode || r.operand)
      .map(r => `${r.label.padEnd(10)}  ${r.opcode.padEnd(8)}  ${r.operand}`)
      .join('\n');
    if (!lines) return;
    navigator.clipboard.writeText(lines).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const stats = {
    rows: rows.length,
    instructions: rows.filter(r => r.opcode.trim()).length,
    labels: rows.filter(r => r.label.trim()).length,
  };

  return (
    <div className={styles.asmRoot}>
      <div className={styles.asmToolbar}>
        <span className={styles.asmTitle}>Assembly Editor</span>
        <div className={styles.asmActions}>
          <button
            className={styles.asmBtn}
            onClick={() => setRows([makeRow()])}
          >
            Clear
          </button>
          <button
            className={styles.asmBtn}
            onClick={() => setRows(EXAMPLE_ROWS.map(r => makeRow(r.label, r.opcode, r.operand)))}
          >
            Load example
          </button>
          <button
            className={clsx(styles.asmBtn, styles.asmBtnPrimary)}
            onClick={handleExport}
          >
            {copied ? 'Copied ✓' : 'Export ↗'}
          </button>
        </div>
      </div>

      <div className={styles.asmTableContainer}>
        <div className={styles.asmHeader}>
          <div className={clsx(styles.asmHeaderCell, styles.asmHeaderCellCenter)}>Addr</div>
          <div className={clsx(styles.asmHeaderCell, styles.asmHeaderCellRight)}>Label</div>
          <div className={styles.asmHeaderCell}>Opcode</div>
          <div className={styles.asmHeaderCell}>Operand</div>
          <div className={styles.asmHeaderCell} />
        </div>

        <div className={styles.asmRows}>
          {rows.map((row, index) => (
            <div
              key={row.id}
              className={clsx(styles.asmRow, focusedId === row.id && styles.asmRowFocused)}
            >
              {/* Addr */}
              <div className={clsx(styles.asmCell, styles.asmCellAddr)}>
                {index.toString(16).toUpperCase().padStart(2, '0')} {/* 16进制显示更具汇编感，00, 01... */}
              </div>

              {/* Label */}
              <div className={clsx(styles.asmCell, styles.asmCellLabel)}>
                <input
                  ref={el => setRef(row.id, 'label', el)}
                  className={clsx(styles.asmInput, styles.asmInputLabel)}
                  type="text"
                  placeholder=".LABEL"
                  value={row.label}
                  spellCheck={false}
                  onFocus={() => setFocusedId(row.id)}
                  onBlur={() => setFocusedId(null)}
                  onChange={e => updateCell(row.id, 'label', e.target.value)}
                  onKeyDown={e => handleKeyDown(e, row.id, 'label')}
                />
              </div>

              {/* Opcode */}
              <div className={styles.asmCell}>
                <input
                  ref={el => setRef(row.id, 'opcode', el)}
                  className={clsx(styles.asmInput, styles.asmInputOpcode)}
                  type="text"
                  placeholder="OPCODE"
                  value={row.opcode}
                  spellCheck={false}
                  onFocus={() => setFocusedId(row.id)}
                  onBlur={() => setFocusedId(null)}
                  onChange={e => updateCell(row.id, 'opcode', e.target.value.toUpperCase())}
                  onKeyDown={e => handleKeyDown(e, row.id, 'opcode')}
                />
              </div>

              {/* Operand */}
              <div className={styles.asmCell}>
                <input
                  ref={el => setRef(row.id, 'operand', el)}
                  className={clsx(styles.asmInput, styles.asmInputOperand)}
                  type="text"
                  placeholder="operand / comment"
                  value={row.operand}
                  spellCheck={false}
                  onFocus={() => setFocusedId(row.id)}
                  onBlur={() => setFocusedId(null)}
                  onChange={e => updateCell(row.id, 'operand', e.target.value)}
                  onKeyDown={e => handleKeyDown(e, row.id, 'operand')}
                />
              </div>

              {/* Delete */}
              <button
                className={styles.asmDelBtn}
                title="Delete row (Alt+Backspace)"
                onClick={() => deleteRow(row.id)}
              >
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="2" y1="2" x2="10" y2="10" />
                  <line x1="10" y1="2" x2="2" y2="10" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        <button className={styles.asmAddRow} onClick={() => addRow(rows[rows.length - 1]?.id)}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="6" y1="1" x2="6" y2="11" />
            <line x1="1" y1="6" x2="11" y2="6" />
          </svg>
          add row
        </button>
      </div>

      <div className={styles.asmStatus}>
        <span className={styles.asmStat}>rows <span className={styles.asmStatVal}>{stats.rows}</span></span>
        <span className={styles.asmStat}>instructions <span className={styles.asmStatVal}>{stats.instructions}</span></span>
        <span className={styles.asmStat}>labels <span className={styles.asmStatVal}>{stats.labels}</span></span>
      </div>
    </div>
  );
}