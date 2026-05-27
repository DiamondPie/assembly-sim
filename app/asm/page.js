"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import AsmEditor from '@/features/asm/components/AsmEditor';
import TraceTable from '@/features/asm/components/TraceTable';
import AssemblyGraph from '@/features/asm/components/AssemblyGraph';
import SimControls from '@/features/asm/components/SimControls';
import InstructionSet from '@/features/asm/components/InstructionSet';
import { checkSyntax, parseAsmText, isEditorEmpty, decodeProgram } from '@/features/asm/AsmVM';
import { useNextStep } from 'nextstepjs';
import TourStartButton from '@/features/asm/components/Tour/TourStartButton';
import { PROGRAM_SIMPLE, PROGRAM_JUMP, getStepAdvance } from '@/constants/Toursteps';

import {
  parse,
  createVM,
  step,
  run,
  provideInput,
  traceToTableRows,
  traceToTableColumns,
} from '@/features/asm/AsmVM';
import Footer from '@/features/asm/components/Footer';

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

  // ── Tour integration ─────────────────────────────────────────────────
  const { currentStep, currentTour, setCurrentStep } = useNextStep();

  // When the tour reaches a "program injection" step, swap the editor
  // contents. Keeping this effect in page.js (instead of in tourSteps.js)
  // means the step definitions stay pure data and portable.
  useEffect(() => {
    if (currentTour !== 'mainTour') return;

    const inject = (program) => {
      setRows(program.map(p => mk(p.label, p.opcode, p.operand)));
      // Reset VM so the new code runs from a clean slate
      setVmState(null);
      setInputValue('');
      setAutoRun(false);
    };

    if (currentStep === 1) {
      inject(PROGRAM_SIMPLE);
      toast.success('Loaded tour example: IN/INCREMENT/OUT', { duration: 2000 });
    } else if (currentStep === 6) {
      inject(PROGRAM_JUMP);
      toast.success('Loaded tour example: branching program', { duration: 2000 });
    }
  }, [currentStep, currentTour]);

  // ── Tour auto-advance ──────────────────────────────────────────────
  // Tracks how many times the "advanceOn" button has been pressed
  // within the current step. Reset whenever the step changes.
  const tourClicksRef = useRef(0);
  useEffect(() => { tourClicksRef.current = 0; }, [currentStep, currentTour]);

  /**
   * Called from handleRun / handleStep / handleInputConfirm / handleTerminate
   * when their respective button is pressed. If the current tour step declared
   * itself to be driven by that button, we bump the click counter and — once
   * `clicksNeeded` is satisfied — advance to the next tour step after a small
   * visual delay (feels natural, lets the user see the state change).
   */
  const tryTourAdvance = useCallback((buttonType) => {
    if (currentTour !== 'mainTour') return;
    const rule = getStepAdvance(currentStep);
    if (!rule || rule.advanceOn !== buttonType) return;

    tourClicksRef.current += 1;
    if (tourClicksRef.current >= rule.clicksNeeded) {
      // nextstepjs built-in: setCurrentStep(index, delayMs)
      setCurrentStep(currentStep + 1, 550);
    }
  }, [currentTour, currentStep, setCurrentStep]);

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
    tryTourAdvance('step');
  }, [ensureVM, program, guardSyntax, tryTourAdvance]);

  const handleRun = useCallback(() => {
    if (!guardSyntax()) return;
    let cur = ensureVM();
    if (cur.halted || cur.error) {
      cur = createVM(program);
    }
    setAutoRun(true);
    // The run() function will automatically stop when it encounters IN, HALT, or error.
    setVmState(run(cur, program));
    tryTourAdvance('run');
  }, [ensureVM, program, guardSyntax, tryTourAdvance]);

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
      tryTourAdvance('input');
    },
    [vmState, program, autoRun, tryTourAdvance]
  );

  // ── Derivation: Columns and rows of TraceTable ────────────────────────────────────────────
  const traceColumns = useMemo(
    () => traceToTableColumns(program),
    [program]
  );
  const traceRows = useMemo(() => {
    const buildInitialRow = () => {
      const row = { pc: '-', r: '-' };
      for (const [varName, initVal] of program.dataMap) {
        row[varName] = initVal;
      }
      return row;
    };
  
    if (program.dataMap.size === 0 && program.instructions.length === 0) {
      return [];
    }
  
    if (!vmState) {
      return [buildInitialRow()];
    }
  
    return [buildInitialRow(), ...traceToTableRows(vmState.trace, program)];
  }, [vmState, program]);

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
    tryTourAdvance('terminate');
  }, [tryTourAdvance]);

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
          <div id="tour-asm-editor" className="flex flex-col min-h-150 lg:min-h-0">
            <AsmEditor 
              rows={rows}
              onRowsChange={setRows}
              isRunning={isRunning}
              onTerminate={handleTerminate} />
          </div>

          {/* Right column — Trace Table + SimControls */}
          <div className="flex flex-col gap-6 min-h-0">
            <div id="tour-trace-table" className="flex-1 min-h-25 overflow-hidden">
              <TraceTable columns={traceColumns} rows={traceRows} highlightCells={latestHighlight?.cells ?? []} height='100%' />
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
      <TourStartButton />
      <InstructionSet />
    </main>
  );
}