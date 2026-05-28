"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import TuringTape from '@/features/turing/components/TuringTape';
import RulesEditor, {
  makeEmptyRule,
} from '@/features/turing/components/RulesEditor';
import StatusPanel from '@/features/turing/components/StatusPanel';
import TuringControls from '@/features/turing/components/TuringControls';
import InstructionGuide from '@/features/turing/components/InstructionGuide';

const TAPE_SIZE = 121;
const ORIGIN_INDEX = 60;
const DEFAULT_BLANK = '_';

const makeBlankTape = (blank = DEFAULT_BLANK) =>
  Array.from({ length: TAPE_SIZE }, () => blank);

/**
 * Pure step function. Given a machine snapshot, returns either the next
 * snapshot + the rule that fired, or { halted: true } with a reason.
 */
function tryStep({ tape, pointerPos, state, rules, blank, haltSet }) {
  if (haltSet.has(state)) {
    return { halted: true, reason: 'halt-state' };
  }
  const sym = tape[pointerPos] ?? blank;
  const rule = rules.find(
    (r) =>
      r.currentState &&
      r.nextState &&
      r.write &&
      r.read !== '' &&
      r.currentState === state &&
      r.read === sym
  );
  if (!rule) {
    return { halted: true, reason: 'no-match' };
  }

  const newTape = tape.slice();
  newTape[pointerPos] = rule.write;
  const newPointer =
    rule.move === 'L'
      ? pointerPos - 1
      : rule.move === 'R'
      ? pointerPos + 1
      : pointerPos;

  // Clamp the head to the allocated tape window.
  const clamped = Math.max(0, Math.min(TAPE_SIZE - 1, newPointer));

  return {
    halted: false,
    rule,
    tape: newTape,
    pointerPos: clamped,
    state: rule.nextState,
  };
}

