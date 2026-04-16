/**
 * assemblyVM.js
 * Virtual machine for the Figure 5.25 instruction set.
 *
 * INSTRUCTION SET:
 *   LOAD X       R ← CON(X)
 *   STORE X      CON(X) ← R
 *   CLEAR X      CON(X) ← 0
 *   ADD X        R ← R + CON(X)
 *   INCREMENT X  CON(X) ← CON(X) + 1
 *   SUBTRACT X   R ← R - CON(X)
 *   DECREMENT X  CON(X) ← CON(X) - 1
 *   COMPARE X    set GT/EQ/LT flags by comparing CON(X) vs R
 *   JUMP X       PC ← address(X)
 *   JUMPGT X     PC ← address(X) if GT=1
 *   JUMPEQ X     PC ← address(X) if EQ=1
 *   JUMPLT X     PC ← address(X) if LT=1
 *   JUMPNEQ X    PC ← address(X) if EQ=0
 *   IN X         read integer into CON(X)
 *   OUT X        output CON(X)
 *   HALT         stop
 *
 * Operand can be:
 *   - A named variable (defined with .DATA or used implicitly)
 *   - A label name (for jump instructions)
 *   - Nothing (HALT)
 *
 * There is exactly ONE register: R.
 * There is NO stack. Memory is just named variables from .DATA declarations.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types (JSDoc)
// ─────────────────────────────────────────────────────────────────────────────
//
// AsmRow      { id, label: string, opcode: string, operand: string }
//
// Instruction { address: number, opcode: string, operand: string, srcLabel: string }
//
// Program     {
//   instructions: Instruction[],
//   labelMap:     Map<string, number>,   // label → instruction address
//   dataMap:      Map<string, number>,   // variable name → initial value
// }
//
// TraceRow    {
//   step:       number,
//   pc:         number,
//   r:          number,
//   memory:     Object<string, number>,  // snapshot
//   flags:      { GT, LT, EQ },
//   notation:   string,
//   opcode:     string,
//   operand:    string,
// }
//
// VMState     {
//   pc:              number,
//   r:               number,
//   memory:          Map<string, number>,
//   flags:           { GT: boolean, LT: boolean, EQ: boolean },
//   halted:          boolean,
//   waitingForInput: boolean,
//   inputTarget:     string | null,
//   output:          number[],
//   error:           string | null,
//   currentNotation: string,
//   trace:           TraceRow[],
// }

const NO_OPERAND_OPS = new Set(['HALT']);
const JUMP_OPS = new Set(['JUMP','JUMPGT','JUMPEQ','JUMPLT','JUMPNEQ']);
const DATA_REF_OPS = new Set([
  'LOAD','STORE','CLEAR','ADD','SUBTRACT','INCREMENT','DECREMENT','COMPARE','IN','OUT'
]);
export const VALID_OPCODES = new Set([
  'LOAD','STORE','CLEAR','ADD','SUBTRACT','INCREMENT','DECREMENT',
  'COMPARE','JUMP','JUMPGT','JUMPEQ','JUMPLT','JUMPNEQ',
  'IN','OUT','HALT','.DATA',
]);

/**
 * 返回 { [rowId]: { label?, opcode?, operand? } }，值为该单元格的警告文字。
 * 只对未禁用且非空的行做检查。
 */
