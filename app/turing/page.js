"use client";

import { useCallback, useEffect, useRef, useState } from 'react';

import TuringTape from '@/features/turing/components/TuringTape';
import RulesEditor, {
  makeEmptyRule,
} from '@/features/turing/components/RulesEditor';
import StatusPanel from '@/features/turing/components/StatusPanel';
import TuringControls from '@/features/turing/components/TuringControls';
import InstructionGuide from '@/features/turing/components/InstructionGuide';

const TAPE_SIZE = 121;
const ORIGIN_INDEX = 60;

// Model constants. In this machine there are no configurable halt states,
// no configurable blank, and the machine always begins in state "1".
const BLANK = 'b';
const INITIAL_STATE = '1';

const makeBlankTape = () => Array.from({ length: TAPE_SIZE }, () => BLANK);

/**
 * Pure step function. A rule fires when its current-state and read symbol
 * match the machine. There are no halt states in this model — the machine
 * halts iff no rule applies. Rule tuple: (state, read, write, next, move),
 * with move restricted to 'L' or 'R'.
 */
function tryStep({ tape, pointerPos, state, rules }) {
  const sym = tape[pointerPos] ?? BLANK;

  // First matching, fully-defined rule wins (rules should be unambiguous).
  const rule = rules.find(
    (r) =>
      r.currentState !== '' &&
      r.nextState !== '' &&
      r.write !== '' &&
      r.read !== '' &&
      r.currentState === state &&
      r.read === sym
  );

  if (!rule) {
    return { halted: true };
  }

  const newTape = tape.slice();
  newTape[pointerPos] = rule.write;
  const newPointer = rule.move === 'L' ? pointerPos - 1 : pointerPos + 1;

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
  const [machineState, setMachineState] = useState(INITIAL_STATE);
  const [rules, setRules] = useState(() => [makeEmptyRule()]);

  const [status, setStatus] = useState('idle'); // idle | running | halted
  const [steps, setSteps] = useState(0);
  const [speed, setSpeed] = useState(120);
  const [lastRule, setLastRule] = useState(null);
  const [pulseKey, setPulseKey] = useState(0);

  // --- single authoritative snapshot, read by the run-loop ---------------
  const machineRef = useRef({ tape, pointerPos, state: machineState });

  // Configuration refs read by the loop / written when the user edits.
  const rulesRef = useRef(rules);
  const statusRef = useRef(status);
  const speedRef = useRef(speed);

  useEffect(() => {
    rulesRef.current = rules;
  }, [rules]);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const isRunning = status === 'running';
  const isHalted = status === 'halted';

  // --- run timer (kept in a ref so cleanup is identity-stable) -----------
  const runTimerRef = useRef(null);
  const stopTimer = useCallback(() => {
    if (runTimerRef.current) {
      clearTimeout(runTimerRef.current);
      runTimerRef.current = null;
    }
  }, []);

  // --- single step ---------------------------------------------------------
  const doStep = useCallback(() => {
    const snap = machineRef.current;
    const outcome = tryStep({
      tape: snap.tape,
      pointerPos: snap.pointerPos,
      state: snap.state,
      rules: rulesRef.current,
    });

    if (outcome.halted) {
      statusRef.current = 'halted';
      setStatus('halted');
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
  const tickRef = useRef(null);
  useEffect(() => {
    tickRef.current = () => {
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
    if (statusRef.current === 'halted') return;
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
    if (statusRef.current === 'running' || statusRef.current === 'halted') {
      return;
    }
    doStep();
  }, [doStep]);

  const handleReset = useCallback(() => {
    stopTimer();
    const fresh = makeBlankTape();

    machineRef.current = {
      tape: fresh,
      pointerPos: ORIGIN_INDEX,
      state: INITIAL_STATE,
    };
    statusRef.current = 'idle';

    setTape(fresh);
    setPointerPos(ORIGIN_INDEX);
    setMachineState(INITIAL_STATE);
    setStatus('idle');
    setSteps(0);
    setLastRule(null);
  }, [stopTimer]);

  // Unmount cleanup — stopTimer is stable (useCallback []), so this is safe.
  useEffect(() => stopTimer, [stopTimer]);

  // --- tape editing --------------------------------------------------------
  const handleCellChange = useCallback((idx, value) => {
    const cur = machineRef.current.tape;
    const next = cur.slice();
    next[idx] = value || BLANK;
    machineRef.current = { ...machineRef.current, tape: next };
    setTape(next);
  }, []);

  const headOffset = pointerPos - ORIGIN_INDEX;

  return (
    <main className="flex flex-col">
      <div className="p-4 md:p-6">
        <div className="max-w-[1600px] mx-auto flex flex-col gap-5">
          {/* Page header — just the section label */}
          <header className="px-1">
            <span className="font-mono text-[0.72rem] tracking-[0.24em] text-[var(--text-tertiary)] uppercase">
              TURING MACHINE
            </span>
          </header>

          {/* Tape — full width */}
          <TuringTape
            tape={tape}
            pointerPos={pointerPos}
            originIndex={ORIGIN_INDEX}
            state={machineState}
            blank={BLANK}
            isRunning={isRunning}
            isHighlighted={Boolean(pulseKey)}
            onCellChange={handleCellChange}
          />

          {/* Body: rules editor (wide) + status & controls column */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 min-h-0">
            <div className="lg:col-span-2 min-w-0 min-h-[420px]">
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
                speed={speed}
                onSpeedChange={setSpeed}
                onRun={handleRun}
                onPause={handlePause}
                onStep={handleStep}
                onReset={handleReset}
              />
            </div>
          </div>
        </div>
      </div>

      <InstructionGuide />
    </main>
  );
}