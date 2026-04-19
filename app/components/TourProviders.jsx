'use client';

import { NextStepProvider, NextStep } from 'nextstepjs';
import TourCard from './TourCard';
import tourSteps from '@/app/Toursteps';

// The fly-into-FAB animation is now triggered from inside TourCard
// (see ./tourFlyAway.js), because it needs to fire *before* nextstepjs
// begins its own exit transition on the card.
export default function TourProviders({ children }) {
  return (
    <NextStepProvider>
      <NextStep
        steps={tourSteps}
        cardComponent={TourCard}
        shadowRgb="8, 8, 14"
        shadowOpacity="0.65"
      >
        {children}
      </NextStep>
    </NextStepProvider>
  );
}