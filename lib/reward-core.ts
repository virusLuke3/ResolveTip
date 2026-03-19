import { RewardDecision, RewardPolicy, RewardRecipient, SkillSpotlight, TipEvent, WalletBinding } from '@/lib/types';
import { clamp } from '@/lib/utils';

export function isSpotlightRewardable(params: {
  policy: RewardPolicy;
  spotlight: SkillSpotlight;
  decision: RewardDecision;
  dailySpent: number;
}) {
  const { policy, spotlight, decision, dailySpent } = params;

  if (!policy.enabled) return { ok: false, reason: 'Rewards are paused.' };
  if (spotlight.status !== 'queued') return { ok: false, reason: 'This spotlight has already been processed.' };
  if (!decision.approved) return { ok: false, reason: decision.summary };
  if (decision.confidence < policy.confidenceThreshold) {
    return { ok: false, reason: `Confidence ${decision.confidence.toFixed(2)} is below threshold.` };
  }
  if (dailySpent >= policy.dailyBudget) {
    return { ok: false, reason: 'The daily budget is already exhausted.' };
  }

  return { ok: true, reason: decision.summary };
}

export function calculateRewardAmount(params: {
  policy: RewardPolicy;
  spotlight: SkillSpotlight;
  decision: RewardDecision;
  dailySpent: number;
}) {
  const { policy, spotlight, decision, dailySpent } = params;
  const usageLift = clamp(0, 0.8, spotlight.usageSignal / 125);
  const noveltyLift = clamp(0, 1, decision.noveltyScore) * 1.2;
  const proposed = policy.baseReward + usageLift + noveltyLift;
  const capped = clamp(policy.minReward, policy.maxReward, proposed);
  const remainingBudget = Math.max(0, policy.dailyBudget - dailySpent);
  return Number(Math.min(capped, remainingBudget).toFixed(2));
}

export function buildRewardRecipient(params: {
  creatorId: string;
  amount: number;
  binding?: WalletBinding;
  policy: RewardPolicy;
  summary: string;
}): RewardRecipient {
  const { creatorId, amount, binding, policy, summary } = params;

  if (!binding) {
    return {
      creatorId,
      amount,
      address: null,
      status: policy.allowPendingClaims ? 'pending_claim' : 'pending_claim',
      reason: `${summary} Wallet not bound yet.`,
    };
  }

  return {
    creatorId,
    amount,
    address: binding.address,
    status: 'ready',
    reason: summary,
  };
}

export function summarizeTipStatus(tipEvent: TipEvent, recipient: RewardRecipient) {
  if (tipEvent.status === 'confirmed') {
    return `${recipient.amount.toFixed(2)} USDT sent to the skill publisher on Sepolia.`;
  }

  return `${recipient.amount.toFixed(2)} USDT reserved. The publisher still needs to bind a Sepolia wallet.`;
}
