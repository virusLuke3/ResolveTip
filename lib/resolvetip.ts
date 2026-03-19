import { evaluateSpotlight } from '@/lib/openai-judge';
import { generateSpotlightCandidate, summarizeDiscoveryRun } from '@/lib/discovery-agent';
import { buildRewardRecipient, calculateRewardAmount, isSpotlightRewardable } from '@/lib/reward-core';
import { readState, updateState } from '@/lib/store';
import {
  AuditLog,
  Creator,
  DashboardProgram,
  DiscoveryRun,
  RewardPolicy,
  RewardProgram,
  Skill,
  SkillSignal,
  SkillSpotlight,
  SpotlightWithRelations,
  TipEvent,
  WalletBinding,
} from '@/lib/types';
import { nowIso, randomId, todayIso } from '@/lib/utils';
import { executeRewardTransfers, getProgramTreasuryBalance, resolveTreasuryAddress } from '@/lib/wallet';

function findProgram(state: Awaited<ReturnType<typeof readState>>, programId: string) {
  const program = state.programs.find((candidate) => candidate.id === programId);
  if (!program) {
    throw new Error(`Reward program not found: ${programId}`);
  }
  return program;
}

function findPolicy(state: Awaited<ReturnType<typeof readState>>, programId: string) {
  const policy = state.rewardPolicies.find((candidate) => candidate.programId === programId);
  if (!policy) {
    throw new Error(`Reward policy not found: ${programId}`);
  }
  return policy;
}

function findCreator(state: Awaited<ReturnType<typeof readState>>, creatorId: string) {
  const creator = state.creators.find((candidate) => candidate.id === creatorId);
  if (!creator) {
    throw new Error(`Creator not found: ${creatorId}`);
  }
  return creator;
}

function findSkill(state: Awaited<ReturnType<typeof readState>>, skillId: string) {
  const skill = state.skills.find((candidate) => candidate.id === skillId);
  if (!skill) {
    throw new Error(`Skill not found: ${skillId}`);
  }
  return skill;
}

function findSpotlight(state: Awaited<ReturnType<typeof readState>>, spotlightId: string) {
  const spotlight = state.skillSpotlights.find((candidate) => candidate.id === spotlightId);
  if (!spotlight) {
    throw new Error(`Spotlight not found: ${spotlightId}`);
  }
  return spotlight;
}

function createAuditLog(input: Omit<AuditLog, 'id' | 'createdAt'>): AuditLog {
  return {
    id: randomId('audit'),
    createdAt: nowIso(),
    ...input,
  };
}

function getLatestDecision(state: Awaited<ReturnType<typeof readState>>, spotlightId: string) {
  return state.rewardDecisions.find((candidate) => candidate.spotlightId === spotlightId) ?? null;
}

function enrichSpotlight(
  state: Awaited<ReturnType<typeof readState>>,
  spotlight: SkillSpotlight,
): SpotlightWithRelations {
  const skill = findSkill(state, spotlight.skillId);
  const creator = findCreator(state, skill.creatorId);
  return {
    ...spotlight,
    skill,
    creator,
    latestDecision: getLatestDecision(state, spotlight.id),
    signals: state.skillSignals.filter((signal) => signal.skillId === skill.id).slice(0, 3),
  };
}

async function settlePendingClaimsForCreatorInState(
  state: Awaited<ReturnType<typeof readState>>,
  creatorId: string,
  binding: WalletBinding,
) {
  const pendingTransfers = state.tipTransfers.filter(
    (transfer) => transfer.recipientCreatorId === creatorId && transfer.status === 'pending_claim',
  );

  for (const pendingTransfer of pendingTransfers) {
    const tipEvent = state.tipEvents.find((tip) => tip.id === pendingTransfer.tipEventId);
    if (!tipEvent) {
      continue;
    }

    const program = findProgram(state, tipEvent.programId);
    const execution = await executeRewardTransfers({
      program,
      tipEvent,
      recipients: [
        {
          creatorId,
          amount: pendingTransfer.amount,
          address: binding.address,
          status: 'ready',
          reason: pendingTransfer.reason,
        },
      ],
    });

    const releasedTransfer = execution.transfers[0];
    if (!releasedTransfer) {
      continue;
    }

    pendingTransfer.recipientAddress = binding.address;
    pendingTransfer.txHash = releasedTransfer.txHash;
    pendingTransfer.status = releasedTransfer.status;
    pendingTransfer.reason = `${pendingTransfer.reason} Released after wallet binding.`;
    program.treasuryBalance = execution.currentBalance ?? program.treasuryBalance;

    const relatedTransfers = state.tipTransfers.filter((transfer) => transfer.tipEventId === tipEvent.id);
    tipEvent.status = relatedTransfers.every((transfer) => transfer.status === 'confirmed') ? 'confirmed' : 'partial_pending';

    const spotlight = state.skillSpotlights.find((candidate) => candidate.id === tipEvent.spotlightId);
    if (spotlight && tipEvent.status === 'confirmed') {
      spotlight.status = 'rewarded';
    }

    state.auditLogs.unshift(
      createAuditLog({
        entityType: 'reward',
        entityId: tipEvent.id,
        action: 'approve',
        details: {
          creatorId,
          amount: pendingTransfer.amount,
          txHash: pendingTransfer.txHash,
          releasedAfterBinding: true,
        },
      }),
    );
  }
}

