"use client";

import { useState, useMemo, useCallback } from 'react';
import AsmEditor from './components/AsmEditor';
import TraceTable from './components/TraceTable';
import AssemblyGraph from './components/AssemblyGraph';
import SimControls from './components/SimControls';

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
  const program = useMemo(() => parse(rows), [rows]);

  // rows/program 变化 → 重置 VM（避免旧状态与新代码错位）
  if (program !== prevProgram) {
    setPrevProgram(program);
    setVmState(null);
    setInputValue('');
    setAutoRun(false);
  }

  // 懒初始化：第一次点 Run/Step 时才真正 createVM
  const ensureVM = useCallback(
    () => vmState ?? createVM(program),
    [vmState, program]
  );

  const handleStep = useCallback(() => {
    const cur = ensureVM();
    if (cur.halted || cur.error || cur.waitingForInput) {
      setVmState(cur); // 把潜在的初始化写回
      return;
    }
    setAutoRun(false);
    setVmState(step(cur, program));
  }, [ensureVM, program]);

  const handleRun = useCallback(() => {
    const cur = ensureVM();
    if (cur.halted || cur.error) {
      setVmState(cur);
      return;
    }
    setAutoRun(true);
    // run() 会在遇到 IN / HALT / error 时自动停
    setVmState(run(cur, program));
  }, [ensureVM, program]);

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
    
  return (
    <main className="min-h-screen p-6 md:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-[95%] mx-auto">

        {/* Left column — Assembly Editor, full height */}
        <div className="flex flex-col h-150 lg:h-full">
          <AsmEditor rows={rows} onRowsChange={setRows} />
        </div>

        {/* Right column — Trace Table + SimControls */}
        <div className="flex flex-col gap-6">
          <div>
            <TraceTable columns={traceColumns} rows={traceRows} />
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
            />
          </div>
        </div>

        {/* Bottom — CFG Graph */}
        <AssemblyGraph rows={rows} currentRowId={currentRowId} vmFlags={vmState?.flags ?? null}/>
      </div>
    </main>
  );
}