export function checkSyntax(rows) {
  const labels = new Set();
  const dataNames = new Set();

  for (const r of rows) {
    if (r.disabled) continue;
    const label  = r.label.trim().replace(/:$/, '');
    const opcode = r.opcode.trim().toUpperCase();
    if (!label) continue;
    if (opcode === '.DATA') dataNames.add(label);
    else                    labels.add(label);
  }

  // ── 检测重复 label ──
  const labelCount = {};   // labelName → [rowId, rowId, ...]
  for (const r of rows) {
    if (r.disabled) continue;
    const raw = r.label.trim().replace(/:$/, '');
    if (!raw) continue;
    if (!labelCount[raw]) labelCount[raw] = [];
    labelCount[raw].push(r.id);
  }
  const duplicateLabels = new Set();
  for (const [name, ids] of Object.entries(labelCount)) {
    if (ids.length > 1) {
      for (const id of ids) duplicateLabels.add(id);
    }
  }

  const warnings = {};
  for (const r of rows) {
    if (r.disabled) continue;
    const label   = r.label.trim();
    const opcode  = r.opcode.trim().toUpperCase();
    const operand = r.operand.trim();
    if (!label && !opcode && !operand) continue;

    const w = {};

    if (duplicateLabels.has(r.id)) {
      const name = r.label.trim().replace(/:$/, '');
      w.label = `Duplicate label "${name}". Each label must be unique.`;
    }

    // —— opcode 校验 ——
    if (!opcode) {
      w.opcode = 'Missing opcode. Each non-blank line must specify an instruction.';
    } else if (!VALID_OPCODES.has(opcode)) {
      w.opcode = `Unknown opcode "${opcode}". Allowed: LOAD, STORE, CLEAR, ADD, SUBTRACT, INCREMENT, DECREMENT, COMPARE, JUMP, JUMPGT, JUMPEQ, JUMPLT, JUMPNEQ, IN, OUT, HALT, .DATA.`;
    }

    // —— operand 校验 ——
    if (opcode && VALID_OPCODES.has(opcode)) {
      if (NO_OPERAND_OPS.has(opcode)) {
        // HALT 不需要 operand
      } else if (opcode === '.DATA') {
        if (!label) {
          w.label = '.DATA must have a label (the variable name).';
        }
        if (!operand) {
          w.operand = '.DATA requires an integer initial value (e.g. 0).';
        } else if (!/^-?\d+$/.test(operand)) {
          w.operand = `.DATA operand must be a valid integer, got "${operand}".`;
        }
      } else if (!operand) {
        w.operand = `Opcode "${opcode}" requires an operand.`;
      } else if (JUMP_OPS.has(opcode) && !labels.has(operand)) {
        w.operand = `Label "${operand}" is not defined.`;
      } else if (DATA_REF_OPS.has(opcode) && !dataNames.has(operand)) {
        w.operand = `Variable "${operand}" is not declared. Add a ".DATA" row to declare it.`;
      }
    }

    if (Object.keys(w).length) warnings[r.id] = w;
  }
  
  // ── 全局检查 ──
  const globalWarnings = [];
  const hasHalt = rows.some(r =>
    !r.disabled && r.opcode.trim().toUpperCase() === 'HALT'
  );
  if (!hasHalt) {
    globalWarnings.push('Program has no HALT instruction. Execution may not stop properly.');
  }

  return { cells: warnings, global: globalWarnings };
}

// ─────────────────────────────────────────────────────────────────────────────
// parse(rows) → Program
// ─────────────────────────────────────────────────────────────────────────────

export function parse(rows) {
  const labelMap = new Map();   // label string → instruction address
  const dataMap  = new Map();   // variable name → initial value

  // First pass: collect label→address and .DATA variables
  let address = 0;
  for (const row of rows) {
    const label   = row.label?.trim()  ?? '';
    const opcode  = row.opcode?.trim().toUpperCase() ?? '';
    const operand = row.operand?.trim() ?? '';

    if (!opcode && !label && !operand) continue; // completely blank row

    if (opcode === '.DATA') {
      // Variable declaration, not an instruction
      const varName = label.replace(/:$/, '');
      if (varName) {
        const initVal = operand !== '' ? parseInt(operand, 10) : 0;
        dataMap.set(varName, isNaN(initVal) ? 0 : initVal);
      }
      // .DATA rows do NOT increment the address counter
      continue;
    }

    // Register label → address (strip trailing colon)
    if (label) {
      const cleanLabel = label.replace(/:$/, '');
      labelMap.set(cleanLabel, address);
    }

    address++;
  }

  // Second pass: build instruction list (skip .DATA rows)
  const instructions = [];
  let addr = 0;
  for (const row of rows) {
    const label   = row.label?.trim()  ?? '';
    const opcode  = row.opcode?.trim().toUpperCase() ?? '';
    const operand = row.operand?.trim() ?? '';

    if (!opcode && !label && !operand) continue;
    if (opcode === '.DATA') continue;

    instructions.push({
      address:  addr,
      opcode,
      operand,
      srcLabel: label.replace(/:$/, ''),
      rowId: row.id,
    });
    addr++;
  }

  return { instructions, labelMap, dataMap };
}

