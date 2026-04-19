'use client';

import { NextStepProvider, NextStep } from 'nextstepjs';
import TourCard from './TourCard';
import tourSteps from '@/app/Toursteps';

// Client-only wrapper — required because NextStep uses hooks/context,
// but layout.js needs to remain a server component to export `metadata`.
export default function TourProviders({ children }) {
  return (
    <NextStepProvider>
      <NextStep
        steps={tourSteps}
        cardComponent={TourCard}
        shadowRgb="8, 8, 14"
        shadowOpacity="0.65"
        // clickThroughOverlay=false (default) — the "keyhole" around the
        // highlighted element is still clickable, so users CAN actually press
        // Run / Step / the confirm button during the tour.
      >
        {children}
      </NextStep>
    </NextStepProvider>
  );
}