async function hydrateProgram(program: RewardProgram, state: Awaited<ReturnType<typeof readState>>): Promise<DashboardProgram> {
  const policy = findPolicy(state, program.id);
  const dailySpent = state.tipEvents
    .filter((tip) => tip.programId === program.id && tip.createdAt.slice(0, 10) === todayIso())
    .reduce((total, tip) => total + tip.totalAmount, 0);

  const [treasuryBalance, treasuryAddress] = await Promise.all([
    getProgramTreasuryBalance(program).catch(() => program.treasuryBalance),
    resolveTreasuryAddress(program.hdIndex).catch(() => program.treasuryAddress),
  ]);
  const recentSpotlights = state.skillSpotlights
    .filter((spotlight) => spotlight.programId === program.id)
    .slice(0, 6)
    .map((spotlight) => enrichSpotlight(state, spotlight));

  return {
    ...program,
    treasuryAddress,
    treasuryBalance,
    policy,
    dailySpent,
    remainingBudget: Number(Math.max(0, policy.dailyBudget - dailySpent).toFixed(2)),
    latestRun: state.discoveryRuns.find((run) => run.programId === program.id) ?? null,
    recentSpotlights,
    recentTips: state.tipEvents.filter((tip) => tip.programId === program.id).slice(0, 6),
  };
}

export async function getDashboardData() {
  const state = await readState();
  const programs = await Promise.all(state.programs.map((program) => hydrateProgram(program, state)));

  return {
    programs,
    creators: state.creators,
    skills: state.skills,
    bindings: state.walletBindings,
    signals: state.skillSignals,
    discoveryRuns: state.discoveryRuns,
    spotlights: state.skillSpotlights.map((spotlight) => enrichSpotlight(state, spotlight)),
    transfers: state.tipTransfers,
    auditLogs: state.auditLogs,
  };
}

export async function registerSkill(input: {
  creatorId: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  repoUrl: string;
}) {
  await updateState(async (state) => {
    const creator = findCreator(state, input.creatorId);
    const skill: Skill = {
      id: randomId('skill'),
      creatorId: creator.id,
      name: input.name.trim(),
      tagline: input.tagline.trim(),
      description: input.description.trim(),
      category: input.category.trim(),
      repoUrl: input.repoUrl.trim(),
      status: 'published',
      createdAt: nowIso(),
    };

    state.skills.unshift(skill);
    state.auditLogs.unshift(
      createAuditLog({
        entityType: 'skill',
        entityId: skill.id,
        action: 'register_skill',
        details: { creatorId: creator.id, name: skill.name, repoUrl: skill.repoUrl },
      }),
    );

    return state;
  });
}

export async function bindCreatorWallet(input: { creatorId: string; address: string }) {
  await updateState(async (state) => {
    findCreator(state, input.creatorId);
    const existing = state.walletBindings.find((candidate) => candidate.creatorId === input.creatorId);
    const binding: WalletBinding = {
      id: existing?.id ?? randomId('wallet'),
      creatorId: input.creatorId,
      chain: 'sepolia',
      address: input.address.trim(),
      ownershipVerified: true,
      verificationMode: 'manual',
      verifiedAt: nowIso(),
    };

    state.walletBindings = [binding, ...state.walletBindings.filter((candidate) => candidate.creatorId !== input.creatorId)];
    await settlePendingClaimsForCreatorInState(state, input.creatorId, binding);
    state.auditLogs.unshift(
      createAuditLog({
        entityType: 'wallet_binding',
        entityId: binding.id,
        action: 'bind_creator_wallet',
        details: { creatorId: binding.creatorId, address: binding.address },
      }),
    );

    return state;
  });
}

