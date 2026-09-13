'use client';

import { useEffect } from 'react';
import { captureConnectedEntranceState } from '@/lib/entranceMeasurement';
import { loadOnboardingProfile } from '@/lib/onboarding';
import { loadBootstrap } from '@/lib/pwa';

export default function EntranceMeasurementBridge() {
  useEffect(() => {
    captureConnectedEntranceState(loadOnboardingProfile(), loadBootstrap());
  }, []);

  return null;
}
