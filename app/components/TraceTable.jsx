'use client';

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
  height = 320,
}) {
  const gridCols  = `repeat(${columns.length}, ${colWidth}px)`;
  const tableWidth = columns.length * colWidth;

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <span className={styles.title}>Trace Table</span>
        <span className={styles.badge}>{rows.length} steps</span>
      </div>

      {/* Outer wrapper: clips horizontal overflow */}
      <div className={styles.tableWrap}>

        {/* Scrollable body */}
        <div className={styles.scrollBody} style={{ height }}>

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
                  return (
                    <div
                      key={col.key}
                      className={clsx(
                        styles.cell,
                        styles.dataCell,
                        changed          && styles.cellChanged,
                        col.key === 'pc' && styles.cellPc,
                      )}
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