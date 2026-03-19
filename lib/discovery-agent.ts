import { DiscoveryRun, RewardPolicy, Skill, SkillSignal, SkillSpotlight } from '@/lib/types';
import { nowIso, randomId } from '@/lib/utils';

function summarizeSignals(signals: SkillSignal[]) {
  return signals
    .slice(0, 3)
    .map((signal) => `${signal.sourceName}: ${signal.summary}`)
    .join(' ');
}

export function generateSpotlightCandidate(params: {
  policy: RewardPolicy;
  skill: Skill;
  existingSpotlights: SkillSpotlight[];
  signals: SkillSignal[];
  programId: string;
}): SkillSpotlight | null {
  const { skill, signals, programId } = params;
  if (signals.length === 0) return null;

  const existing = params.existingSpotlights.find(
    (spotlight) => spotlight.skillId === skill.id && spotlight.status !== 'rejected',
  );
  if (existing) return null;

  const usageSignal = Math.min(
    100,
    Math.round(signals.reduce((total, signal) => total + signal.score, 0) / signals.length + signals.length * 6),
  );

  if (usageSignal < 55) {
    return null;
  }

  const context = `The discovery agent scanned skill feed inputs and found ${signals.length} strong signals for ${skill.name}. ${summarizeSignals(signals)}`;
  const whyInteresting = `${skill.name} is gaining traction because it looks reusable beyond a single app. The combined repo and usage signals suggest the design solves a recurring agent workflow problem rather than a one-off prompt need.`;

  return {
    id: randomId('spotlight'),
    programId,
    skillId: skill.id,
    submittedBy: 'autonomous discovery agent',
    source: 'agent',
    context,
    whyInteresting,
    usageSignal,
    status: 'queued',
    createdAt: nowIso(),
  };
}

export function summarizeDiscoveryRun(run: DiscoveryRun) {
  return `Scanned skill feed, repo activity, and usage signals. Created ${run.discoveredCount} spotlight candidates and auto-rewarded ${run.autoRewardedCount}.`;
}
