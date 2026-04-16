"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import AsmEditor from './components/AsmEditor';
import TraceTable from './components/TraceTable';
import AssemblyGraph from './components/AssemblyGraph';
import SimControls from './components/SimControls';
import { checkSyntax, parseAsmText, isEditorEmpty } from './AsmVM';

import {
  parse,
  createVM,
  step,
  run,
  provideInput,
  traceToTableRows,
  traceToTableColumns,
} from './AsmVM';

// ── 初始示例程序（与 AsmEditor 内部 EXAMPLE_ROWS 一致）────────────────────
let _rid = 0;
const mk = (label, opcode, operand) => ({
  id: _rid++,
  label,
  opcode,
  operand,
  disabled: false,
});

const INITIAL_ROWS = [
  mk('',        'IN',        'N'),
  mk('START:',  'LOAD',      'TERM'),
  mk('',        'COMPARE',   'N'),
  mk('',        'JUMPLT',    'FINISH'),
  mk('',        'ADD',       'SUM'),
  mk('',        'STORE',     'SUM'),
  mk('',        'INCREMENT', 'TERM'),
  mk('',        'JUMP',      'START'),
  mk('FINISH:', 'OUT',       'SUM'),
  mk('',        'HALT',      ''),
  mk('N:',      '.DATA',     '0'),
  mk('TERM:',   '.DATA',     '1'),
  mk('SUM:',    '.DATA',     '0'),
];

export default function Page() {
  const [rows, setRows]           = useState(INITIAL_ROWS);
  const [vmState, setVmState]     = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [prevProgram, setPrevProgram] = useState(null);
  const [autoRun, setAutoRun] = useState(false);

  // 每次 rows 变化都重新解析
  const program = useMemo(
    () => parse(rows.filter(r => !r.disabled)),
    [rows]
  );

  // rows/program 变化 → 重置 VM（避免旧状态与新代码错位）
  if (program !== prevProgram) {
    setPrevProgram(program);
    setVmState(null);
    setInputValue('');
    setAutoRun(false);
  }

  const guardSyntax = useCallback(() => {
    const w = checkSyntax(rows);
    const count = Object.keys(w.cells).length;

    // 全局警告（如缺 HALT）用 toast 逐条提示
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

  // 懒初始化：第一次点 Run/Step 时才真正 createVM
  const ensureVM = useCallback(
    () => vmState ?? createVM(program),
    [vmState, program]
  );

  const handleStep = useCallback(() => {
    if (!guardSyntax()) return;
    let cur = ensureVM();
    // 如果已经 halted 或 error → 重新创建 VM 从头开始
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
    const cur = ensureVM();
    if (cur.halted || cur.error) {
      setVmState(cur);
      return;
    }
    setAutoRun(true);
    // run() 会在遇到 IN / HALT / error 时自动停
    setVmState(run(cur, program));
  }, [ensureVM, program, guardSyntax]);

  const handleInputConfirm = useCallback(
    (val) => {
      if (!vmState || !vmState.waitingForInput) return;
      const n = parseInt(val, 10);
      let next = provideInput(vmState, isNaN(n) ? 0 : n);

      // 如果是 Run 模式下被 IN 阻断的，注入后继续跑
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

  // ── 派生：TraceTable 的列和行 ────────────────────────────────────────────
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
      if (!parsed) return;                 // 不是汇编 → 让默认行为发生
  
      // e.target 是否落在编辑器某个单元格里
      const cellEl = e.target?.closest?.('[data-asm-cell]');
  
      if (parsed.lines.length > 1) {
        // —— 多行 —— 全局生效
        e.preventDefault();
        if (isEditorEmpty(rows)) {
          setRows(parsed.lines.map(p => mk(p.label, p.opcode, p.operand)));
          toast.success(`Pasted ${parsed.lines.length} lines into the editor.`);
        } else {
          toast.error('Editor is not empty. Please clear it before pasting a program.');
        }
      } else if (parsed.lines.length === 1 && cellEl) {
        // —— 单行 —— 只在单元格内生效，整行覆盖当前行
        e.preventDefault();
        const rowId = Number(cellEl.dataset.rowId);
        const p = parsed.lines[0];
        setRows(prev => prev.map(r =>
          r.id === rowId ? { ...r, label: p.label, opcode: p.opcode, operand: p.operand } : r
        ));
      }
      // 单行但不在单元格内 → 不动
    };
  
    document.addEventListener('paste', handler, true); // capture
    return () => document.removeEventListener('paste', handler, true);
  }, [rows]);

  // ── 派生：SimControls 的 props ───────────────────────────────────────────
  const flags    = vmState?.flags ?? { GT: false, LT: false, EQ: false };

  // 根据 VM 状态动态写 notation，给用户清晰反馈
  let notation = vmState?.currentNotation ?? '';
  if (vmState?.error) {
    notation = `⚠ ${vmState.error}`;
  } else if (vmState?.waitingForInput) {
    notation = `⌨ waiting for input → ${vmState.inputTarget}`;
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

  // ── VM 状态变化时弹 toast ──
  const prevVmRef = useRef(null);
  useEffect(() => {
    if (!vmState) { prevVmRef.current = null; return; }
    const prev = prevVmRef.current;
    prevVmRef.current = vmState;

    // 出现新错误
    if (vmState.error && vmState.error !== prev?.error) {
      toast.error(vmState.error, { duration: 5000 });
    }
  }, [vmState]);

  return (
    <main className="min-h-screen p-6 md:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-[95%] mx-auto">

        {/* Left column — Assembly Editor, full height */}
        <div className="flex flex-col h-150 lg:h-full">
          <AsmEditor 
            rows={rows}
            onRowsChange={setRows}
            isRunning={isRunning}
            onTerminate={handleTerminate} />
        </div>

        {/* Right column — Trace Table + SimControls */}
        <div className="flex flex-col gap-6">
          <div>
            <TraceTable columns={traceColumns} rows={traceRows} highlightCells={latestHighlight?.cells ?? []}/>
          </div>
          <div className="flex flex-col h-full">
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
    </main>
  );
}