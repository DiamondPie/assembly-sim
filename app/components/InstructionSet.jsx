import { useState, useEffect, useRef } from 'react';
import styles from './InstructionSet.module.css';

const INSTRUCTION_SET = [
  { opcode: 'LOAD',      operand: 'addr',  description: 'Load value into register R' },
  { opcode: 'STORE',     operand: 'addr',  description: 'Store R into address' },
  { opcode: 'CLEAR',     operand: 'addr',  description: 'Store 0 into address' },
  { opcode: 'ADD',       operand: 'addr',  description: 'R <- R + CON(addr)' },
  { opcode: 'INCREMENT', operand: 'addr',  description: 'Add CON(addr) by 1' },
  { opcode: 'SUBTRACT',  operand: 'addr',  description: 'R <- R − CON(addr)' },
  { opcode: 'DECREMENT', operand: 'addr',  description: 'Subtract CON(addr) by 1' },
  { opcode: 'COMPARE',   operand: 'addr',  description: 'Set flags by comparing CON(addr) vs R' },
  { opcode: 'JUMP',      operand: 'label', description: 'Jump to label' },
  { opcode: 'JUMPGT',    operand: 'label', description: 'Jump if GT flag is 1' },
  { opcode: 'JUMPLT',    operand: 'label', description: 'Jump if LT flag is 1' },
  { opcode: 'JUMPEQ',    operand: 'label', description: 'Jump if EQ flag is 1' },
  { opcode: 'JUMPNEQ',   operand: 'label', description: 'Jump if EQ flag is 0' },
  { opcode: 'IN',        operand: 'addr',  description: 'Read integer into CON(addr)' },
  { opcode: 'OUT',       operand: 'addr',  description: 'Output CON(addr)' },
  { opcode: 'HALT',      operand: '-',     description: 'Stop execution' },
  { opcode: '.DATA',     operand: 'value', description: 'Define data constant' },
];

export default function InstructionSet() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef(null);
  const btnRef = useRef(null);

  // close on Escape
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    if (!open && mounted) {
      const timer = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open, mounted]);

  return (
    <>
      {/* Floating Action Button */}
      <button
        ref={btnRef}
        className={`${styles.fab} ${open ? styles.fabOpen : ''}`}
        onClick={() => setOpen(v => {
          const next = !v;
          if (next) setMounted(true);
          return next;
        })}
        aria-label="Toggle instruction set reference"
        title="Instruction Set"
      >
        <span className={styles.fabIcon}>
          {open 
            ? <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="m12 13.4l-4.9 4.9q-.275.275-.7.275t-.7-.275t-.275-.7t.275-.7l4.9-4.9l-4.9-4.9q-.275-.275-.275-.7t.275-.7t.7-.275t.7.275l4.9 4.9l4.9-4.9q.275-.275.7-.275t.7.275t.275.7t-.275.7L13.4 12l4.9 4.9q.275.275.275.7t-.275.7t-.7.275t-.7-.275z"/></svg> 
            : <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="m9.6 15.6l1.4-1.45L8.85 12L11 9.85L9.6 8.4L6 12zm4.8 0L18 12l-3.6-3.6L13 9.85L15.15 12L13 14.15zM5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h4.2q.325-.9 1.088-1.45T12 1t1.713.55T14.8 3H19q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21zm0-2h14V5H5zm7.538-14.962q.212-.213.212-.538t-.213-.537T12 2.75t-.537.213t-.213.537t.213.538t.537.212t.538-.213M5 19V5z"/></svg>
          }
        </span>
        <span className={styles.fabRing} />
      </button>

      {/* Panel */}
      <div
        ref={panelRef}
        className={`${styles.panel} ${open ? styles.panelOpen : ''}`}
      >
        {/* Header */}
        <div className={styles.panelHeader}>
          <span className={styles.panelDot} />
          <h3 className={styles.panelTitle}>INSTRUCTION SET</h3>
          <span className={styles.panelTip}>Esc to close</span>
          <span className={styles.panelBadge}>{INSTRUCTION_SET.length}</span>
        </div>

        {/* Table */}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>OPCODE</th>
                <th className={styles.th}>OPERAND</th>
                <th className={styles.th}>DESCRIPTION</th>
              </tr>
            </thead>
            <tbody>
              {mounted && INSTRUCTION_SET.map((row, i) => (
                <tr
                  key={row.opcode}
                  className={styles.tr}
                  style={{ animationDelay: `${i * 25}ms` }}
                >
                  <td className={`${styles.td} ${styles.opcode}`}>{row.opcode}</td>
                  <td className={`${styles.td} ${styles.operand}`}>{row.operand}</td>
                  <td className={`${styles.td} ${styles.desc}`}>{row.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}