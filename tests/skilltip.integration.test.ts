import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { bindCreatorWallet, getDashboardData, rewardSpotlight, runDiscoveryAgent, submitSpotlight } from '@/lib/resolvetip';

async function withTempState<T>(run: () => Promise<T>) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skilltip-'));
  const source = path.join(process.cwd(), 'data', 'demo-state.json');
  const target = path.join(tempDir, 'state.json');
  await fs.copyFile(source, target);
  const seeded = JSON.parse(await fs.readFile(target, 'utf8'));
  seeded.skillSpotlights = seeded.skillSpotlights.filter((spotlight: { source?: string }) => spotlight.source !== 'agent');
  seeded.discoveryRuns = [];
  if (seeded.rewardPolicies?.[0]) {
    seeded.rewardPolicies[0].maxRewardsPerDayPerCreator = 10;
    seeded.rewardPolicies[0].dailyBudget = 100;
  }
  await fs.writeFile(target, JSON.stringify(seeded, null, 2), 'utf8');
  process.env.RESOLVETIP_DATA_FILE = target;
  process.env.RESOLVETIP_WALLET_MODE = 'mock';

  try {
    return await run();
  } finally {
    delete process.env.RESOLVETIP_DATA_FILE;
  }
}

describe('skilltip integration', () => {
  it('submits a spotlight and rewards the publisher in mock mode', async () => {
    await withTempState(async () => {
      await bindCreatorWallet({
        creatorId: 'creator_jo',
        address: '0x43587B0F79fc341B62FaA73c5533A6Ea6dE0EF8B',
      });

      await submitSpotlight({
        programId: 'program_skilltip',
        skillId: 'skill_schema_guard',
        submittedBy: 'integration test',
        context: 'The skill rescued a brittle multi-agent write path.',
        whyInteresting:
          'It feels like a reusable guardrail primitive rather than one-off prompt glue, and the workflow benefit shows up immediately.',
        usageSignal: 82,
      });

      const before = await getDashboardData();
      const spotlight = before.spotlights.find((candidate) => candidate.submittedBy === 'integration test');
      expect(spotlight).toBeTruthy();

      const result = await rewardSpotlight({ spotlightId: spotlight!.id });
      expect(result.decision?.approved).toBe(true);

      const after = await getDashboardData();
      const updated = after.spotlights.find((candidate) => candidate.id === spotlight!.id);
      const transfer = after.transfers.find((candidate) => candidate.recipientCreatorId === 'creator_jo');
      expect(updated?.status).toBe('rewarded');
      expect(transfer?.status).toBe('confirmed');
    });
  });

  it('runs the discovery agent and generates agent-created spotlight candidates', async () => {
    await withTempState(async () => {
      await bindCreatorWallet({
        creatorId: 'creator_mika',
        address: '0x43587B0F79fc341B62FaA73c5533A6Ea6dE0EF8B',
      });

      const result = await runDiscoveryAgent({ programId: 'program_skilltip' });
      expect(result.run?.discoveredCount).toBeGreaterThanOrEqual(1);

      const after = await getDashboardData();
      const generated = after.spotlights.find((spotlight) => spotlight.source === 'agent');
      expect(generated).toBeTruthy();
    });
  });

  it('releases pending claims automatically after the creator binds a wallet', async () => {
    await withTempState(async () => {
      await submitSpotlight({
        programId: 'program_skilltip',
        skillId: 'skill_schema_guard',
        submittedBy: 'pending-claim-test',
        context: 'The skill prevented invalid writes in an autonomous support workflow.',
        whyInteresting:
          'It is a reusable structured-output safety primitive and deserves a publisher reward even before wallet binding is complete.',
        usageSignal: 83,
      });

      const beforeReward = await getDashboardData();
      const spotlight = beforeReward.spotlights.find((candidate) => candidate.submittedBy === 'pending-claim-test');
      expect(spotlight).toBeTruthy();

      const pendingResult = await rewardSpotlight({ spotlightId: spotlight!.id });
      const afterPending = await getDashboardData();
      const pendingTransfer = afterPending.transfers.find((transfer) => transfer.recipientCreatorId === 'creator_jo');
      expect(pendingTransfer?.status).toBe('pending_claim');

      await bindCreatorWallet({
        creatorId: 'creator_jo',
        address: '0x43587B0F79fc341B62FaA73c5533A6Ea6dE0EF8B',
      });

      const after = await getDashboardData();
      const updatedSpotlight = after.spotlights.find((candidate) => candidate.id === spotlight!.id);
      const releasedTransfer = after.transfers.find((transfer) => transfer.recipientCreatorId === 'creator_jo');
      expect(updatedSpotlight?.status).toBe('rewarded');
      expect(releasedTransfer?.status).toBe('confirmed');
      expect(releasedTransfer?.txHash).toBeTruthy();
    });
  });
});