export async function submitSpotlight(input: {
  programId: string;
  skillId: string;
  submittedBy: string;
  context: string;
  whyInteresting: string;
  usageSignal: number;
}) {
  await updateState(async (state) => {
    const program = findProgram(state, input.programId);
    const skill = findSkill(state, input.skillId);

    const spotlight: SkillSpotlight = {
      id: randomId('spotlight'),
      programId: program.id,
      skillId: skill.id,
      submittedBy: input.submittedBy.trim(),
      source: 'manual',
      context: input.context.trim(),
      whyInteresting: input.whyInteresting.trim(),
      usageSignal: Number(input.usageSignal),
      status: 'queued',
      createdAt: nowIso(),
    };

    state.skillSpotlights.unshift(spotlight);
    state.auditLogs.unshift(
      createAuditLog({
        entityType: 'spotlight',
        entityId: spotlight.id,
        action: 'submit_spotlight',
        details: { skillId: spotlight.skillId, submittedBy: spotlight.submittedBy, usageSignal: spotlight.usageSignal },
      }),
    );

    return state;
  });
}

async function processSpotlightInState(
  state: Awaited<ReturnType<typeof readState>>,
  spotlightId: string,
  options?: { requireAutopilotThreshold?: boolean },
) {
  const spotlight = findSpotlight(state, spotlightId);
  const program = findProgram(state, spotlight.programId);
  const policy = findPolicy(state, spotlight.programId);
  const skill = findSkill(state, spotlight.skillId);
  const creator = findCreator(state, skill.creatorId);

  const decision = await evaluateSpotlight({ spotlight, skill, creator, policy });
  state.rewardDecisions.unshift(decision);
  state.auditLogs.unshift(
    createAuditLog({
      entityType: 'spotlight',
      entityId: spotlight.id,
      action: 'evaluate',
      details: {
        approved: decision.approved,
        confidence: decision.confidence,
        modelName: decision.modelName,
        summary: decision.summary,
      },
    }),
  );

  if (options?.requireAutopilotThreshold && decision.confidence < policy.autoApproveThreshold) {
    return { decision, transfer: null };
  }

  const dailySpent = state.tipEvents
    .filter((tip) => tip.programId === program.id && tip.createdAt.slice(0, 10) === todayIso())
    .reduce((total, tip) => total + tip.totalAmount, 0);

  const rewardability = isSpotlightRewardable({ policy, spotlight, decision, dailySpent });
  if (!rewardability.ok) {
    spotlight.status = 'rejected';
    state.auditLogs.unshift(
      createAuditLog({
        entityType: 'spotlight',
        entityId: spotlight.id,
        action: 'reject',
        details: { reason: rewardability.reason },
      }),
    );
    return { decision, transfer: null };
  }

  const existingRewardsToday = state.tipTransfers.filter(
    (transfer) =>
      transfer.recipientCreatorId === creator.id &&
      transfer.createdAt.slice(0, 10) === todayIso() &&
      transfer.status !== 'failed',
  ).length;

  if (existingRewardsToday >= policy.maxRewardsPerDayPerCreator) {
    spotlight.status = 'rejected';
    state.auditLogs.unshift(
      createAuditLog({
        entityType: 'spotlight',
        entityId: spotlight.id,
        action: 'reject',
        details: { reason: 'Creator reward limit reached for today.' },
      }),
    );
    return { decision, transfer: null };
  }

  const amount = calculateRewardAmount({ policy, spotlight, decision, dailySpent });
  const binding = state.walletBindings.find((candidate) => candidate.creatorId === creator.id);
  const recipient = buildRewardRecipient({
    creatorId: creator.id,
    amount,
    binding,
    policy,
    summary: decision.summary,
  });

  if (recipient.status === 'pending_claim' && !policy.allowPendingClaims) {
    spotlight.status = 'rejected';
    state.auditLogs.unshift(
      createAuditLog({
        entityType: 'spotlight',
        entityId: spotlight.id,
        action: 'reject',
        details: { reason: 'Creator wallet is required before rewarding.' },
      }),
    );
    return { decision, transfer: null };
  }

  const tipEvent: TipEvent = {
    id: randomId('tip'),
    spotlightId: spotlight.id,
    programId: program.id,
    totalAmount: amount,
    asset: 'USDT',
    chain: 'sepolia',
    status: 'created',
    summary: decision.summary,
    createdAt: nowIso(),
  };

  const execution = await executeRewardTransfers({
    program,
    tipEvent,
    recipients: [recipient],
  });

  tipEvent.status = execution.status;
  state.tipEvents.unshift(tipEvent);
  state.tipTransfers.unshift(...execution.transfers);
  program.treasuryBalance = execution.currentBalance ?? program.treasuryBalance;
  spotlight.status = execution.status === 'confirmed' ? 'rewarded' : 'pending_claim';
  skill.status = 'rewarded';

  state.auditLogs.unshift(
    createAuditLog({
      entityType: 'reward',
      entityId: tipEvent.id,
      action: execution.status === 'confirmed' ? 'approve' : 'pending_claim',
      details: {
        creatorId: creator.id,
        skillId: skill.id,
        amount,
        txHash: execution.transfers[0]?.txHash ?? null,
      },
    }),
  );

  return { decision, transfer: execution.transfers[0] ?? null };
}

