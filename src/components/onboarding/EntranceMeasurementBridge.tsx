'use client';

import { useEffect } from 'react';
import { queueEntranceMilestone, flushEntranceMilestones } from '@/lib/entranceMeasurement';
import { loadOnboardingProfile } from '@/lib/onboarding';
import { loadBootstrap, sessionIsUsable } from '@/lib/pwa';

export default function EntranceMeasurementBridge() {
  useEffect(() => {
    const profile = loadOnboardingProfile();
    if (!profile.dataUseAccepted || !profile.ageBand || !profile.updatedAt) return;

    const bootstrap = loadBootstrap();
    if (!sessionIsUsable(bootstrap)) return;

    queueEntranceMilestone('connected', {
      age_band: profile.ageBand,
      time_budget_minutes: profile.timeBudgetMinutes,
      attention_level: profile.attentionLevel,
    });

    if (bootstrap?.ace?.scores && bootstrap?.ace?.result_axis) {
      const calibratedAt = bootstrap.ace.completed_at ?? bootstrap.ace.assessed_at ?? null;
      queueEntranceMilestone('calibrated', {
        age_band: profile.ageBand,
        calibration_axis: bootstrap.ace.result_axis,
        calibration_at: calibratedAt,
        preexisting: Boolean(calibratedAt && calibratedAt < profile.updatedAt),
      });
    }

    void flushEntranceMilestones(bootstrap);
  }, []);

  return null;
}
