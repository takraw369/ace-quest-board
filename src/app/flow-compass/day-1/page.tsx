import type { Metadata } from 'next';
import FlowCompassDayOne from '@/components/flow-compass/FlowCompassDayOne';
import { loadCanonicalFlowCompassQuest } from '@/lib/flow-compass-quest-pack';

export const metadata: Metadata = {
  title: 'Day 01 — FLOW COMPASS | ACE',
  description: '中心の位置と変化を5つの操作から観察する、FLOW COMPASS Day 1。',
};

export default function FlowCompassDayOnePage() {
  const quest = loadCanonicalFlowCompassQuest(1);
  return <FlowCompassDayOne quest={quest} />;
}
