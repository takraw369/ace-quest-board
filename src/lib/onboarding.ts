import { captureConnectedEntranceState, queueEntranceMilestone } from '@/lib/entranceMeasurement';

export const ONBOARDING_STORAGE_KEY = 'flow:ace:onboarding:v1';

export const AGE_BANDS = [
  '0〜18か月',
  '18〜36か月',
  '3〜6歳',
  '6〜9歳',
  '9〜12歳',
  '12〜15歳',
  '15〜18歳',
  '18〜25歳前後',
  '成人期',
  '転換・再起期',
] as const;

export const TIME_OPTIONS = [3, 5, 10, 15, 30] as const;

export type AttentionLevel = 'light' | 'focused';

export type AceOnboardingProfile = {
  version: 1;
  ageBand: string;
  direction: string;
  timeBudgetMinutes: number;
  attentionLevel: AttentionLevel;
  dataUseAccepted: boolean;
  updatedAt: string;
  completedAt?: string | null;
};

export const DEFAULT_ONBOARDING_PROFILE: AceOnboardingProfile = {
  version: 1,
  ageBand: '',
  direction: '',
  timeBudgetMinutes: 10,
  attentionLevel: 'light',
  dataUseAccepted: false,
  updatedAt: '',
  completedAt: null,
};

export function loadOnboardingProfile(): AceOnboardingProfile {
  if (typeof window === 'undefined') return DEFAULT_ONBOARDING_PROFILE;
  try {
    const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) return DEFAULT_ONBOARDING_PROFILE;
    const parsed = JSON.parse(raw) as Partial<AceOnboardingProfile>;
    return {
      ...DEFAULT_ONBOARDING_PROFILE,
      ...parsed,
      version: 1,
      timeBudgetMinutes: TIME_OPTIONS.includes(parsed.timeBudgetMinutes as (typeof TIME_OPTIONS)[number])
        ? Number(parsed.timeBudgetMinutes)
        : 10,
      attentionLevel: parsed.attentionLevel === 'focused' ? 'focused' : 'light',
    };
  } catch {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    return DEFAULT_ONBOARDING_PROFILE;
  }
}

export function saveOnboardingProfile(profile: AceOnboardingProfile) {
  if (typeof window === 'undefined') return;

  const previous = loadOnboardingProfile();
  const next: AceOnboardingProfile = {
    ...profile,
    version: 1,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(next));

  if (next.dataUseAccepted && next.ageBand && !previous.updatedAt) {
    queueEntranceMilestone('character_saved');
  }

  if (next.dataUseAccepted && next.completedAt && !previous.completedAt) {
    queueEntranceMilestone('first_quest_selected');
  }

  captureConnectedEntranceState(next);
}
