'use client';

import { useRef, useEffect } from 'react';
import styles from './TraceTable.module.css';
import clsx from 'clsx';

// columns:   [{ key: 'pc', label: 'PC' }, ...]
// rows:      [{ pc: 0, r0: 0 }, ...]
// colWidth:  fixed px width per column (default 80)
// maxHeight: max px height of the scrollable body (default 320)
export default function TraceTable({
  columns   = DEFAULT_COLUMNS,
  rows      = EXAMPLE_ROWS,
  colWidth  = 80,
  height    = 320,
  highlightCells = [], 
}) {
  const gridCols  = `repeat(${columns.length}, ${colWidth}px)`;
  const tableWidth = columns.length * colWidth;
  const heightStyle = typeof height === 'number' ? `${height}px` : height;

  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [rows]);

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <span className={styles.title}>Trace Table</span>
        <span className={styles.badge}>{rows.length} steps</span>
      </div>

      {/* Outer wrapper: clips horizontal overflow */}
      <div className={styles.tableWrap}>

        {/* Scrollable body */}
        <div className={styles.scrollBody} style={{ height: heightStyle }} ref={scrollRef}>

          {/* Sticky header — outside the scroll box so it never scrolls away */}
          <div
            className={styles.headerRow}
            style={{ gridTemplateColumns: gridCols, width: tableWidth }}
          >
            {columns.map(col => (
              <div key={col.key} className={clsx(styles.cell, styles.headerCell)}>
                {col.label}
              </div>
            ))}
          </div>

          {/* Inner div fixes the width so rows don't wrap */}
          <div style={{ width: tableWidth }}>
            {rows.map((row, rowIdx) => (
              <div
                key={rowIdx}
                className={clsx(styles.bodyRow, rowIdx % 2 === 0 && styles.rowEven)}
                style={{ gridTemplateColumns: gridCols }}
              >
                {columns.map((col, colIdx) => {
                  const prev    = rowIdx > 0 ? rows[rowIdx - 1][col.key] : undefined;
                  const changed = rowIdx > 0 && prev !== row[col.key] && col.key !== 'pc';
                  const isLastRow    = rowIdx === rows.length - 1;
                  const isHighlighted = isLastRow && highlightCells.includes(col.key);
                  return (
                    <div
                      key={col.key}
                      className={clsx(
                        styles.cell,
                        styles.dataCell,
                        changed          && styles.cellChanged,
                        col.key === 'pc' && styles.cellPc,
                        isHighlighted    && styles.cellHighlighted,
                      )}
                      onAnimationEnd={e => {
                        if (e.currentTarget.classList.contains(styles.cellHighlighted)) {
                          e.currentTarget.classList.remove(styles.cellHighlighted);
                          e.currentTarget.style.opacity = '1';
                          e.currentTarget.style.transform = 'translateX(0)';
                          e.currentTarget.style.animation = 'none';
                        }
                      }}
                    >
                      <span className={styles.cellText}>
                        {row[col.key] ?? '—'}
                      </span>
                      {/* changed indicator on the leftmost cell of a changed row */}
                      {changed && colIdx === 0 && <span className={styles.changedBar} />}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}