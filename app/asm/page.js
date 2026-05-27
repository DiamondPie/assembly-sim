"use client";

import AsmEditor from '@/features/asm/components/AsmEditor';
import TraceTable from '@/features/asm/components/TraceTable';
import AssemblyGraph from '@/features/asm/components/AssemblyGraph';
import SimControls from '@/features/asm/components/SimControls';
import InstructionSet from '@/features/asm/components/InstructionSet';
import TourStartButton from '@/features/asm/components/Tour/TourStartButton';
import Footer from '@/features/asm/components/Footer';
import { useAsmVM } from '@/features/asm/hooks/useAsmVM';

export default function Page() {
  const {
    rows,
    setRows,
    inputValue,
    setInputValue,
    notation,
    flags,
    isRunning,
    currentRowId,
    latestHighlight,
    traceColumns,
    traceRows,
    handleStep,
    handleRun,
    handleInputConfirm,
    handleTerminate
  } = useAsmVM();

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
          <AssemblyGraph rows={rows} currentRowId={currentRowId} vmFlags={flags}/>
        </div>
      </div>

      <Footer />
      <TourStartButton />
      <InstructionSet />
    </main>
  );
}