// ─────────────────────────────────────────────────────────────────────────────
// createVM(program) → VMState
// ─────────────────────────────────────────────────────────────────────────────

export function createVM(program) {
  const memory = new Map(program.dataMap); // clone initial data
  return {
    pc:              0,
    r:               0,
    memory,
    flags:           { GT: false, LT: false, EQ: false },
    halted:          false,
    waitingForInput: false,
    inputTarget:     null,
    output:          [],
    error:           null,
    currentNotation: '',
    trace:           [],
  };
}

export const reset = createVM; // convenience alias

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function cloneState(state) {
  return {
    ...state,
    memory: new Map(state.memory),
    flags:  { ...state.flags },
    output: [...state.output],
    trace:  state.trace,
  };
}

function resolveVar(name, memory) {
  return memory.has(name) ? memory.get(name) : 0;
}

function buildNotation(opcode, operand, r, memory) {
  const v = resolveVar(operand, memory);
  switch (opcode) {
    case 'LOAD':      return `R ← CON(${operand}) [=${v}]`;
    case 'STORE':     return `CON(${operand}) ← R [=${r}]`;
    case 'CLEAR':     return `CON(${operand}) ← 0`;
    case 'ADD':       return `R ← R + CON(${operand}) [=${r}+${v}]`;
    case 'SUBTRACT':  return `R ← R − CON(${operand}) [=${r}−${v}]`;
    case 'INCREMENT': return `CON(${operand}) ← CON(${operand}) + 1 [=${v}+1]`;
    case 'DECREMENT': return `CON(${operand}) ← CON(${operand}) − 1 [=${v}−1]`;
    case 'COMPARE':   return `compare CON(${operand})[=${v}] vs R[=${r}]`;
    case 'JUMP':      return `PC ← ${operand}`;
    case 'JUMPGT':    return `if GT: PC ← ${operand}`;
    case 'JUMPEQ':    return `if EQ: PC ← ${operand}`;
    case 'JUMPLT':    return `if LT: PC ← ${operand}`;
    case 'JUMPNEQ':   return `if ¬EQ: PC ← ${operand}`;
    case 'IN':        return `IN → CON(${operand})`;
    case 'OUT':       return `OUT CON(${operand}) [=${v}]`;
    case 'HALT':      return `HALT`;
    default:          return `${opcode} ${operand}`;
  }
}

function snapshotMemory(memory) {
  const obj = {};
  for (const [k, v] of memory) obj[k] = v;
  return obj;
}

function computeHighlight(opcode, operand, prevState, next) {
  const h = { cells: [], input: false, flags: [] };
  // JUMP 系：pc 不等于 prevPC+1 说明跳转生效
  const jumpTaken = !next.error && next.pc !== prevState.pc + 1;

  switch (opcode) {
    case 'LOAD':
    case 'ADD':
    case 'SUBTRACT':
      h.cells = ['r'];
      break;
    case 'STORE':
    case 'CLEAR':
    case 'INCREMENT':
    case 'DECREMENT':
      h.cells = [operand];
      break;
    case 'COMPARE':
      if (next.flags.GT) h.flags.push('GT');
      if (next.flags.EQ) h.flags.push('EQ');
      if (next.flags.LT) h.flags.push('LT');
      break;
    case 'JUMP':
      // h.cells = ['pc'];
      break;
    case 'JUMPGT':
    case 'JUMPEQ':
    case 'JUMPLT':
    case 'JUMPNEQ':
      if (jumpTaken) h.cells = ['pc'];
      break;
    case 'IN':
      h.input = true;
      break;
    // OUT / HALT → 不高亮
  }
  return h;
}

// ─────────────────────────────────────────────────────────────────────────────
// step(state, program) → VMState
// ─────────────────────────────────────────────────────────────────────────────

