'use client';

import styles from './TraceTable.module.css';
import clsx from 'clsx';

const EXAMPLE_ROWS = [
  { pc: 0,  r0: 0, r1: 2  },
  { pc: 1,  r0: 1  },
  { pc: 2,  r0: 2  },
  { pc: 3,  r0: 3  },
  { pc: 4,  r0: 4  },
  { pc: 5,  r0: 10 },
  { pc: 6,  r0: 10 },
  { pc: 6,  r0: 10 },
  { pc: 6,  r0: 10 },
  { pc: 6,  r0: 10 },
  { pc: 6,  r0: 10 },
  { pc: 6,  r0: 10 },
  { pc: 6,  r0: 10 },
  { pc: 6,  r0: 10 },
];

const DEFAULT_COLUMNS = [
  { key: 'pc', label: 'PC' },
  { key: 'r0', label: 'R0' },
  { key: 'r1', label: 'R1' },
  { key: 'r2', label: 'R2' },
  { key: 'r3', label: 'R3' },
  // { key: 'r4', label: 'R4' },
  // { key: 'r5', label: 'R5' },
  // { key: 'r6', label: 'R6' },
  // { key: 'r7', label: 'R7' },
  // { key: 'r8', label: 'R8' },
];

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