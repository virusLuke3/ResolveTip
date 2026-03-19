export type RewardProgram = {
  id: string;
  title: string;
  description: string;
  hdIndex: number;
  status: 'active' | 'paused';
  treasuryAddress: string;
  treasuryBalance: number;
  createdAt: string;
};

export type RewardPolicy = {
  id: string;
  programId: string;
  chain: 'sepolia';
  asset: 'USDT';
  enabled: boolean;
  autopilotEnabled: boolean;
  baseReward: number;
  minReward: number;
  maxReward: number;
  dailyBudget: number;
  confidenceThreshold: number;
  autoApproveThreshold: number;
  allowPendingClaims: boolean;
  maxRewardsPerDayPerCreator: number;
  updatedAt: string;
};

export type Creator = {
  id: string;
  slug: string;
  displayName: string;
  headline: string;
  bio: string;
  createdAt: string;
};

export type Skill = {
  id: string;
  creatorId: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  repoUrl: string;
  status: 'published' | 'rewarded';
  createdAt: string;
};

export type WalletBinding = {
  id: string;
  creatorId: string;
  chain: 'sepolia';
  address: string;
  ownershipVerified: boolean;
  verificationMode: 'manual';
  verifiedAt: string;
};

export type SkillSpotlight = {
  id: string;
  programId: string;
  skillId: string;
  submittedBy: string;
  source: 'manual' | 'agent';
  context: string;
  whyInteresting: string;
  usageSignal: number;
  status: 'queued' | 'rewarded' | 'rejected' | 'pending_claim';
  createdAt: string;
};

export type SkillSignal = {
  id: string;
  skillId: string;
  signalType: 'repo_velocity' | 'workflow_usage' | 'bookmark' | 'reuse';
  sourceName: string;
  summary: string;
  score: number;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type DiscoveryRun = {
  id: string;
  programId: string;
  status: 'completed' | 'completed_with_rewards';
  discoveredCount: number;
  autoRewardedCount: number;
  summary: string;
  createdAt: string;
};

export type RewardDecision = {
  id: string;
  spotlightId: string;
  approved: boolean;
  confidence: number;
  noveltyScore: number;
  recommendedAmount: number;
  summary: string;
  modelName: string;
  createdAt: string;
};

export type RewardRecipient = {
  creatorId: string;
  amount: number;
  address: string | null;
  status: 'ready' | 'pending_claim';
  reason: string;
};

export type TipEvent = {
  id: string;
  spotlightId: string;
  programId: string;
  totalAmount: number;
  asset: 'USDT';
  chain: 'sepolia';
  status: 'created' | 'confirmed' | 'partial_pending' | 'failed';
  summary: string;
  createdAt: string;
};

export type TipTransfer = {
  id: string;
  tipEventId: string;
  recipientCreatorId: string;
  recipientAddress: string | null;
  amount: number;
  txHash: string | null;
  status: 'pending' | 'confirmed' | 'failed' | 'pending_claim';
  reason: string;
  createdAt: string;
};

export type AuditLog = {
  id: string;
  entityType: 'program' | 'skill' | 'spotlight' | 'reward' | 'wallet_binding' | 'discovery_run';
  entityId: string;
  action:
    | 'register_skill'
    | 'submit_spotlight'
    | 'run_discovery'
    | 'evaluate'
    | 'approve'
    | 'reject'
    | 'broadcast'
    | 'pending_claim'
    | 'bind_creator_wallet'
    | 'policy_updated';
  details: Record<string, unknown>;
  createdAt: string;
};

export type DemoState = {
  programs: RewardProgram[];
  rewardPolicies: RewardPolicy[];
  creators: Creator[];
  skills: Skill[];
  walletBindings: WalletBinding[];
  skillSignals: SkillSignal[];
  skillSpotlights: SkillSpotlight[];
  discoveryRuns: DiscoveryRun[];
  rewardDecisions: RewardDecision[];
  tipEvents: TipEvent[];
  tipTransfers: TipTransfer[];
  auditLogs: AuditLog[];
};

export type SpotlightWithRelations = SkillSpotlight & {
  skill: Skill;
  creator: Creator;
  latestDecision: RewardDecision | null;
  signals: SkillSignal[];
};

export type DashboardProgram = RewardProgram & {
  policy: RewardPolicy;
  dailySpent: number;
  remainingBudget: number;
  latestRun: DiscoveryRun | null;
  recentSpotlights: SpotlightWithRelations[];
  recentTips: TipEvent[];
};
