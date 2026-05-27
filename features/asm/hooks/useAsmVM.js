import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useNextStep } from 'nextstepjs';
import { PROGRAM_SIMPLE, PROGRAM_JUMP, getStepAdvance } from '@/constants/Toursteps';
import {
  checkSyntax,
  parseAsmText,
  isEditorEmpty,
  decodeProgram,
  parse,
  createVM,
  step,
  run,
  provideInput,
  traceToTableRows,
  traceToTableColumns,
} from '../AsmVM';

let _rid = 0;
const mk = (label, opcode, operand) => ({
  id: _rid++,
  label,
  opcode,
  operand,
  disabled: false,
});

const initial_row = [mk('', '', '')];

export function useAsmVM() {
  const [rows, setRows] = useState(initial_row);
  const [vmState, setVmState] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [prevProgram, setPrevProgram] = useState(null);
  const [autoRun, setAutoRun] = useState(false);

  const { currentStep, currentTour, setCurrentStep } = useNextStep();
  const tourClicksRef = useRef(0);

  useEffect(() => {
    if (currentTour !== 'mainTour') return;
    const inject = (program) => {
      setRows(program.map(p => mk(p.label, p.opcode, p.operand)));
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

  useEffect(() => { tourClicksRef.current = 0; }, [currentStep, currentTour]);

  const tryTourAdvance = useCallback((buttonType) => {
    if (currentTour !== 'mainTour') return;
    const rule = getStepAdvance(currentStep);
    if (!rule || rule.advanceOn !== buttonType) return;

    tourClicksRef.current += 1;
    if (tourClicksRef.current >= rule.clicksNeeded) {
      setCurrentStep(currentStep + 1, 550);
    }
  }, [currentTour, currentStep, setCurrentStep]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const match = window.location.search.match(/[?&]p=([^&]+)/);
    const encoded = match ? match[1] : null;
    if (!encoded) return;

    const cleanUrl = () => {
      const params = new URLSearchParams(window.location.search);
      params.delete('p');
      const newQuery = params.toString();
      const newUrl = window.location.pathname + (newQuery ? `?${newQuery}` : '');
      window.history.replaceState({}, '', newUrl);
    };

    const text = decodeProgram(encoded);
    if (!text) {
      toast.error('Share link is invalid or corrupted.');
      cleanUrl();
      return;
    }

    const parsed = parseAsmText(text);
    if (!parsed) {
      toast.error('Share link does not contain a valid program.');
      cleanUrl();
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRows(parsed.lines.map(p => mk(p.label, p.opcode, p.operand)));
    toast.success(`Loaded ${parsed.lines.length} lines from share link.`);
    cleanUrl();
  }, []);

  const program = useMemo(() => parse(rows.filter(r => !r.disabled)), [rows]);

  if (program !== prevProgram) {
    setPrevProgram(program);
    setVmState(null);
    setInputValue('');
    setAutoRun(false);
  }

  const guardSyntax = useCallback(() => {
    const w = checkSyntax(rows);
    for (const msg of w.global) toast.error(msg);
    if (Object.keys(w.cells).length > 0 || w.global.length > 0) return false;
    return true;
  }, [rows]);

  const ensureVM = useCallback(() => vmState ?? createVM(program), [vmState, program]);

  const handleStep = useCallback(() => {
    if (!guardSyntax()) return;
    let cur = ensureVM();
    if (cur.halted || cur.error) cur = createVM(program);
    if (cur.waitingForInput) { setVmState(cur); return; }

    setAutoRun(false);
    setVmState(step(cur, program));
    tryTourAdvance('step');
  }, [ensureVM, program, guardSyntax, tryTourAdvance]);

  const handleRun = useCallback(() => {
    if (!guardSyntax()) return;
    let cur = ensureVM();
    if (cur.halted || cur.error) cur = createVM(program);
    setAutoRun(true);
    setVmState(run(cur, program));
    tryTourAdvance('run');
  }, [ensureVM, program, guardSyntax, tryTourAdvance]);

  const handleInputConfirm = useCallback((val) => {
    if (!vmState || !vmState.waitingForInput) return;
    const n = parseInt(val, 10);
    let next = provideInput(vmState, isNaN(n) ? 0 : n);

    if (autoRun && !next.halted && !next.error && !next.waitingForInput) {
      next = run(next, program);
    }
    setVmState(next);
    setInputValue('');
    tryTourAdvance('input');
  }, [vmState, program, autoRun, tryTourAdvance]);

  const handleTerminate = useCallback(() => {
    setVmState(null);
    setAutoRun(false);
    setInputValue('');
    tryTourAdvance('terminate');
  }, [tryTourAdvance]);

  useEffect(() => {
    const handler = (e) => {
      const text = e.clipboardData?.getData('text') ?? '';
      const parsed = parseAsmText(text);
      if (!parsed) return;
      const cellEl = e.target?.closest?.('[data-asm-cell]');

      if (parsed.lines.length > 1) {
        e.preventDefault();
        if (isEditorEmpty(rows)) {
          setRows(parsed.lines.map(p => mk(p.label, p.opcode, p.operand)));
          toast.success(`Pasted ${parsed.lines.length} lines.`);
        } else {
          toast.error('Editor is not empty.');
        }
      } else if (parsed.lines.length === 1 && cellEl) {
        e.preventDefault();
        const rowId = Number(cellEl.dataset.rowId);
        const p = parsed.lines[0];
        setRows(prev => prev.map(r =>
          r.id === rowId ? { ...r, label: p.label, opcode: p.opcode, operand: p.operand } : r
        ));
      }
    };
    document.addEventListener('paste', handler, true);
    return () => document.removeEventListener('paste', handler, true);
  }, [rows]);

  const prevVmRef = useRef(null);
  useEffect(() => {
    if (!vmState) { prevVmRef.current = null; return; }
    if (vmState.error && vmState.error !== prevVmRef.current?.error) {
      toast.error(vmState.error, { duration: 5000 });
    }
    prevVmRef.current = vmState;
  }, [vmState]);

  const traceColumns = useMemo(() => traceToTableColumns(program), [program]);
  const traceRows = useMemo(() => {
    const buildInitialRow = () => {
      const row = { pc: '-', r: '-' };
      for (const [varName, initVal] of program.dataMap) row[varName] = initVal;
      return row;
    };
    if (program.dataMap.size === 0 && program.instructions.length === 0) return [];
    if (!vmState) return [buildInitialRow()];
    return [buildInitialRow(), ...traceToTableRows(vmState.trace, program)];
  }, [vmState, program]);

  const flags = vmState?.flags ?? { GT: false, LT: false, EQ: false };
  let notation = vmState?.currentNotation ?? '';
  if (vmState?.error) notation = `⚠ ${vmState.error}`;
  else if (vmState?.waitingForInput) notation = `⌨ waiting for input -> ${vmState.inputTarget}`;
  else if (vmState?.halted) {
    notation = `■ halted${vmState.output.length ? ` · output: [${vmState.output.join(', ')}]` : ''}`;
  }

  const currentRowId = vmState?.trace?.length > 0
    ? (program.instructions[vmState.trace[vmState.trace.length - 1].pc]?.rowId ?? null)
    : null;
  const latestHighlight = vmState?.trace?.length > 0 ? vmState.trace[vmState.trace.length - 1].highlight : null;
  const isRunning = !!vmState && !vmState.halted && !vmState.error;

  return {
    rows, setRows,
    inputValue, setInputValue,
    notation, flags, isRunning, currentRowId, latestHighlight,
    traceColumns, traceRows,
    handleStep, handleRun, handleInputConfirm, handleTerminate
  };
}