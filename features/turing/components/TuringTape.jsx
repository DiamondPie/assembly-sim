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
  blank = 'b',
  isRunning,
  isHighlighted = false,
  onCellChange,
}) {
  const scrollRef = useRef(null);
  const didInitialCenterRef = useRef(false);
  const inputRefs = useRef([]);

  // Read isRunning inside the stable native wheel listener.
  const isRunningRef = useRef(isRunning);
  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  // --- smooth horizontal scroll engine (rAF lerp) ------------------------
  const targetRef = useRef(null);
  const rafRef = useRef(null);

  const animate = useCallback(() => {
    const el = scrollRef.current;
    if (!el || targetRef.current == null) {
      rafRef.current = null;
      return;
    }
    const cur = el.scrollLeft;
    const diff = targetRef.current - cur;
    if (Math.abs(diff) < 0.5) {
      el.scrollLeft = targetRef.current;
      targetRef.current = null;
      rafRef.current = null;
      return;
    }
    // Ease toward the target — gives the scroll a fluid feel.
    el.scrollLeft = cur + diff * 0.2;
    rafRef.current = requestAnimationFrame(animate);
  }, []);

  const cancelAnim = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    targetRef.current = null;
  }, []);

  const smoothScrollTo = useCallback(
    (left) => {
      const el = scrollRef.current;
      if (!el) return;
      const max = el.scrollWidth - el.clientWidth;
      targetRef.current = Math.max(0, Math.min(max, left));
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(animate);
      }
    },
    [animate]
  );

  const smoothScrollBy = useCallback(
    (delta) => {
      const el = scrollRef.current;
      if (!el) return;
      const base = targetRef.current == null ? el.scrollLeft : targetRef.current;
      smoothScrollTo(base + delta);
    },
    [smoothScrollTo]
  );

  // Center on the machine head: instant on first mount, smooth afterwards.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    cancelAnim(); // don't fight a wheel/edit animation
    const targetLeft =
      pointerPos * CELL_WIDTH - el.clientWidth / 2 + CELL_WIDTH / 2;
    el.scrollTo({
      left: targetLeft,
      behavior: didInitialCenterRef.current ? 'smooth' : 'auto',
    });
    didInitialCenterRef.current = true;
  }, [pointerPos, cancelAnim]);

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

  // Trap the wheel over the tape: scroll the tape, never the page. A native,
  // non-passive listener is required so preventDefault() actually works
  // (React's synthetic onWheel is passive and can't stop the page).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (isRunningRef.current) return; // tape locked while running
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      e.preventDefault();
      const delta =
        Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      smoothScrollBy(delta);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [smoothScrollBy]);

  // Cancel any in-flight animation on unmount.
  useEffect(() => cancelAnim, [cancelAnim]);

  // Smoothly nudge a cell into view (used by the auto-advance caret).
  const ensureCellVisible = useCallback(
    (index) => {
      const el = scrollRef.current;
      if (!el) return;
      const cellLeft = index * CELL_WIDTH;
      const cellRight = cellLeft + CELL_WIDTH;
      const viewLeft = el.scrollLeft;
      const viewRight = viewLeft + el.clientWidth;
      if (cellRight > viewRight) {
        smoothScrollTo(cellRight - el.clientWidth + CELL_WIDTH);
      } else if (cellLeft < viewLeft) {
        smoothScrollTo(cellLeft - CELL_WIDTH);
      }
    },
    [smoothScrollTo]
  );

  const handleCellInput = (idx, rawValue) => {
    if (isRunning) return;
    // Keep the last non-space character; empty means the cell is blank.
    const cleaned = rawValue.replace(/\s/g, '').slice(-1);
    onCellChange(idx, cleaned === '' ? blank : cleaned);

    // Auto-advance: after writing a character, jump to the next cell and
    // select its contents so continued typing overwrites what's there.
    if (cleaned !== '') {
      const nextEl = inputRefs.current[idx + 1];
      if (nextEl) {
        nextEl.focus({ preventScroll: true });
        nextEl.select();
        ensureCellVisible(idx + 1);
      }
    }
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
            <span className={styles.pillValue}>{state || '1'}</span>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className={`${styles.scroll} ${isRunning ? styles.scrollLocked : ''}`}
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
                <linearGradient id="pointerFill" x1="0" y1="0" x2="0" y2="1">
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
                {state || '1'}
              </text>
            </svg>
          </div>

          {/* Cells */}
          <div className={styles.cells}>
            {tape.map((value, i) => {
              const offset = Math.abs(i - originIndex);
              const isHead = i === pointerPos;
              const isOrigin = i === originIndex;
              const isBlank = value === blank;
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
                    ref={(el) => {
                      inputRefs.current[i] = el;
                    }}
                    className={styles.cellInput}
                    value={isBlank ? '' : value}
                    onChange={(e) => handleCellInput(i, e.target.value)}
                    disabled={isRunning}
                    maxLength={1}
                    placeholder={blank}
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
            : 'scroll over the tape to pan · type into a cell to write and jump to the next'}
        </span>
      </div>
    </section>
  );
}