export function step(state, program) {
  if (state.halted || state.error) return state;
  if (state.waitingForInput)       return state; // must call provideInput first

  const { instructions, labelMap } = program;

  if (state.pc >= instructions.length) {
    return {
      ...cloneState(state),
      halted: true,
      error:  `PC ${state.pc} out of bounds (program has ${instructions.length} instructions)`,
    };
  }

  const instr   = instructions[state.pc];
  const opcode  = instr.opcode;
  const operand = instr.operand;

  const next     = cloneState(state);
  const notation = buildNotation(opcode, operand, state.r, state.memory);
  next.currentNotation = notation;

  switch (opcode) {
    case 'LOAD': {
      next.r  = resolveVar(operand, next.memory);
      next.pc = state.pc + 1;
      break;
    }
    case 'STORE': {
      next.memory.set(operand, next.r);
      next.pc = state.pc + 1;
      break;
    }
    case 'CLEAR': {
      next.memory.set(operand, 0);
      next.pc = state.pc + 1;
      break;
    }
    case 'ADD': {
      next.r  = state.r + resolveVar(operand, next.memory);
      next.pc = state.pc + 1;
      break;
    }
    case 'SUBTRACT': {
      next.r  = state.r - resolveVar(operand, next.memory);
      next.pc = state.pc + 1;
      break;
    }
    case 'INCREMENT': {
      const cur = resolveVar(operand, next.memory);
      next.memory.set(operand, cur + 1);
      next.pc = state.pc + 1;
      break;
    }
    case 'DECREMENT': {
      const cur = resolveVar(operand, next.memory);
      next.memory.set(operand, cur - 1);
      next.pc = state.pc + 1;
      break;
    }
    case 'COMPARE': {
      const val = resolveVar(operand, next.memory);
      // COMPARE X: compare CON(X) against R
      next.flags = {
        GT: val > state.r,   // CON(X) > R
        EQ: val === state.r, // CON(X) = R
        LT: val < state.r,   // CON(X) < R
      };
      next.pc = state.pc + 1;
      break;
    }
    case 'JUMP': {
      if (!labelMap.has(operand)) {
        next.error = `JUMP target "${operand}" not found`;
        break;
      }
      next.pc = labelMap.get(operand);
      break;
    }
    case 'JUMPGT': {
      if (state.flags.GT) {
        if (!labelMap.has(operand)) { next.error = `JUMPGT target "${operand}" not found`; break; }
        next.pc = labelMap.get(operand);
      } else {
        next.pc = state.pc + 1;
      }
      break;
    }
    case 'JUMPEQ': {
      if (state.flags.EQ) {
        if (!labelMap.has(operand)) { next.error = `JUMPEQ target "${operand}" not found`; break; }
        next.pc = labelMap.get(operand);
      } else {
        next.pc = state.pc + 1;
      }
      break;
    }
    case 'JUMPLT': {
      if (state.flags.LT) {
        if (!labelMap.has(operand)) { next.error = `JUMPLT target "${operand}" not found`; break; }
        next.pc = labelMap.get(operand);
      } else {
        next.pc = state.pc + 1;
      }
      break;
    }
    case 'JUMPNEQ': {
      if (!state.flags.EQ) {
        if (!labelMap.has(operand)) { next.error = `JUMPNEQ target "${operand}" not found`; break; }
        next.pc = labelMap.get(operand);
      } else {
        next.pc = state.pc + 1;
      }
      break;
    }
    case 'IN': {
      // Pause execution; caller must call provideInput(state, value)
      next.waitingForInput = true;
      next.inputTarget     = operand;
      // PC stays at the IN instruction until input is provided
      break;
    }
    case 'OUT': {
      const val = resolveVar(operand, next.memory);
      next.output.push(val);
      next.pc = state.pc + 1;
      break;
    }
    case 'HALT': {
      next.halted = true;
      next.pc     = state.pc;
      break;
    }
    default: {
      next.error = `Unknown opcode: "${opcode}"`;
      next.pc    = state.pc + 1;
    }
  }

  const highlight = computeHighlight(opcode, operand, state, next);

  // Append trace row
  next.trace.push({
    step:    state.trace.length,
    pc:      state.pc,
    r:       next.r,
    memory:  snapshotMemory(next.memory),
    flags:   { ...next.flags },
    notation,
    opcode,
    operand,
    highlight,
  });

  return next;
}

// ─────────────────────────────────────────────────────────────────────────────
// provideInput(state, value) → VMState
// ─────────────────────────────────────────────────────────────────────────────

