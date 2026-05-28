"use client";

import { useRef, useEffect, useCallback } from 'react';
import styles from './TuringTape.module.css';

const CELL_WIDTH = 56;
const POINTER_HEIGHT = 56;

export default function TuringTape({
  tape,
  pointerPos,
  originIndex,
  state,
  isRunning,
  isHighlighted = false,
  onCellChange,
}) {
  const scrollRef = useRef(null);
  const didInitialCenterRef = useRef(false);

  // Center on pointer: instant on first mount, smooth afterwards.
  // During execution we always re-center so the head stays visible.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const targetLeft =
      pointerPos * CELL_WIDTH - el.clientWidth / 2 + CELL_WIDTH / 2;
    el.scrollTo({
      left: targetLeft,
      behavior: didInitialCenterRef.current ? 'smooth' : 'auto',
    });
    didInitialCenterRef.current = true;
  }, [pointerPos]);

  // Re-center on resize so the head doesn't drift off-screen.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onResize = () => {
      const targetLeft =
        pointerPos * CELL_WIDTH - el.clientWidth / 2 + CELL_WIDTH / 2;
      el.scrollTo({ left: targetLeft, behavior: 'auto' });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [pointerPos]);

  // Convert vertical wheel scroll → horizontal tape scroll.
  // Disabled while running so the user can't shift the view away from the head.
  const handleWheel = useCallback(
    (e) => {
      if (isRunning) return;
      const el = scrollRef.current;
      if (!el) return;
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    },
    [isRunning]
  );

  const handleCellInput = (idx, value) => {
    if (isRunning) return;
    // Only keep the last non-space character; treat empty as blank "_".
    const cleaned = value.replace(/\s/g, '').slice(-1);
    onCellChange(idx, cleaned === '' ? '_' : cleaned);
  };

  return (
    <section
      className={`${styles.wrapper} ${isRunning ? styles.wrapperRunning : ''}`}
    >
      <div className={styles.header}>
        <span className={styles.title}>TURING TAPE</span>
        <div className={styles.stats}>
          <div className={styles.pill}>
            <span className={styles.pillLabel}>head</span>
            <span className={styles.pillValue}>
              {pointerPos - originIndex >= 0 ? '+' : ''}
              {pointerPos - originIndex}
            </span>
          </div>
          <div className={`${styles.pill} ${styles.pillAccent}`}>
            <span className={styles.pillLabel}>state</span>
            <span className={styles.pillValue}>{state || 'q0'}</span>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className={`${styles.scroll} ${isRunning ? styles.scrollLocked : ''}`}
        onWheel={handleWheel}
      >
        <div
          className={styles.track}
          style={{
            width: tape.length * CELL_WIDTH,
            paddingTop: POINTER_HEIGHT + 6,
          }}
        >
          {/* Pointer — slides with the tape because it lives inside .track */}
          <div
            className={`${styles.pointer} ${
              isHighlighted ? styles.pointerHighlighted : ''
            }`}
            style={{
              left: pointerPos * CELL_WIDTH + CELL_WIDTH / 2,
              height: POINTER_HEIGHT,
            }}
            aria-hidden
          >
            <svg
              viewBox="0 0 64 64"
              width={64}
              height={POINTER_HEIGHT}
              className={styles.pointerSvg}
            >
              <defs>
                <linearGradient
                  id="pointerFill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="var(--accent-primary)" />
                  <stop offset="100%" stopColor="var(--accent-tertiary)" />
                </linearGradient>
              </defs>
              <polygon
                points="2,2 62,2 32,62"
                fill="url(#pointerFill)"
                stroke="var(--accent-primary)"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <text
                x="32"
                y="24"
                textAnchor="middle"
                className={styles.pointerText}
              >
                {state || 'q0'}
              </text>
            </svg>
          </div>

          {/* Cells */}
          <div className={styles.cells}>
            {tape.map((value, i) => {
              const offset = Math.abs(i - originIndex);
              const isHead = i === pointerPos;
              const isOrigin = i === originIndex;
              return (
                <div
                  key={i}
                  className={`${styles.cell} ${
                    isHead ? styles.cellHead : ''
                  } ${isOrigin ? styles.cellOrigin : ''}`}
                  style={{ width: CELL_WIDTH }}
                >
                  <span
                    className={`${styles.cellLabel} ${
                      isHead ? styles.cellLabelHead : ''
                    }`}
                  >
                    {offset}
                  </span>
                  <input
                    className={styles.cellInput}
                    value={value === '_' ? '' : value}
                    onChange={(e) => handleCellInput(i, e.target.value)}
                    disabled={isRunning}
                    maxLength={1}
                    placeholder="_"
                    spellCheck={false}
                    aria-label={`cell at offset ${i - originIndex}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <span className={styles.footerHint}>
          {isRunning
            ? 'execution in progress · tape locked'
            : 'scroll horizontally or use the wheel · click a cell to edit'}
        </span>
      </div>
    </section>
  );
}