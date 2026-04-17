"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import AsmEditor from '@/app/components/AsmEditor';
import TraceTable from '@/app/components/TraceTable';
import AssemblyGraph from '@/app/components/AssemblyGraph';
import SimControls from '@/app/components/SimControls';
import InstructionSet from '@/app/components/InstructionSet';
import { checkSyntax, parseAsmText, isEditorEmpty, decodeProgram } from '@/app/AsmVM';

import {
  parse,
  createVM,
  step,
  run,
  provideInput,
  traceToTableRows,
  traceToTableColumns,
} from '@/app/AsmVM';
import Footer from '@/app/components/Footer';

let _rid = 0;
const mk = (label, opcode, operand) => ({
  id: _rid++,
  label,
  opcode,
  operand,
  disabled: false,
});

const initial_row = [mk('', '', '')];

export default function Page() {
  const [rows, setRows]           = useState(initial_row);
  const [vmState, setVmState]     = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [prevProgram, setPrevProgram] = useState(null);
  const [autoRun, setAutoRun] = useState(false);

  // First mount: Attempt to decode from URL ?p=xxx
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const match = window.location.search.match(/[?&]p=([^&]+)/);
    const encoded = match ? match[1] : null;
    if (!encoded) return;

    const cleanUrl = () => {
      const params = new URLSearchParams(window.location.search);
      // Remove the ?p parameter to prevent user changes from being overwritten during refresh/secondary editing.
      params.delete('p');
      const newQuery = params.toString();
      const newUrl = window.location.pathname + (newQuery ? `?${newQuery}` : '');
      window.history.replaceState({}, '', newUrl);
    };

    const text = decodeProgram(encoded);
    if (!text) {
      toast.error('Share link is invalid or corrupted. Editor left empty.');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRows([mk('', '', '')]);
      cleanUrl();
      return;
    }

    const parsed = parseAsmText(text);
    if (!parsed) {
      toast.error('Share link does not contain a valid program. Editor left empty.');
      setRows([mk('', '', '')]);
      cleanUrl();
      return;
    }

    setRows(parsed.lines.map(p => mk(p.label, p.opcode, p.operand)));
    toast.success(`Loaded ${parsed.lines.length} lines from share link.`);
    cleanUrl();
    // Only run once
  }, []);

  // Re-parse every time rows change
  const program = useMemo(
    () => parse(rows.filter(r => !r.disabled)),
    [rows]
  );

  // rows/program change → Reset VM (to avoid misalignment between old state and new code)
  if (program !== prevProgram) {
    setPrevProgram(program);
    setVmState(null);
    setInputValue('');
    setAutoRun(false);
  }

  const guardSyntax = useCallback(() => {
    const w = checkSyntax(rows);
    const count = Object.keys(w.cells).length;

    // Global warnings (such as missing HALT) are displayed one by one using a toast.
    for (const msg of w.global) {
      toast.error(msg);
    }

    if (count > 0) {
      toast.error(`Cannot run: ${count} line(s) have syntax issues. Hover the highlighted cells for details.`);
      return false;
    }
    if (w.global.length > 0) {
      return false;
    }

    return true;
  }, [rows]);

  // Lazy initialization: The VM is only actually created the first time you click Run/Step.
  const ensureVM = useCallback(
    () => vmState ?? createVM(program),
    [vmState, program]
  );

  const handleStep = useCallback(() => {
    if (!guardSyntax()) return;
    let cur = ensureVM();
    // If it has already halted or encountered an error → recreate the VM from scratch.
    if (cur.halted || cur.error) {
      cur = createVM(program);
    }

    if (cur.waitingForInput) {
      setVmState(cur);
      return;
    }

    setAutoRun(false);
    setVmState(step(cur, program));
  }, [ensureVM, program, guardSyntax]);

  const handleRun = useCallback(() => {
    if (!guardSyntax()) return;
    let cur = ensureVM();
    if (cur.halted || cur.error) {
      cur = createVM(program);
    }
    setAutoRun(true);
    // The run() function will automatically stop when it encounters IN, HALT, or error.
    setVmState(run(cur, program));
  }, [ensureVM, program, guardSyntax]);

  const handleInputConfirm = useCallback(
    (val) => {
      if (!vmState || !vmState.waitingForInput) return;
      const n = parseInt(val, 10);
      let next = provideInput(vmState, isNaN(n) ? 0 : n);

      // If it was blocked by IN in Run mode, it will continue running after injection.
      if (
        autoRun &&
        !next.halted &&
        !next.error &&
        !next.waitingForInput
      ) {
        next = run(next, program);
      }

      setVmState(next);
      setInputValue('');
    },
    [vmState, program, autoRun]
  );

  // ── Derivation: Columns and rows of TraceTable ────────────────────────────────────────────
  const traceColumns = useMemo(
    () => traceToTableColumns(program),
    [program]
  );
  const traceRows = useMemo(
    () => (vmState ? traceToTableRows(vmState.trace, program) : []),
    [vmState, program]
  );

  useEffect(() => {
    const handler = (e) => {
      const text = e.clipboardData?.getData('text') ?? '';
      const parsed = parseAsmText(text);
      if (!parsed) return;                 // Not assembly language → Make the default behavior occur
  
      // Does e.target fall within a specific cell in the editor
      const cellEl = e.target?.closest?.('[data-asm-cell]');
  
      if (parsed.lines.length > 1) {
        // — Multiple lines — Apply globally
        e.preventDefault();
        if (isEditorEmpty(rows)) {
          setRows(parsed.lines.map(p => mk(p.label, p.opcode, p.operand)));
          toast.success(`Pasted ${parsed.lines.length} lines into the editor.`);
        } else {
          toast.error('Editor is not empty. Please clear it before pasting a program.');
        }
      } else if (parsed.lines.length === 1 && cellEl) {
        // — Single Row — Only applies within the cell; the entire row overwrites the current row.
        e.preventDefault();
        const rowId = Number(cellEl.dataset.rowId);
        const p = parsed.lines[0];
        setRows(prev => prev.map(r =>
          r.id === rowId ? { ...r, label: p.label, opcode: p.opcode, operand: p.operand } : r
        ));
      }
      // Single row but not within a cell → Do not move
    };
  
    document.addEventListener('paste', handler, true); // capture
    return () => document.removeEventListener('paste', handler, true);
  }, [rows]);

  // ── Derived from: SimControls props ───────────────────────────────────────────
  const flags    = vmState?.flags ?? { GT: false, LT: false, EQ: false };

  // Dynamically write notations based on VM state to provide clear feedback to users.
  let notation = vmState?.currentNotation ?? '';
  if (vmState?.error) {
    notation = `⚠ ${vmState.error}`;
  } else if (vmState?.waitingForInput) {
    notation = `⌨ waiting for input -> ${vmState.inputTarget}`;
  } else if (vmState?.halted) {
    notation = `■ halted${
      vmState.output.length ? ` · output: [${vmState.output.join(', ')}]` : ''
    }`;
  }

  const currentRowId = vmState?.trace?.length > 0
    ? (program.instructions[vmState.trace[vmState.trace.length - 1].pc]?.rowId ?? null)
    : null;
  
  const latestHighlight = vmState?.trace?.length > 0
    ? vmState.trace[vmState.trace.length - 1].highlight
    : null;

  const isRunning = !!vmState && !vmState.halted && !vmState.error;

  const handleTerminate = useCallback(() => {
    setVmState(null);
    setAutoRun(false);
    setInputValue('');
  }, []);

  // ── A toast is displayed when the VM state changes. ──
  const prevVmRef = useRef(null);
  useEffect(() => {
    if (!vmState) { prevVmRef.current = null; return; }
    const prev = prevVmRef.current;
    prevVmRef.current = vmState;

    // A new error has occurred
    if (vmState.error && vmState.error !== prev?.error) {
      toast.error(vmState.error, { duration: 5000 });
    }
  }, [vmState]);

  return (
    <main className="flex flex-col">
      <div className="p-6 md:p-6 lg:h-dvh lg:min-h-125 lg:overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-[95%] mx-auto h-full">

          {/* Left column — Assembly Editor */}
          <div className="flex flex-col min-h-150 lg:min-h-0">
            <AsmEditor 
              rows={rows}
              onRowsChange={setRows}
              isRunning={isRunning}
              onTerminate={handleTerminate} />
          </div>

          {/* Right column — Trace Table + SimControls */}
          <div className="flex flex-col gap-6 min-h-0">
            <div className="flex-1 min-h-25 overflow-hidden">
              <TraceTable columns={traceColumns} rows={traceRows} highlightCells={latestHighlight?.cells ?? []} />
            </div>
            <div className="flex flex-col shrink-0">
              <SimControls
                inputValue={inputValue}
                onInputChange={setInputValue}
                onInputConfirm={handleInputConfirm}
                flags={flags}
                onRun={handleRun}
                onStep={handleStep}
                notation={notation}
                highlightInput={latestHighlight?.input ?? false}
                highlightFlags={latestHighlight?.flags ?? []}
              />
            </div>
          </div>

          {/* Bottom — CFG Graph */}
          <AssemblyGraph rows={rows} currentRowId={currentRowId} vmFlags={vmState?.flags ?? null}/>
        </div>
      </div>

      <Footer />
      <InstructionSet />
    </main>
  );
}