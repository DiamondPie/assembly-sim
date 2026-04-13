"use client";

import AsmEditor from './components/AsmEditor';
import TraceTable from './components/TraceTable';
import AssemblyGraph from './components/AssemblyGraph';
import { useState } from 'react';

export default function Page() {
  const [rows, setRows] = useState([]);

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-[95%] mx-auto">

        {/* Left column — Assembly Editor, full height */}
        <div className="flex flex-col h-150 lg:h-[calc(100vh-80px)]">
          <AsmEditor rows={rows} onRowsChange={setRows} />
        </div>

        {/* Right column — stacked: Trace Table top, placeholder bottom */}
        <div className="flex flex-col gap-6">

          {/* Top-right: Trace Table */}
          <div>
            <TraceTable />
          </div>

          {/* Bottom-right: reserved for future component */}
          <div className="flex-1 min-h-48 rounded-xl border border-(--border-color-1) bg-(--content-1) flex items-center justify-center">
            <span className="text-[0.65rem] tracking-widest uppercase text-(--text-tertiary)">
              coming soon
            </span>
          </div>

        </div>
        <AssemblyGraph rows={rows} />
      </div>
    </main>
  );
}