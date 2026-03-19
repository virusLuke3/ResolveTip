import {
  bindCreatorWalletAction,
  registerSkillAction,
  rewardSpotlightAction,
  runDiscoveryAgentAction,
  submitSpotlightAction,
  updatePolicyAction,
} from '@/app/actions';
import { Creator, RewardPolicy, Skill, SpotlightWithRelations } from '@/lib/types';

export function PolicyForm({ programId, policy }: { programId: string; policy: RewardPolicy }) {
  return (
    <form action={updatePolicyAction} className="stack">
      <input name="programId" type="hidden" value={programId} />
      <div className="field-grid dense">
        <label>
          <span>Base reward</span>
          <input name="baseReward" defaultValue={policy.baseReward} min="0.1" step="0.1" type="number" />
        </label>
        <label>
          <span>Min reward</span>
          <input name="minReward" defaultValue={policy.minReward} min="0.1" step="0.1" type="number" />
        </label>
        <label>
          <span>Max reward</span>
          <input name="maxReward" defaultValue={policy.maxReward} min="0.1" step="0.1" type="number" />
        </label>
        <label>
          <span>Daily budget</span>
          <input name="dailyBudget" defaultValue={policy.dailyBudget} min="1" step="1" type="number" />
        </label>
        <label>
          <span>Confidence threshold</span>
          <input
            name="confidenceThreshold"
            defaultValue={policy.confidenceThreshold}
            max="1"
            min="0.1"
            step="0.01"
            type="number"
          />
        </label>
        <label>
          <span>Autopilot threshold</span>
          <input
            name="autoApproveThreshold"
            defaultValue={policy.autoApproveThreshold}
            max="1"
            min="0.1"
            step="0.01"
            type="number"
          />
        </label>
        <label>
          <span>Creator/day limit</span>
          <input
            name="maxRewardsPerDayPerCreator"
            defaultValue={policy.maxRewardsPerDayPerCreator}
            min="1"
            step="1"
            type="number"
          />
        </label>
      </div>
      <div className="inline-toggles">
        <label className="checkbox">
          <input defaultChecked={policy.enabled} name="enabled" type="checkbox" />
          <span>Enable live rewards</span>
        </label>
        <label className="checkbox">
          <input defaultChecked={policy.autopilotEnabled} name="autopilotEnabled" type="checkbox" />
          <span>Enable autonomous discovery</span>
        </label>
        <label className="checkbox">
          <input defaultChecked={policy.allowPendingClaims} name="allowPendingClaims" type="checkbox" />
          <span>Allow wallet-claim queue</span>
        </label>
      </div>
      <button className="button" type="submit">
        Save reward policy
      </button>
    </form>
  );
}

export function CreatorWalletForm({ creators }: { creators: Creator[] }) {
  return (
    <form action={bindCreatorWalletAction} className="stack">
      <div className="field-grid">
        <label>
          <span>Creator</span>
          <select defaultValue={creators[0]?.id} name="creatorId">
            {creators.map((creator) => (
              <option key={creator.id} value={creator.id}>
                {creator.displayName}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Sepolia wallet</span>
          <input name="address" defaultValue="0x43587B0F79fc341B62FaA73c5533A6Ea6dE0EF8B" required />
        </label>
      </div>
      <button className="button" type="submit">
        Bind creator payout wallet
      </button>
    </form>
  );
}

export function SkillRegistrationForm({ creators }: { creators: Creator[] }) {
  return (
    <form action={registerSkillAction} className="stack">
      <div className="field-grid">
        <label>
          <span>Publisher</span>
          <select defaultValue={creators[0]?.id} name="creatorId">
            {creators.map((creator) => (
              <option key={creator.id} value={creator.id}>
                {creator.displayName}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Skill name</span>
          <input name="name" defaultValue="Schema Guardrail Critic" required />
        </label>
        <label>
          <span>Tagline</span>
          <input name="tagline" defaultValue="Turns flaky agent outputs into structured safe retries." required />
        </label>
        <label>
          <span>Category</span>
          <input name="category" defaultValue="Evaluation" required />
        </label>
      </div>
      <label>
        <span>Repo URL</span>
        <input name="repoUrl" defaultValue="https://github.com/your-org/schema-guardrail-critic" required />
      </label>
      <label>
        <span>Description</span>
        <textarea
          name="description"
          defaultValue="A reusable skill that scores agent outputs against a schema, produces repair prompts, and feeds a retry plan back into the workflow."
          rows={4}
          required
        />
      </label>
      <button className="button" type="submit">
        Publish skill
      </button>
    </form>
  );
}

export function SpotlightForm({ programId, skills }: { programId: string; skills: Skill[] }) {
  return (
    <form action={submitSpotlightAction} className="stack">
      <input name="programId" type="hidden" value={programId} />
      <div className="field-grid">
        <label>
          <span>Interesting skill</span>
          <select defaultValue={skills[0]?.id} name="skillId">
            {skills.map((skill) => (
              <option key={skill.id} value={skill.id}>
                {skill.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Submitted by</span>
          <input name="submittedBy" defaultValue="hackathon scout" required />
        </label>
        <label>
          <span>Usage signal</span>
          <input name="usageSignal" defaultValue="72" min="1" max="100" step="1" type="number" />
        </label>
      </div>
      <label>
        <span>Observed context</span>
        <textarea
          name="context"
          defaultValue="We used this skill inside a multi-agent support workflow and it consistently turned ambiguous outputs into reusable action plans."
          rows={3}
          required
        />
      </label>
      <label>
        <span>Why it deserves a tip</span>
        <textarea
          name="whyInteresting"
          defaultValue="The design is composable, easy to drop into other agent stacks, and saves repeated prompt engineering every time a tool call returns messy JSON."
          rows={4}
          required
        />
      </label>
      <button className="button button-primary" type="submit">
        Nominate this skill
      </button>
    </form>
  );
}

export function RewardSpotlightForm({ spotlight }: { spotlight: SpotlightWithRelations }) {
  return (
    <form action={rewardSpotlightAction} className="thread-cta">
      <input name="spotlightId" type="hidden" value={spotlight.id} />
      <button className="button button-primary" type="submit">
        Review and tip publisher
      </button>
    </form>
  );
}

export function RunDiscoveryAgentForm({ programId }: { programId: string }) {
  return (
    <form action={runDiscoveryAgentAction} className="thread-cta">
      <input name="programId" type="hidden" value={programId} />
      <button className="button button-primary" type="submit">
        Run discovery agent
      </button>
    </form>
  );
}