export function provideInput(state, value) {
  if (!state.waitingForInput || !state.inputTarget) return state;

  const next = cloneState(state);
  const num  = typeof value === 'number' ? value : parseInt(value, 10);

  next.memory.set(state.inputTarget, isNaN(num) ? 0 : num);
  next.waitingForInput = false;
  next.inputTarget     = null;
  next.pc              = state.pc + 1; // advance past IN
  next.currentNotation = `IN → CON(${state.inputTarget}) = ${isNaN(num) ? 0 : num}`;

  const updatedTrace = [...state.trace];
  updatedTrace[updatedTrace.length - 1] = {
    ...updatedTrace[updatedTrace.length - 1],
    memory:   snapshotMemory(next.memory),
    notation: next.currentNotation,
    highlight: { cells: [state.inputTarget], input: false, flags: [] },
  };
  next.trace = updatedTrace;

  return next;
}

// ─────────────────────────────────────────────────────────────────────────────
// run(state, program, maxSteps?) → VMState
// ─────────────────────────────────────────────────────────────────────────────

export function run(state, program, maxSteps = 1000) {
  let current = state;
  let steps = 0;

  while (!current.halted && !current.error && !current.waitingForInput) {
    current = step(current, program);
    steps++;
    if (steps >= maxSteps) {
      current = {
        ...cloneState(current),
        error:  `Max step (${maxSteps}) is exceeded.\nThe HALT may be unreachable.`,
        halted: true,
      };
      break;
    }
  }

  return current;
}

// ─────────────────────────────────────────────────────────────────────────────
// traceToTableRows(trace, program) → rows for TraceTable
// ─────────────────────────────────────────────────────────────────────────────
// Converts VM trace into the shape TraceTable expects.
// Columns: PC, R, then one column per .DATA variable.

export function traceToTableRows(trace, program) {
  const varNames = [...program.dataMap.keys()];
  return trace.map(row => {
    const out = { pc: row.pc, r: row.r };
    for (const v of varNames) {
      out[v] = row.memory[v] ?? '—';
    }
    return out;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// traceToTableColumns(program) → columns for TraceTable
// ─────────────────────────────────────────────────────────────────────────────

export function traceToTableColumns(program) {
  const varNames = [...program.dataMap.keys()];
  return [
    { key: 'pc', label: 'PC' },
    { key: 'r',  label: 'R'  },
    ...varNames.map(v => ({ key: v, label: v })),
  ];
}

/** 把一行文本解析成 { label, opcode, operand }，不能解析返回 null */
export function parseAsmLine(line) {
  const trimmed = line.replace(/\t/g, ' ').trim();
  if (!trimmed) return null;
  // 去掉行尾注释（如果你的汇编支持 ; 注释，可在这里处理；目前先不处理）

  const tokens = trimmed.split(/\s+/);
  let label = '', opcode = '', operand = '';
  let i = 0;

  // 第一个 token 含 ":" → 视为 label
  if (tokens[0].endsWith(':')) {
    label = tokens[0];
    i++;
  } else if (tokens[0].includes(':')) {
    // 形如 "START:LOAD" 的紧贴写法
    const idx = tokens[0].indexOf(':');
    label = tokens[0].slice(0, idx + 1);
    const rest = tokens[0].slice(idx + 1);
    if (rest) tokens[0] = rest; else { tokens.shift(); }
  }

  if (i < tokens.length) opcode = tokens[i++].toUpperCase();
  if (i < tokens.length) operand = tokens.slice(i).join(' ');

  return { label, opcode, operand };
}

/** 解析整段文本；只有当至少 1 行能解析、且每个解析出的 opcode 都在白名单内才返回结果 */
export function parseAsmText(text) {
  if (!text || typeof text !== 'string') return null;
  const rawLines = text.split(/\r?\n/);
  const parsed = [];
  for (const ln of rawLines) {
    const trimmed = ln.trim();
    if (!trimmed) continue;
    if (/^\.(BEGIN|END)\s*$/i.test(trimmed)) continue; 

    const p = parseAsmLine(ln);
    if (!p) return null;
    if (!VALID_OPCODES.has(p.opcode)) return null;  // 严格：未知 opcode → 整体不算汇编
    parsed.push(p);
  }
  if (parsed.length === 0) return null;
  return { lines: parsed };
}

/** 编辑器是否为空 */
export function isEditorEmpty(rows) {
  if (!rows || rows.length === 0) return true;
  return rows.every(r =>
    !(r.label?.trim()) && !(r.opcode?.trim()) && !(r.operand?.trim())
  );
}