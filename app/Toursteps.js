// app/tourSteps.js
// ---------------------------------------------------------------
// Tour step definitions for the COMPSCI 110 Playground onboarding.
// Selectors target stable `id` attributes (not CSS-module classes,
// which get hashed at build time).
//
// Step indices (0-based) referenced by page.js for program injection:
//   1 → inject PROGRAM_SIMPLE    (after intro)
//   5 → inject PROGRAM_JUMP      (for step-execution demo)
// ---------------------------------------------------------------

export const PROGRAM_SIMPLE = [
  { label: '',   opcode: 'IN',        operand: 'X' },
  { label: '',   opcode: 'INCREMENT', operand: 'X' },
  { label: '',   opcode: 'OUT',       operand: 'X' },
  { label: '',   opcode: 'HALT',      operand: ''  },
  { label: 'X:', opcode: '.DATA',     operand: '0' },
];

export const PROGRAM_JUMP = [
  { label: '',       opcode: 'LOAD',      operand: 'X'     },
  { label: '',       opcode: 'COMPARE',   operand: 'Y'     },
  { label: '',       opcode: 'JUMPEQ',    operand: 'EQUAL' },
  { label: '',       opcode: 'INCREMENT', operand: 'X'     },
  { label: 'EQUAL:', opcode: 'OUT',       operand: 'X'     },
  { label: '',       opcode: 'HALT',      operand: ''      },
  { label: 'X:',     opcode: '.DATA',     operand: '1'     },
  { label: 'Y:',     opcode: '.DATA',     operand: '1'     },
];

// Shared pointer styling — matches existing UI rounding / padding vibe.
const POINTER_DEFAULTS = {
  pointerPadding: 8,
  pointerRadius: 12,
  showControls: true,
  showSkip: true,
};

const tourSteps = [
  {
    tour: 'mainTour',
    steps: [
      // ── 0 ── Intro ─────────────────────────────────────────────
      {
        ...POINTER_DEFAULTS,
        icon: '👋',
        title: 'Welcome to the Playground',
        content: (
          <>
            This is the <b>Assembly Editor</b>. You can write programs by hand
            one row at a time, or paste a whole program from your clipboard —
            just copy an assembly listing and hit <code>⌘/Ctrl + V</code> over
            the editor.
          </>
        ),
        selector: '#tour-asm-editor',
        side: 'right',
      },

      // ── 1 ── Inject simple program ────────────────────────────
      {
        ...POINTER_DEFAULTS,
        icon: '📥',
        title: 'Example program loaded',
        content: (
          <>
            We just loaded a tiny program for you:
            <br />
            <code>IN X → INCREMENT X → OUT X → HALT</code>.
            <br />
            Each row is one instruction. The <b>Addr</b> column is the program
            counter value; click it to disable a line.
          </>
        ),
        selector: '#tour-asm-table',
        side: 'right',
      },

      // ── 2 ── Run ──────────────────────────────────────────────
      {
        ...POINTER_DEFAULTS,
        icon: '▶',
        title: 'Run the program',
        content: (
          <>
            Click <b>Run</b> to execute the program to completion (or until it
            needs input / hits an error). Try it now — then press <b>Next</b>.
          </>
        ),
        selector: '#tour-run-btn',
        side: 'top',
      },

      // ── 3 ── Input ────────────────────────────────────────────
      {
        ...POINTER_DEFAULTS,
        icon: '⌨',
        title: 'Feeding the VM',
        content: (
          <>
            When an <code>IN</code> instruction is reached, the VM pauses here.
            Type a number (e.g. <code>5</code>) and press the checkmark or{' '}
            <b>Enter</b> to supply the value.
          </>
        ),
        selector: '#tour-input-section',
        side: 'top',
      },

      // ── 4 ── Trace Table ──────────────────────────────────────
      {
        ...POINTER_DEFAULTS,
        icon: '📊',
        title: 'Execution trace',
        content: (
          <>
            Every step of the VM is logged here: the program counter, the
            register, and every memory cell. Changed cells are highlighted so
            you can follow the data flow.
          </>
        ),
        selector: '#tour-trace-table',
        side: 'left',
      },

      // ── 5 ── Inject program with branching ────────────────────
      {
        ...POINTER_DEFAULTS,
        icon: '🔀',
        title: 'A program with branching',
        content: (
          <>
            Let&apos;s try something richer — a program that uses{' '}
            <code>COMPARE</code> and <code>JUMPEQ</code> to decide what to do.
            Here X and Y are both 1, so the <code>EQ</code> flag will fire.
          </>
        ),
        selector: '#tour-asm-table',
        side: 'right',
      },

      // ── 6 ── Step (first pair) ────────────────────────────────
      {
        ...POINTER_DEFAULTS,
        icon: '⏭',
        title: 'Step execution',
        content: (
          <>
            Instead of <b>Run</b>, click <b>Step</b> to execute{' '}
            <i>one instruction at a time</i>. Click it <b>twice now</b> — that
            will execute <code>LOAD X</code> and <code>COMPARE Y</code>.
          </>
        ),
        selector: '#tour-step-btn',
        side: 'top',
      },

      // ── 7 ── Flags ────────────────────────────────────────────
      {
        ...POINTER_DEFAULTS,
        icon: '🚩',
        title: 'CPU flags',
        content: (
          <>
            <code>COMPARE Y</code> just set the <b>EQ</b> flag to 1 (because X
            == Y). These flags drive conditional jumps — try comparing other
            values later to see <b>GT</b> and <b>LT</b> light up.
          </>
        ),
        selector: '#tour-flags-section',
        side: 'top',
      },

      // ── 8 ── Step once more ───────────────────────────────────
      {
        ...POINTER_DEFAULTS,
        icon: '⏭',
        title: 'Take the jump',
        content: (
          <>
            Click <b>Step</b> one more time. <code>JUMPEQ EQUAL</code> will
            fire because the EQ flag is set, jumping execution straight to{' '}
            <code>OUT X</code>.
          </>
        ),
        selector: '#tour-step-btn',
        side: 'top',
      },

      // ── 9 ── Assembly Graph ───────────────────────────────────
      {
        ...POINTER_DEFAULTS,
        icon: '🗺',
        title: 'Control flow graph',
        content: (
          <>
            The graph visualises the program as basic blocks connected by
            jumps. The highlighted block shows where execution currently lives
            — watch it move as you step through.
          </>
        ),
        selector: '#tour-assembly-graph',
        side: 'left',
      },

      // ── 10 ── Terminate ───────────────────────────────────────
      {
        ...POINTER_DEFAULTS,
        icon: '⏹',
        title: 'Stop execution',
        content: (
          <>
            While a program is mid-run, this button becomes a <b>Terminate</b>{' '}
            button. Click it to abort the simulation and unlock the editor for
            changes.
          </>
        ),
        selector: '#tour-terminate-btn',
        side: 'right',
      },

      // ── 11 ── Done ────────────────────────────────────────────
      {
        ...POINTER_DEFAULTS,
        icon: '🎉',
        title: "You're all set",
        content: (
          <>
            That&apos;s the whole platform. Write your own programs, paste examples
            from the course notes, or hit the <b>📋 Instruction Set</b> button
            in the corner whenever you need a reference. Happy hacking!
          </>
        ),
        // no selector → card renders centred at top of viewport
        side: 'bottom',
      },
    ],
  },
];

export default tourSteps;