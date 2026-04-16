'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './AsmEditor.module.css';
import { checkSyntax } from '@/app/AsmVM';   // 路径按你的项目调整
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { isEditorEmpty } from '@/app/AsmVM';

const EXAMPLE_ROWS = [
  { label: '',        opcode: 'IN',        operand: 'N' },
  { label: 'START:',  opcode: 'LOAD',      operand: 'TERM' },
  { label: '',        opcode: 'COMPARE',   operand: 'N' },
  { label: '',        opcode: 'JUMPLT',    operand: 'FINISH' },
  { label: '',        opcode: 'ADD',       operand: 'SUM' },
  { label: '',        opcode: 'STORE',     operand: 'SUM' },
  { label: '',        opcode: 'INCREMENT', operand: 'TERM' },
  { label: '',        opcode: 'JUMP',      operand: 'START' },
  { label: 'FINISH:', opcode: 'OUT',       operand: 'SUM' },
  { label: '',        opcode: 'HALT',      operand: '' },
  { label: 'N:',      opcode: '.DATA',     operand: '0' },
  { label: 'TERM:',   opcode: '.DATA',     operand: '1' },
  { label: 'SUM:',    opcode: '.DATA',     operand: '0' },
];

let _id = 0;
const makeRow = (label = '', opcode = '', operand = '') => ({
  id: _id++,
  label,
  opcode,
  operand,
  disabled: false, 
});

