// app/tourSteps.js
// ---------------------------------------------------------------
// Tour step definitions for the COMPSCI 110 Playground onboarding.
// Selectors target stable `id` attributes (not CSS-module classes,
// which get hashed at build time).
//
// Interactive steps (the user drives the tour forward by pressing a
// real UI button, not the tour card's Next) use these extra fields:
//   advanceOn:    'run' | 'step' | 'input' | 'terminate'
//   clicksNeeded: number   // default 1  - only relevant for 'step'
//   advanceHint:  string   // shown in the card instead of the Next btn
//
// Step indices (0-based) referenced by page.js for program injection:
//   1 → inject PROGRAM_SIMPLE
//   5 → inject PROGRAM_JUMP
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

// Shared pointer styling
const POINTER_DEFAULTS = {
  pointerPadding: 8,
  pointerRadius: 12,
  showControls: true,
  showSkip: true,
  blockKeyboardControl: true,
};

// Check if using a mac system, and return the control key symbol
function getControlKey() {
  const isMac = /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform) || 
                /Macintosh/i.test(navigator.userAgent);
  
  return isMac ? '⌘' : 'Ctrl';
}

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
            This is the <b>Assembly Editor</b>. You can write programs from scratch, 
            or paste a whole program from your clipboard -
            just copy an assembly from Coderunner and hit <code>{getControlKey()} + V</code> over
            the editor.<br/>
            The <b>Addr</b> column is the program counter value.
            If you click it, the following line will be disabled (commented).
          </>
        ),
        selector: '#tour-asm-editor',
        side: 'right',
      },

      // ── 1 ── Inject simple program ────────────────────────────
      {
        ...POINTER_DEFAULTS,
        icon: '📥',
        title: 'Hello world',
        content: (
          <>
            We just loaded a tiny program for you.
            <br />
            Each row is one instruction - hopefully you know what it does;
            if not, go and check the instruction set on coursebook :P
          </>
        ),
        selector: '#tour-asm-table',
        side: 'right',
      },

      // ── 2 ── Run (INTERACTIVE) ────────────────────────────────
      {
        ...POINTER_DEFAULTS,
        icon: '▶',
        title: 'Run the program',
        content: (
          <>
            Click <b>Run</b> to execute the program to completion - or, in
            this case, until it stops for input.
          </>
        ),
        selector: '#tour-run-btn',
        side: 'top',
        advanceOn: 'run',
        advanceHint: 'Press Run to continue',
      },

      // ── 3 ── Input (INTERACTIVE) ──────────────────────────────
      {
        ...POINTER_DEFAULTS,
        icon: '⌨',
        title: 'Feeding the VM',
        content: (
          <>
            The VM hit <code>IN X</code> and is now paused. Type a number
            (e.g. <code>5</code>) then press the checkmark or <b>Enter</b> to
            input the value.
          </>
        ),
        selector: '#tour-input-section',
        side: 'top',
        advanceOn: 'input',
        advanceHint: 'Enter a number & confirm to continue',
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

      {
        ...POINTER_DEFAULTS,
        icon: '✨',
        title: 'Explanation & Result',
        content: (
          <>
            Here you can see what each instruction did during the program&apos;s execution, 
            also, of course, the output at the end of the program.
          </>
        ),
        selector: '#tour-notation-display',
        side: 'top',
      },

      // ── 5 ── Inject program with branching ────────────────────
      {
        ...POINTER_DEFAULTS,
        icon: '🔀',
        title: 'Getting upgraded',
        content: (
          <>
            Let&apos;s try something richer - a program that uses{' '}
            <code>COMPARE</code> and <code>JUMPEQ</code> to decide what to do.
            Here X and Y are both 1, so the <code>EQ</code> flag will fire.
          </>
        ),
        selector: '#tour-asm-table',
        side: 'right',
      },

      // ── 6 ── Step ×2 (INTERACTIVE) ────────────────────────────
      {
        ...POINTER_DEFAULTS,
        icon: '⏭',
        title: 'Step execution',
        content: (
          <>
            Instead of <b>Run</b>, click <b>Step</b> to execute{' '}
            <i>one instruction at a time</i>. Click it <b>twice</b> - that
            will execute <code>LOAD X</code> and <code>COMPARE Y</code>.
          </>
        ),
        selector: '#tour-step-btn',
        side: 'top',
        advanceOn: 'step',
        clicksNeeded: 2,
        advanceHint: 'Press Step twice to continue',
      },

      // ── 7 ── Flags ────────────────────────────────────────────
      {
        ...POINTER_DEFAULTS,
        icon: '🚩',
        title: 'CPU flags',
        content: (
          <>
            <code>COMPARE Y</code> just set the <b>EQ</b> flag to 1 (because X
            == Y). These flags drive conditional jumps - try comparing other
            values later to see <b>GT</b> and <b>LT</b> light up.
          </>
        ),
        selector: '#tour-flags-section',
        side: 'top',
      },

      // ── 8 ── Step ×1 (INTERACTIVE) ────────────────────────────
      {
        ...POINTER_DEFAULTS,
        icon: '⏭',
        title: '3, 2, 1, Jump!',
        content: (
          <>
            Click <b>Step</b> one more time. <code>JUMPEQ EQUAL</code> will
            fire because the EQ flag is set.
          </>
        ),
        selector: '#tour-step-btn',
        side: 'top',
        advanceOn: 'step',
        clicksNeeded: 1,
        advanceHint: 'Press Step once to continue',
      },

      // ── 9 ── Assembly Graph ───────────────────────────────────
      {
        ...POINTER_DEFAULTS,
        icon: '🚀',
        title: 'Control flow graph',
        content: (
          <>
            The graph visualises the program as basic blocks. 
            The highlighted instruction shows where execution currently lives.
            Also, the pathway which is <b>going to</b> will be marked
            - watch it move as you step through!
          </>
        ),
        selector: '#tour-assembly-graph',
        side: 'left',
      },

      // ── 10 ── Terminate (INTERACTIVE) ─────────────────────────
      {
        ...POINTER_DEFAULTS,
        icon: '⏹',
        title: 'You revoked a message',
        content: (
          <>
            While a program is mid-run, this button becomes a <b>Terminate</b>{' '}
            button. Click it to abort the simulation and unlock the editor for
            changes.
          </>
        ),
        selector: '#tour-terminate-btn',
        side: 'right',
        advanceOn: 'terminate',
        advanceHint: 'Press Terminate to continue',
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
        side: 'bottom',
      },
    ],
  },
];

// Convenience helper used by page.js for auto-advance logic.
// Returns the interactive descriptor for the given step index, or null.
export function getStepAdvance(stepIndex) {
  const s = tourSteps[0].steps[stepIndex];
  if (!s || !s.advanceOn) return null;
  return {
    advanceOn:    s.advanceOn,
    clicksNeeded: s.clicksNeeded ?? 1,
  };
}

export default tourSteps;