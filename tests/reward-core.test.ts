import { buildRewardRecipient, calculateRewardAmount, isSpotlightRewardable } from '@/lib/reward-core';
import { RewardDecision, RewardPolicy, SkillSpotlight, WalletBinding } from '@/lib/types';

const policy: RewardPolicy = {
  id: 'policy',
  programId: 'program',
  chain: 'sepolia',
  asset: 'USDT',
  enabled: true,
  autopilotEnabled: true,
  baseReward: 2.5,
  minReward: 1.5,
  maxReward: 6,
  dailyBudget: 15,
  confidenceThreshold: 0.72,
  autoApproveThreshold: 0.82,
  allowPendingClaims: true,
  maxRewardsPerDayPerCreator: 2,
  updatedAt: '2026-03-19T00:00:00.000Z',
};

const spotlight: SkillSpotlight = {
  id: 'spotlight',
  programId: 'program',
  skillId: 'skill',
  submittedBy: 'tester',
  source: 'manual',
  context: 'Used in a production-like workflow.',
  whyInteresting: 'A reusable evaluation and recovery skill.',
  usageSignal: 80,
  status: 'queued',
  createdAt: '2026-03-19T00:00:00.000Z',
};

const approvedDecision: RewardDecision = {
  id: 'decision',
  spotlightId: 'spotlight',
  approved: true,
  confidence: 0.91,
  noveltyScore: 0.88,
  recommendedAmount: 4.1,
  summary: 'Worth rewarding.',
  modelName: 'gpt-5.4',
  createdAt: '2026-03-19T00:00:00.000Z',
};

describe('reward core', () => {
  it('rejects low-confidence spotlights', () => {
    const result = isSpotlightRewardable({
      policy,
      spotlight,
      dailySpent: 0,
      decision: {
        ...approvedDecision,
        confidence: 0.4,
      },
    });

    expect(result.ok).toBe(false);
  });

  it('caps reward by max reward and remaining budget', () => {
    const amount = calculateRewardAmount({
      policy,
      spotlight: { ...spotlight, usageSignal: 100 },
      decision: { ...approvedDecision, noveltyScore: 1 },
      dailySpent: 12,
    });

    expect(amount).toBe(3);
  });

  it('marks missing wallet bindings as pending claim', () => {
    const recipient = buildRewardRecipient({
      creatorId: 'creator_1',
      amount: 2.5,
      policy,
      summary: 'Reward approved.',
    });

    expect(recipient.status).toBe('pending_claim');
    expect(recipient.address).toBeNull();
  });

  it('builds a ready recipient when the creator is bound', () => {
    const binding: WalletBinding = {
      id: 'wallet',
      creatorId: 'creator_1',
      chain: 'sepolia',
      address: '0x43587B0F79fc341B62FaA73c5533A6Ea6dE0EF8B',
      ownershipVerified: true,
      verificationMode: 'manual',
      verifiedAt: '2026-03-19T00:00:00.000Z',
    };

    const recipient = buildRewardRecipient({
      creatorId: 'creator_1',
      amount: 2.5,
      policy,
      binding,
      summary: 'Reward approved.',
    });

    expect(recipient.status).toBe('ready');
    expect(recipient.address).toBe(binding.address);
  });
});