export default function AsmEditor({ rows: externalRows, onRowsChange, isRunning = false, onTerminate }) {
  // const [rows, setRows] = useState(() => EXAMPLE_ROWS.map(r => makeRow(r.label, r.opcode, r.operand)));
  const isControlled = externalRows !== undefined;
  const [internalRows, setInternalRows] = useState(() => EXAMPLE_ROWS.map(r => makeRow(r.label, r.opcode, r.operand)));
  const rows = isControlled ? externalRows : internalRows;

  const [focusedId, setFocusedId] = useState(null);
  const [copied, setCopied] = useState(false);
  const inputRefs = useRef({});

  const [warnings, setWarnings] = useState({});
  const [tooltip, setTooltip]   = useState(null); // { x, y, message } | null

  const COLS = ['label', 'opcode', 'operand'];

  // 500ms debounce
  useEffect(() => {
    const t = setTimeout(() => setWarnings(checkSyntax(rows).cells), 500);
    return () => clearTimeout(t);
  }, [rows]);
  useEffect(() => {
    if (!tooltip) return;
    const stillWarn = warnings[tooltip.rowId]?.[tooltip.col];
    if (!stillWarn) {
      setTooltip(null);          // 警告已修复 → 立即收起
    } else if (stillWarn !== tooltip.message) {
      setTooltip(t => ({ ...t, message: stillWarn })); // 警告变化 → 更新文字
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warnings]);  // 故意不依赖 tooltip，避免循环

  const showTooltip = (e, rowId, col, message) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      x: rect.left + rect.width / 2,
      y: rect.bottom + 10,
      rowId, col, message,
    });
  };
  const hideTooltip = () => setTooltip(null);

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

  const moveCursorToEnd = (id, col) => {
    setTimeout(() => {
      const el = inputRefs.current[id]?.[col];
      if (!el) return;
      el.focus();
      const len = el.value.length;
      el.setSelectionRange(len, len);
    }, 0);
  };
  const moveCursorToStart = (id, col) => {
    setTimeout(() => {
      const el = inputRefs.current[id]?.[col];
      if (!el) return;
      el.focus();
      el.setSelectionRange(0, 0);
    }, 0);
  };
  const handleKeyDown = (e, id, col) => {
    const colIdx = COLS.indexOf(col);
    const rowIdx = rows.findIndex(r => r.id === id);
    const row    = rows[rowIdx];
    const value  = e.target.value;
    const caret  = e.target.selectionStart;
    const caretEnd = e.target.selectionEnd;
    const atStart = caret === 0 && caretEnd === 0;
    const atEnd   = caret === value.length && caretEnd === value.length;
  
    // ── Enter：在当前行下方插入新行，焦点到 opcode ──
    if (e.key === 'Enter') {
      e.preventDefault();
      const newRow = makeRow();
      setRows(prev => {
        const i = prev.findIndex(r => r.id === id);
        const next = [...prev];
        next.splice(i + 1, 0, newRow);
        return next;
      });
      setTimeout(() => focusCell(newRow.id, 'opcode'), 0);
      return;
    }
  
    // ── Tab：保留原行为 ──
    if (e.key === 'Tab') {
      e.preventDefault();
      const dir = e.shiftKey ? -1 : 1;
      const next = colIdx + dir;
      if (next >= 0 && next < COLS.length) {
        focusCell(id, COLS[next]);
      } else if (next >= COLS.length) {
        if (rowIdx === rows.length - 1) {
          const nr = makeRow();
          setRows(prev => [...prev, nr]);
          setTimeout(() => focusCell(nr.id, 'label'), 0);
        } else {
          focusCell(rows[rowIdx + 1].id, 'label');
        }
      } else if (rowIdx > 0) {
        focusCell(rows[rowIdx - 1].id, 'operand');
      }
      return;
    }
  
    // ── Alt+Backspace / Alt+Delete：保留原"删除整行" ──
    if ((e.key === 'Backspace' || e.key === 'Delete') && e.altKey) {
      e.preventDefault();
      deleteRow(id);
      return;
    }
  
    // ── Backspace（无修饰键，且单元格为空）── 
    if (e.key === 'Backspace' && value === '') {
      if (col === 'opcode' || col === 'operand') {
        e.preventDefault();
        const prevCol = COLS[colIdx - 1];
        moveCursorToEnd(id, prevCol);
        return;
      }
      if (col === 'label') {
        const rowEmpty = !row.opcode.trim() && !row.operand.trim();
        if (rowEmpty && rowIdx > 0) {
          e.preventDefault();
          const prevId = rows[rowIdx - 1].id;
          setRows(prev => prev.filter(r => r.id !== id));
          moveCursorToEnd(prevId, 'operand');
          return;
        }
        // 不为空 → 不做事（默认 Backspace 在空字符串本就无害）
      }
    }
  
    // ── Space：智能跳列 ──
    if (e.key === ' ' && (col === 'label' || col === 'opcode')) {
      const hasContent = value.length > 0;
      const rightCol   = col === 'label' ? 'opcode' : 'operand';
      const rightEmpty = !(row[rightCol]?.trim());
      if (hasContent && atEnd && rightEmpty) {
        e.preventDefault();
        moveCursorToStart(id, rightCol);
        return;
      }
    }
  
    // ── ArrowLeft：在内容最左侧 → 跳到左侧单元格末尾 ──
    if (e.key === 'ArrowLeft' && atStart) {
      if (col === 'opcode' || col === 'operand') {
        e.preventDefault();
        moveCursorToEnd(id, COLS[colIdx - 1]);
        return;
      }
      if (col === 'label' && rowIdx > 0) {
        e.preventDefault();
        moveCursorToEnd(rows[rowIdx - 1].id, 'operand');
        return;
      }
    }
  
    // ── ArrowRight：在内容最右侧 → 跳到右侧单元格开头 ──
    if (e.key === 'ArrowRight' && atEnd) {
      if (col === 'label' || col === 'opcode') {
        e.preventDefault();
        moveCursorToStart(id, COLS[colIdx + 1]);
        return;
      }
      if (col === 'operand' && rowIdx < rows.length - 1) {
        e.preventDefault();
        moveCursorToStart(rows[rowIdx + 1].id, 'label');
        return;
      }
    }

    // ── ArrowUp：跳到上一行同列末尾 ──
    if (e.key === 'ArrowUp' && rowIdx > 0) {
      e.preventDefault();
      moveCursorToEnd(rows[rowIdx - 1].id, col);
      return;
    }

    // ── ArrowDown：跳到下一行同列末尾 ──
    if (e.key === 'ArrowDown' && rowIdx < rows.length - 1) {
      e.preventDefault();
      moveCursorToEnd(rows[rowIdx + 1].id, col);
      return;
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
      toast.success('Program copied to clipboard.');
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const stats = {
    rows: rows.length,
    instructions: rows.filter(r => r.opcode.trim()).length,
    labels: rows.filter(r => r.label.trim()).length,
  };

  const addrTexts = (() => {
    let c = 0;
    return rows.map(row => {
      if (row.disabled) return '//';
      const t = c.toString().padStart(2, '0');
      c++;
      return t;
    });
  })();

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
            onClick={() => {
              if (!isEditorEmpty(rows)) {
                toast.error('Editor is not empty. Clear it first before loading the example.');
                return;
              }
              setRows(EXAMPLE_ROWS.map(r => makeRow(r.label, r.opcode, r.operand)));
            }}
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
              className={clsx(
                styles.asmRow, 
                focusedId === row.id && styles.asmRowFocused,
                row.disabled && styles.asmRowDisabled,
              )}
            >
              {/* Addr */}
              <div
                className={clsx(styles.asmCell, styles.asmCellAddr,
                                row.disabled && styles.asmCellAddrDisabled)}
                onClick={() => setRows(prev => prev.map(r =>
                  r.id === row.id ? { ...r, disabled: !r.disabled } : r
                ))}
                title={row.disabled ? 'Click to enable this line' : 'Click to disable this line'}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                {addrTexts[index]}
              </div>

              {/* Label */}
              <div 
                className={clsx(styles.asmCell, styles.asmCellLabel, warnings[row.id]?.label && styles.asmCellWarn)}
                data-asm-cell data-row-id={row.id} data-col="label"
                onMouseEnter={warnings[row.id]?.label
                  ? (e) => showTooltip(e, row.id, 'label', warnings[row.id].label) : undefined}
                onMouseLeave={warnings[row.id]?.label ? hideTooltip : undefined}
              >
                <input
                  ref={el => setRef(row.id, 'label', el)}
                  className={clsx(styles.asmInput, styles.asmInputLabel)}
                  type="text"
                  placeholder="LABEL:"
                  value={row.label}
                  spellCheck={false}
                  onFocus={() => setFocusedId(row.id)}
                  onBlur={() => {
                    setFocusedId(null);
                    // 兜底：失焦时若非空且无尾冒号 → 补上（覆盖粘贴等异常入口）
                    const v = row.label.trim();
                    if (v && !v.endsWith(':')) updateCell(row.id, 'label', v + ':');
                  }}
                  onChange={e => {
                    const newVal = e.target.value;
                    const oldVal = row.label;
                    // 删除方向（length 不增）：原样接受，但孤立的 ":" 收敛为 ""
                    if (newVal.length <= oldVal.length) {
                      updateCell(row.id, 'label', newVal === ':' ? '' : newVal);
                      return;
                    }
                    // 输入方向（length 增加）
                    if (newVal === '' || newVal.endsWith(':')) {
                      updateCell(row.id, 'label', newVal);
                      return;
                    }
                    // 缺冒号 → 补上，并把光标放回冒号前
                    const cursorPos = e.target.selectionStart ?? newVal.length;
                    updateCell(row.id, 'label', newVal + ':');
                    setTimeout(() => {
                      const el = inputRefs.current[row.id]?.label;
                      if (el) el.setSelectionRange(cursorPos, cursorPos);
                    }, 0);
                  }}
                  onKeyDown={e => handleKeyDown(e, row.id, 'label')}
                />
              </div>

              {/* Opcode */}
              <div 
                className={clsx(styles.asmCell, warnings[row.id]?.opcode && styles.asmCellWarn)}
                data-asm-cell data-row-id={row.id} data-col="opcode"
                onMouseEnter={warnings[row.id]?.opcode
                  ? (e) => showTooltip(e, row.id, 'opcode', warnings[row.id].opcode) : undefined}
                onMouseLeave={warnings[row.id]?.opcode ? hideTooltip : undefined}
              >
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
              <div 
                className={clsx(styles.asmCell, warnings[row.id]?.operand && styles.asmCellWarn)}
                data-asm-cell data-row-id={row.id} data-col="operand"
                onMouseEnter={warnings[row.id]?.operand
                  ? (e) => showTooltip(e, row.id, 'operand', warnings[row.id].operand) : undefined}
                onMouseLeave={warnings[row.id]?.operand ? hideTooltip : undefined}
              >
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

        {isRunning ? (
          <button
            className={clsx(styles.asmAddRow, styles.asmTerminateBtn)}
            onClick={onTerminate}
            title="Terminate the running program"
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor"
                strokeWidth="1.6" strokeLinecap="round">
              <rect x="2.5" y="2.5" width="7" height="7" rx="1" />
            </svg>
            terminate program
          </button>
        ) : (
          <button className={styles.asmAddRow} onClick={() => addRow(rows[rows.length - 1]?.id)}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor"
                strokeWidth="1.5" strokeLinecap="round">
              <line x1="6" y1="1" x2="6" y2="11" />
              <line x1="1" y1="6" x2="11" y2="6" />
            </svg>
            add row
          </button>
        )}
      </div>

      <div className={styles.asmStatus}>
        <span className={styles.asmStat}>rows <span className={styles.asmStatVal}>{stats.rows}</span></span>
        <span className={styles.asmStat}>instructions <span className={styles.asmStatVal}>{stats.instructions}</span></span>
        <span className={styles.asmStat}>labels <span className={styles.asmStatVal}>{stats.labels}</span></span>
      </div>

      {tooltip && typeof document !== 'undefined' && createPortal(
        <div className={styles.warningTooltip}
            style={{ left: tooltip.x, top: tooltip.y }}>
          {tooltip.message}
        </div>,
        document.body
      )}
    </div>
  );
}