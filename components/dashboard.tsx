import Link from 'next/link';
import {
  CreatorWalletForm,
  PolicyForm,
  RewardSpotlightForm,
  RunDiscoveryAgentForm,
  SkillRegistrationForm,
  SpotlightForm,
} from '@/components/forms';
import { getOpenAiModel } from '@/lib/config';
import { Creator, DashboardProgram, Skill, SpotlightWithRelations, TipTransfer, WalletBinding } from '@/lib/types';
import { formatDateTime, formatUsdt, initials } from '@/lib/utils';
import { getResolvedWalletMode } from '@/lib/wallet';

function creatorWallet(creatorId: string, bindings: WalletBinding[]) {
  return bindings.find((binding) => binding.creatorId === creatorId) ?? null;
}

function compactHash(value: string, start = 8, end = 6) {
  if (value.length <= start + end + 3) return value;
  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

function explorerUrl(txHash: string) {
  return `https://sepolia.etherscan.io/tx/${txHash}`;
}

function SpotlightCard({
  spotlight,
  bindings,
}: {
  spotlight: SpotlightWithRelations;
  bindings: WalletBinding[];
}) {
  const binding = creatorWallet(spotlight.creator.id, bindings);
  const decision = spotlight.latestDecision;

  return (
    <article className="thread-card">
      <div className="thread-head">
        <div>
          <span className="eyebrow">{spotlight.skill.category}</span>
          <h4>{spotlight.skill.name}</h4>
          <p>
            by {spotlight.creator.displayName} · {spotlight.status}
          </p>
        </div>
        {spotlight.status === 'queued' ? <RewardSpotlightForm spotlight={spotlight} /> : null}
      </div>
      <div className="spotlight-grid">
        <div>
          <span className="meta-label">Tagline</span>
          <p>{spotlight.skill.tagline}</p>
        </div>
        <div>
          <span className="meta-label">Usage signal</span>
          <p>{spotlight.usageSignal}/100</p>
        </div>
        <div>
          <span className="meta-label">Observed in the wild</span>
          <p>{spotlight.context}</p>
        </div>
        <div>
          <span className="meta-label">Why this design stands out</span>
          <p>{spotlight.whyInteresting}</p>
        </div>
      </div>
      <div className="message-list">
        <div className="message-item">
          <div className="avatar">{initials(spotlight.creator.displayName)}</div>
          <div className="message-body">
            <div className="message-meta">
              <strong>{spotlight.creator.displayName}</strong>
              <span>{binding ? `${binding.address.slice(0, 10)}...` : 'wallet unbound'}</span>
              <span>{spotlight.source === 'agent' ? 'agent discovered' : 'manual nomination'}</span>
              <span>{formatDateTime(spotlight.createdAt)}</span>
            </div>
            <p>{decision?.summary ?? 'Waiting for review. The reward judge will decide whether this design deserves a tip.'}</p>
          </div>
        </div>
      </div>
      {spotlight.signals.length > 0 ? (
        <div className="signal-row">
          {spotlight.signals.map((signal) => (
            <span key={signal.id} className="pill pill-muted">
              {signal.sourceName}: {signal.score}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function Hero({ program, skillCount, queuedCount }: { program: DashboardProgram; skillCount: number; queuedCount: number }) {
  return (
    <section className="hero card hero-card">
      <div className="hero-copy">
        <span className="eyebrow">Skill tipping protocol</span>
        <h1>Reward the people who publish genuinely useful agent skills.</h1>
        <p>
          SkillTip turns interesting skill discoveries into Sepolia USDT rewards. Instead of only consuming agent
          skills, teams can spotlight standout designs, let an OpenAI judge review the nomination, and tip the
          publisher on-chain.
        </p>
        <div className="hero-actions">
          <Link className="button button-primary" href="#spotlights">
            Review spotlights
          </Link>
          <Link className="button" href="/audit">
            Open audit log
          </Link>
        </div>
      </div>
      <div className="hero-metrics">
        <div>
          <span>Treasury</span>
          <strong>{formatUsdt(program.treasuryBalance)}</strong>
        </div>
        <div>
          <span>Published skills</span>
          <strong>{skillCount}</strong>
        </div>
        <div>
          <span>Queued tips</span>
          <strong>{queuedCount}</strong>
        </div>
        <div>
          <span>Judge</span>
          <strong>{process.env.OPENAI_API_KEY ? getOpenAiModel() : 'Heuristic fallback'}</strong>
        </div>
        <div>
          <span>Wallet runtime</span>
          <strong>{getResolvedWalletMode()}</strong>
        </div>
      </div>
    </section>
  );
}

function FlowStrip({
  featuredSpotlight,
  transfer,
}: {
  featuredSpotlight: SpotlightWithRelations | undefined;
  transfer: TipTransfer | undefined;
}) {
  return (
    <section className="card flow-card">
      <div className="section-header">
        <div>
          <span className="eyebrow">One-screen demo</span>
          <h2>The whole product flow in four moves</h2>
          <p>When you demo this page, you can literally move from left to right and tell the whole story once.</p>
        </div>
      </div>
      <div className="flow-grid">
        <article className="flow-step">
          <span className="flow-index">01</span>
          <h3>Publish</h3>
          <p>A creator ships a reusable skill instead of another throwaway prompt.</p>
        </article>
        <article className="flow-step">
          <span className="flow-index">02</span>
          <h3>Spotlight</h3>
          <p>Someone notices the design is genuinely clever and submits a short nomination.</p>
        </article>
        <article className="flow-step">
          <span className="flow-index">03</span>
          <h3>Judge</h3>
          <p>OpenAI scores whether the skill is novel, reusable, and worth paying for.</p>
        </article>
        <article className="flow-step">
          <span className="flow-index">04</span>
          <h3>Tip</h3>
          <p>The publisher receives Sepolia USDT through the WDK treasury, with an audit trail.</p>
        </article>
      </div>
      {featuredSpotlight ? (
        <div className="demo-snapshot">
          <div>
            <span className="meta-label">Featured skill</span>
            <strong>{featuredSpotlight.skill.name}</strong>
            <p>{featuredSpotlight.whyInteresting}</p>
          </div>
          <div>
            <span className="meta-label">Publisher</span>
            <strong>{featuredSpotlight.creator.displayName}</strong>
            <p>{featuredSpotlight.creator.headline}</p>
          </div>
          <div>
            <span className="meta-label">Judge result</span>
            <strong>{featuredSpotlight.latestDecision?.modelName ?? 'pending review'}</strong>
            <p>{featuredSpotlight.latestDecision?.summary ?? 'Waiting for evaluation.'}</p>
          </div>
          <div>
            <span className="meta-label">Transfer proof</span>
            <strong>{transfer ? formatUsdt(transfer.amount) : 'Pending'}</strong>
            {transfer?.txHash ? (
              <a
                className="explorer-link hash-text"
                href={explorerUrl(transfer.txHash)}
                rel="noreferrer"
                target="_blank"
                title={transfer.txHash}
              >
                View on Sepolia Etherscan: {compactHash(transfer.txHash, 10, 8)}
              </a>
            ) : (
              <p className="hash-text">No on-chain receipt yet.</p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function AgentRail({ program }: { program: DashboardProgram }) {
  return (
    <section className="card">
      <div className="section-header">
        <div>
          <span className="eyebrow">Autonomous loop</span>
          <h2>The agent now scouts, filters, and allocates capital</h2>
          <p>
            It scans repo velocity, skill feed saves, and workflow usage signals, generates spotlight candidates, and
            auto-rewards anything that clears the judge threshold plus policy guardrails.
          </p>
        </div>
        <RunDiscoveryAgentForm programId={program.id} />
      </div>
      <div className="stats-grid">
        <div className="stat">
          <span>Autopilot</span>
          <strong>{program.policy.autopilotEnabled ? 'on' : 'off'}</strong>
        </div>
        <div className="stat">
          <span>Auto-approve threshold</span>
          <strong>{program.policy.autoApproveThreshold.toFixed(2)}</strong>
        </div>
        <div className="stat">
          <span>Latest scan</span>
          <strong>{program.latestRun ? formatDateTime(program.latestRun.createdAt) : 'none yet'}</strong>
        </div>
        <div className="stat">
          <span>Discovered</span>
          <strong>{program.latestRun?.discoveredCount ?? 0}</strong>
        </div>
        <div className="stat">
          <span>Auto-rewarded</span>
          <strong>{program.latestRun?.autoRewardedCount ?? 0}</strong>
        </div>
      </div>
      {program.latestRun ? <p className="agent-summary">{program.latestRun.summary}</p> : null}
    </section>
  );
}

export function HomeDashboard({
  program,
  creators,
  skills,
  bindings,
  spotlights,
  transfers,
}: {
  program: DashboardProgram;
  creators: Creator[];
  skills: Skill[];
  bindings: WalletBinding[];
  spotlights: SpotlightWithRelations[];
  transfers: TipTransfer[];
}) {
  const queuedSpotlights = spotlights.filter((spotlight) => spotlight.status === 'queued');
  const rewardedSpotlight = spotlights.find((spotlight) => spotlight.status === 'rewarded');
  const rewardedTransfer = rewardedSpotlight
    ? transfers.find((transfer) => {
        const rewardedTip = program.recentTips.find((tip) => tip.spotlightId === rewardedSpotlight.id);
        return transfer.tipEventId === rewardedTip?.id;
      })
    : undefined;

  return (
    <div className="stack-lg">
      <Hero program={program} queuedCount={queuedSpotlights.length} skillCount={skills.length} />
      <FlowStrip featuredSpotlight={rewardedSpotlight} transfer={rewardedTransfer} />
      <AgentRail program={program} />

      <section className="card">
        <div className="section-header">
          <div>
            <span className="eyebrow">Program</span>
            <h2>{program.title}</h2>
            <p>{program.description}</p>
          </div>
          <div className="mini-stats">
            <div className="pill pill-success" title={program.treasuryAddress}>
              Treasury: {compactHash(program.treasuryAddress, 10, 8)}
            </div>
            <div className="pill pill-muted">
              {program.policy.chain} / {program.policy.asset}
            </div>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat">
            <span>Daily spent</span>
            <strong>{formatUsdt(program.dailySpent)}</strong>
          </div>
          <div className="stat">
            <span>Remaining budget</span>
            <strong>{formatUsdt(program.remainingBudget)}</strong>
          </div>
          <div className="stat">
            <span>Status</span>
            <strong>{program.status}</strong>
          </div>
          <div className="stat">
            <span>Review threshold</span>
            <strong>{program.policy.confidenceThreshold.toFixed(2)}</strong>
          </div>
          <div className="stat">
            <span>Max reward</span>
            <strong>{formatUsdt(program.policy.maxReward)}</strong>
          </div>
        </div>

        <div className="grid-two">
          <div className="panel">
            <h3>Reward policy</h3>
            <PolicyForm programId={program.id} policy={program.policy} />
          </div>
          <div className="panel">
            <h3>Bind publisher wallets</h3>
            <ul className="directory-list">
              {creators.map((creator) => {
                const binding = creatorWallet(creator.id, bindings);
                return (
                  <li key={creator.id}>
                    <div>
                      <strong>{creator.displayName}</strong>
                      <span>{creator.headline}</span>
                    </div>
                    <span className={`pill ${binding ? 'pill-success' : 'pill-muted'}`}>
                      {binding ? `${binding.address.slice(0, 10)}...` : 'unbound'}
                    </span>
                  </li>
                );
              })}
            </ul>
            <CreatorWalletForm creators={creators} />
          </div>
        </div>
      </section>

      <section className="grid-two">
        <div className="panel">
          <span className="eyebrow">Publish</span>
          <h2>Add a new skill</h2>
          <SkillRegistrationForm creators={creators} />
        </div>
        <div className="panel">
          <span className="eyebrow">Discover</span>
          <h2>Nominate a skill for tipping</h2>
          <SpotlightForm programId={program.id} skills={skills} />
        </div>
      </section>

      <section id="spotlights" className="card">
        <div className="section-header">
          <div>
            <span className="eyebrow">Discovery feed</span>
            <h2>Interesting skills waiting for a tip decision</h2>
            <p>Every spotlight captures where the skill showed up, why it felt clever, and whether the publisher is ready for payout.</p>
          </div>
        </div>
        <div className="thread-list">
          {spotlights.map((spotlight) => (
            <SpotlightCard key={spotlight.id} bindings={bindings} spotlight={spotlight} />
          ))}
        </div>
      </section>

      <section className="grid-two">
        <div className="panel">
          <h2>Recent rewards</h2>
          <ul className="activity-list">
            {program.recentTips.map((tip) => (
              <li key={tip.id}>
                <strong>{formatUsdt(tip.totalAmount)}</strong>
                <span>{tip.status}</span>
                <p>{tip.summary}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel">
          <h2>Transfer receipts</h2>
          <ul className="activity-list">
            {transfers.map((transfer) => {
              const creator = creators.find((candidate) => candidate.id === transfer.recipientCreatorId);
              return (
                <li key={transfer.id}>
                  <strong>{creator?.displayName ?? transfer.recipientCreatorId}</strong>
                  <span>{formatUsdt(transfer.amount)}</span>
                  {transfer.txHash ? (
                    <a
                      className="explorer-link hash-text"
                      href={explorerUrl(transfer.txHash)}
                      rel="noreferrer"
                      target="_blank"
                      title={transfer.txHash}
                    >
                      {compactHash(transfer.txHash, 10, 8)}
                    </a>
                  ) : (
                    <p className="hash-text">Pending wallet claim</p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </div>
  );
}