export default function Page() {
  // --- visible state, drives renders -------------------------------------
  const [tape, setTape] = useState(() => makeBlankTape());
  const [pointerPos, setPointerPos] = useState(ORIGIN_INDEX);
  const [machineState, setMachineState] = useState('q0');
  const [rules, setRules] = useState(() => [makeEmptyRule()]);

  const [initialState, setInitialState] = useState('q0');
  const [haltStates, setHaltStates] = useState('qH');
  const [blankSymbol, setBlankSymbol] = useState(DEFAULT_BLANK);
  const [tapeInput, setTapeInput] = useState('');

  const [status, setStatus] = useState('idle'); // idle | running | halted | rejected
  const [steps, setSteps] = useState(0);
  const [speed, setSpeed] = useState(120);
  const [lastRule, setLastRule] = useState(null);
  const [pulseKey, setPulseKey] = useState(0);

  // --- single authoritative snapshot, read by the run-loop ---------------
  // One ref holds the whole machine state so we never have to keep multiple
  // refs in sync. setState() calls below mirror this into React state for
  // rendering, but `machineRef.current` is the source of truth for stepping.
  const machineRef = useRef({
    tape,
    pointerPos,
    state: machineState,
  });

  // Configuration refs — read by tryStep, written when the user edits config.
  const rulesRef = useRef(rules);
  const blankRef = useRef(blankSymbol);
  const haltSetRef = useRef(new Set());
  const statusRef = useRef(status);
  const speedRef = useRef(speed);

  useEffect(() => {
    rulesRef.current = rules;
  }, [rules]);
  useEffect(() => {
    blankRef.current = blankSymbol;
  }, [blankSymbol]);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const haltSet = useMemo(
    () =>
      new Set(
        haltStates
          .split(/[,\s]+/)
          .map((s) => s.trim())
          .filter(Boolean)
      ),
    [haltStates]
  );
  useEffect(() => {
    haltSetRef.current = haltSet;
  }, [haltSet]);

  const isRunning = status === 'running';
  const isHalted = status === 'halted' || status === 'rejected';

  // --- run timer (kept in a ref so cleanup is identity-stable) -----------
  const runTimerRef = useRef(null);
  const stopTimer = useCallback(() => {
    if (runTimerRef.current) {
      clearTimeout(runTimerRef.current);
      runTimerRef.current = null;
    }
  }, []);

  // --- single step ---------------------------------------------------------
  // Reads the current snapshot from machineRef, computes the next one with
  // tryStep, then writes the result back to both machineRef and React state.
  // No setState updater touches a ref — the ref is updated imperatively,
  // exactly once per step, before the matching setState calls.
  const doStep = useCallback(() => {
    const snap = machineRef.current;
    const outcome = tryStep({
      tape: snap.tape,
      pointerPos: snap.pointerPos,
      state: snap.state,
      rules: rulesRef.current,
      blank: blankRef.current,
      haltSet: haltSetRef.current,
    });

    if (outcome.halted) {
      const nextStatus = outcome.reason === 'halt-state' ? 'halted' : 'rejected';
      statusRef.current = nextStatus;
      setStatus(nextStatus);
      return outcome;
    }

    // Update the authoritative snapshot first…
    machineRef.current = {
      tape: outcome.tape,
      pointerPos: outcome.pointerPos,
      state: outcome.state,
    };

    // …then mirror into React state for rendering.
    setTape(outcome.tape);
    setPointerPos(outcome.pointerPos);
    setMachineState(outcome.state);
    setSteps((s) => s + 1);
    setLastRule(outcome.rule);
    setPulseKey((k) => k + 1);

    return outcome;
  }, []);

  // --- auto-run loop -------------------------------------------------------
  // `tickRef.current` is always the latest tick implementation, so the
  // setTimeout callback can't capture a stale version of doStep or speed.
  const tickRef = useRef(null);
  useEffect(() => {
    tickRef.current = () => {
      // Bail if something paused/halted us between schedules.
      if (statusRef.current !== 'running') return;
      const outcome = doStep();
      if (outcome.halted) return;
      runTimerRef.current = setTimeout(
        () => tickRef.current?.(),
        Math.max(0, speedRef.current)
      );
    };
  }, [doStep]);

  const handleRun = useCallback(() => {
    // Use refs to decide — status state may not have flushed yet.
    if (statusRef.current === 'halted' || statusRef.current === 'rejected') {
      return;
    }
    statusRef.current = 'running';
    setStatus('running');
    stopTimer();
    runTimerRef.current = setTimeout(
      () => tickRef.current?.(),
      Math.max(0, speedRef.current)
    );
  }, [stopTimer]);

  const handlePause = useCallback(() => {
    stopTimer();
    statusRef.current = 'idle';
    setStatus('idle');
  }, [stopTimer]);

  const handleStep = useCallback(() => {
    if (
      statusRef.current === 'running' ||
      statusRef.current === 'halted' ||
      statusRef.current === 'rejected'
    ) {
      return;
    }
    doStep();
  }, [doStep]);

  const handleReset = useCallback(() => {
    stopTimer();
    const fresh = makeBlankTape(blankRef.current);
    const startState = initialState || 'q0';

    machineRef.current = {
      tape: fresh,
      pointerPos: ORIGIN_INDEX,
      state: startState,
    };
    statusRef.current = 'idle';

    setTape(fresh);
    setPointerPos(ORIGIN_INDEX);
    setMachineState(startState);
    setStatus('idle');
    setSteps(0);
    setLastRule(null);
  }, [initialState, stopTimer]);

  // Unmount cleanup — stopTimer is stable (useCallback []), so this is safe.
  useEffect(() => stopTimer, [stopTimer]);

  // --- tape editing --------------------------------------------------------
  // Read-then-write against the authoritative ref, then call setTape with
  // the already-computed array. No ref writes inside a state updater.
  const handleCellChange = useCallback(
    (idx, value) => {
      const cur = machineRef.current.tape;
      const next = cur.slice();
      next[idx] = value || blankRef.current;
      machineRef.current = { ...machineRef.current, tape: next };
      setTape(next);
    },
    []
  );

  const handleLoadTape = useCallback(() => {
    const trimmed = tapeInput.replace(/\s/g, '');
    if (!trimmed) return;

    const next = makeBlankTape(blankRef.current);
    for (let i = 0; i < trimmed.length && ORIGIN_INDEX + i < TAPE_SIZE; i++) {
      next[ORIGIN_INDEX + i] = trimmed[i];
    }

    const isLive = statusRef.current === 'running';
    const nextState = isLive ? machineRef.current.state : (initialState || 'q0');

    machineRef.current = {
      tape: next,
      pointerPos: ORIGIN_INDEX,
      state: nextState,
    };

    setTape(next);
    setPointerPos(ORIGIN_INDEX);
    setLastRule(null);
    setSteps(0);

    if (!isLive) {
      setMachineState(nextState);
      statusRef.current = 'idle';
      setStatus('idle');
    }
  }, [tapeInput, initialState]);

  // Keep the displayed state synced with the configured initial state
  // while the machine is idle and untouched.
  useEffect(() => {
    if (status === 'idle' && steps === 0) {
      const s = initialState || 'q0';
      machineRef.current = { ...machineRef.current, state: s };
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMachineState(s);
    }
  }, [initialState, status, steps]);

  const headOffset = pointerPos - ORIGIN_INDEX;

  return (
    <main className="flex flex-col">
      <div className="p-4 md:p-6">
        <div className="max-w-[1600px] mx-auto flex flex-col gap-5">
          {/* Page header */}
          <header className="flex items-end justify-between flex-wrap gap-3 px-1">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[0.7rem] tracking-[0.22em] text-[var(--text-tertiary)] uppercase">
                /turing
              </span>
              <h1 className="font-mono text-xl md:text-2xl text-[var(--text-primary)] tracking-tight">
                Turing Machine Playground
              </h1>
            </div>
            <div className="flex items-center gap-2 font-mono text-[0.7rem] text-[var(--text-tertiary)]">
              <span>
                steps{' '}
                <strong className="text-[var(--text-primary)] font-medium tabular-nums">
                  {steps}
                </strong>
              </span>
              <span className="opacity-40">·</span>
              <span>
                state{' '}
                <strong className="text-[var(--accent-primary)] font-medium">
                  {machineState || 'q0'}
                </strong>
              </span>
              <span className="opacity-40">·</span>
              <span>
                head{' '}
                <strong className="text-[var(--text-primary)] font-medium tabular-nums">
                  {headOffset >= 0 ? '+' : ''}
                  {headOffset}
                </strong>
              </span>
            </div>
          </header>

          {/* Tape — full width */}
          <TuringTape
            tape={tape}
            pointerPos={pointerPos}
            originIndex={ORIGIN_INDEX}
            state={machineState}
            isRunning={isRunning}
            isHighlighted={Boolean(pulseKey)}
            onCellChange={handleCellChange}
          />

          {/* Body: rules editor (wide) + status & controls column */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 min-h-0">
            <div className="lg:col-span-2 min-h-[420px]">
              <RulesEditor
                rules={rules}
                onRulesChange={setRules}
                isRunning={isRunning}
                activeRuleId={lastRule?.id ?? null}
              />
            </div>

            <div className="flex flex-col gap-5 min-w-0">
              <StatusPanel
                state={machineState}
                steps={steps}
                headOffset={headOffset}
                status={status}
                lastRule={lastRule}
              />
              <TuringControls
                isRunning={isRunning}
                isHalted={isHalted}
                initialState={initialState}
                onInitialStateChange={setInitialState}
                haltStates={haltStates}
                onHaltStatesChange={setHaltStates}
                blankSymbol={blankSymbol}
                onBlankSymbolChange={setBlankSymbol}
                speed={speed}
                onSpeedChange={setSpeed}
                tapeInput={tapeInput}
                onTapeInputChange={setTapeInput}
                onLoadTape={handleLoadTape}
                onRun={handleRun}
                onPause={handlePause}
                onStep={handleStep}
                onReset={handleReset}
              />
            </div>
          </div>

          {/* Page footer line — mirrors the asm footer aesthetic */}
          <div className="flex items-center gap-4 px-1 font-mono text-[0.7rem] text-[var(--text-tertiary)]">
            <span>
              rules{' '}
              <strong className="text-[var(--text-primary)] font-medium tabular-nums">
                {rules.length}
              </strong>
            </span>
            <span>
              tape{' '}
              <strong className="text-[var(--text-primary)] font-medium tabular-nums">
                {TAPE_SIZE}
              </strong>
            </span>
            <span>
              blank{' '}
              <strong className="text-[var(--text-primary)] font-medium">
                {blankSymbol}
              </strong>
            </span>
            <span className="ml-auto opacity-80">
              {status === 'halted' && 'machine halted on a halt state'}
              {status === 'rejected' && 'no matching rule · machine rejected'}
            </span>
          </div>
        </div>
      </div>

      <InstructionGuide />
    </main>
  );
}