export async function updatePolicySettings(programId: string, input: Partial<RewardPolicy>) {
  await updateState(async (state) => {
    const policy = findPolicy(state, programId);

    Object.assign(policy, {
      ...input,
      updatedAt: nowIso(),
    });

    state.auditLogs.unshift(
      createAuditLog({
        entityType: 'program',
        entityId: programId,
        action: 'policy_updated',
        details: input as Record<string, unknown>,
      }),
    );

    return state;
  });
}

export async function rewardSpotlight(input: { spotlightId: string }) {
  let immediateTransferId: string | null = null;

  const result = await updateState(async (state) => {
    const outcome = await processSpotlightInState(state, input.spotlightId);
    immediateTransferId = outcome.transfer?.id ?? null;
    return state;
  });

  const spotlight = findSpotlight(result, input.spotlightId);
  return {
    spotlight: enrichSpotlight(result, spotlight),
    transfer: immediateTransferId ? result.tipTransfers.find((transfer) => transfer.id === immediateTransferId) ?? null : null,
    decision: result.rewardDecisions.find((candidate) => candidate.spotlightId === input.spotlightId) ?? null,
  };
}

export async function runDiscoveryAgent(input: { programId: string }) {
  const result = await updateState(async (state) => {
    const program = findProgram(state, input.programId);
    const policy = findPolicy(state, input.programId);
    const candidates: SkillSpotlight[] = [];
    let autoRewardedCount = 0;

    for (const skill of state.skills) {
      const signals = state.skillSignals.filter((signal) => signal.skillId === skill.id);
      const candidate = generateSpotlightCandidate({
        policy,
        skill,
        existingSpotlights: state.skillSpotlights,
        signals,
        programId: program.id,
      });

      if (!candidate) {
        continue;
      }

      state.skillSpotlights.unshift(candidate);
      candidates.push(candidate);
      state.auditLogs.unshift(
        createAuditLog({
          entityType: 'spotlight',
          entityId: candidate.id,
          action: 'submit_spotlight',
          details: {
            source: 'agent',
            skillId: candidate.skillId,
            usageSignal: candidate.usageSignal,
          },
        }),
      );

      if (policy.autopilotEnabled) {
        const { transfer } = await processSpotlightInState(state, candidate.id, { requireAutopilotThreshold: true });
        if (transfer) {
          autoRewardedCount += 1;
        }
      }
    }

    const run: DiscoveryRun = {
      id: randomId('run'),
      programId: program.id,
      status: autoRewardedCount > 0 ? 'completed_with_rewards' : 'completed',
      discoveredCount: candidates.length,
      autoRewardedCount,
      summary: '',
      createdAt: nowIso(),
    };
    run.summary = summarizeDiscoveryRun(run);
    state.discoveryRuns.unshift(run);
    state.auditLogs.unshift(
      createAuditLog({
        entityType: 'discovery_run',
        entityId: run.id,
        action: 'run_discovery',
        details: {
          discoveredCount: run.discoveredCount,
          autoRewardedCount: run.autoRewardedCount,
          autopilotEnabled: policy.autopilotEnabled,
        },
      }),
    );

    return state;
  });

  return {
    run: result.discoveryRuns[0] ?? null,
    spotlights: result.skillSpotlights
      .filter((spotlight) => spotlight.submittedBy === 'autonomous discovery agent')
      .slice(0, 5)
      .map((spotlight) => enrichSpotlight(result, spotlight)),
  };
}
