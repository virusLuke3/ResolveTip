import { getOpenAiApiUrl, getOpenAiModel, hasOpenAiApiKey } from '@/lib/config';
import { ensureServerProxy } from '@/lib/network';
import { RewardDecision, RewardPolicy, Skill, SkillSpotlight, Creator } from '@/lib/types';
import { nowIso, randomId } from '@/lib/utils';

type EvaluateParams = {
  spotlight: SkillSpotlight;
  skill: Skill;
  creator: Creator;
  policy: RewardPolicy;
};

function buildPrompt(params: EvaluateParams) {
  const { spotlight, skill, creator, policy } = params;
  return [
    {
      role: 'system',
      content:
        'You are SkillTip, a conservative reward judge for AI agent skills. Reward only if the submission describes a genuinely interesting, reusable, differentiated skill design worth tipping the publisher. Return JSON only.',
    },
    {
      role: 'user',
      content: JSON.stringify({
        policy: {
          chain: policy.chain,
          asset: policy.asset,
          base_reward: policy.baseReward,
          min_reward: policy.minReward,
          max_reward: policy.maxReward,
          confidence_threshold: policy.confidenceThreshold,
        },
        creator: {
          id: creator.id,
          display_name: creator.displayName,
          headline: creator.headline,
        },
        skill: {
          id: skill.id,
          name: skill.name,
          tagline: skill.tagline,
          category: skill.category,
          description: skill.description,
          repo_url: skill.repoUrl,
        },
        spotlight: {
          id: spotlight.id,
          submitted_by: spotlight.submittedBy,
          source: spotlight.source,
          context: spotlight.context,
          why_interesting: spotlight.whyInteresting,
          usage_signal: spotlight.usageSignal,
        },
        response_schema: {
          approved: 'boolean',
          confidence: 'number 0..1',
          novelty_score: 'number 0..1',
          recommended_amount: 'number',
          summary: 'short explanation',
        },
      }),
    },
  ];
}

function extractJson(text: string) {
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }
  return text;
}

async function requestViaChatCompletions(params: EvaluateParams) {
  ensureServerProxy();
  const baseUrl = getOpenAiApiUrl();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured.');
  }

  const isRightCodes = baseUrl.includes('/chat/completions') || baseUrl.includes('right.codes');
  const url = isRightCodes ? baseUrl.replace(/\/responses$/, '/chat/completions') : baseUrl;
  const body = url.includes('/chat/completions')
    ? {
        model: getOpenAiModel(),
        stream: false,
        messages: buildPrompt(params),
        response_format: {
          type: 'json_object',
        },
      }
    : {
        model: getOpenAiModel(),
        stream: false,
        input: [
          {
            type: 'message',
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: `${buildPrompt(params)[0]?.content ?? ''}\n\n${buildPrompt(params)[1]?.content ?? ''}`,
              },
            ],
          },
        ],
      };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${text}`);
  }

  const payload = await response.json();

  if ('choices' in payload) {
    const text = payload.choices?.[0]?.message?.content ?? '';
    return extractJson(text);
  }

  if ('output_text' in payload && typeof payload.output_text === 'string') {
    return extractJson(payload.output_text);
  }

  const outputText = payload.output
    ?.flatMap((item: { content?: Array<{ text?: string }> }) => item.content ?? [])
    ?.map((item: { text?: string }) => item.text ?? '')
    ?.join(' ');

  if (outputText) {
    return extractJson(outputText);
  }

  throw new Error('OpenAI response did not include readable text.');
}

export function evaluateSpotlightHeuristically(params: EvaluateParams): RewardDecision {
  const { spotlight, skill, creator, policy } = params;
  const text = `${spotlight.context} ${spotlight.whyInteresting} ${skill.description}`.toLowerCase();
  const hasInterestingSignals =
    /(workflow|reusable|orchestr|agent|evaluation|guardrail|memory|tooling|publish|distribution|automation)/.test(text) &&
    (spotlight.whyInteresting.length > 60 || spotlight.usageSignal >= 55);

  const noveltyScore = Number(
    Math.min(1, 0.35 + spotlight.usageSignal / 140 + (spotlight.whyInteresting.length > 120 ? 0.2 : 0)).toFixed(2),
  );
  const approved = hasInterestingSignals;
  const confidence = approved ? 0.82 : 0.41;
  const recommendedAmount = Number(
    Math.min(policy.maxReward, Math.max(policy.minReward, policy.baseReward + noveltyScore)).toFixed(2),
  );

  return {
    id: randomId('decision'),
    spotlightId: spotlight.id,
    approved,
    confidence,
    noveltyScore,
    recommendedAmount,
    summary: approved
      ? `${skill.name} looks like a differentiated skill pattern and ${creator.displayName} should be rewarded.`
      : 'The nomination does not yet demonstrate a sufficiently novel or reusable skill design.',
    modelName: 'heuristic-skill-judge-v1',
    createdAt: nowIso(),
  };
}

export async function evaluateSpotlight(params: EvaluateParams): Promise<RewardDecision> {
  if (!hasOpenAiApiKey()) {
    return evaluateSpotlightHeuristically(params);
  }

  try {
    const parsed = JSON.parse(await requestViaChatCompletions(params)) as {
      approved: boolean;
      confidence: number;
      novelty_score: number;
      recommended_amount: number;
      summary: string;
    };

    return {
      id: randomId('decision'),
      spotlightId: params.spotlight.id,
      approved: Boolean(parsed.approved),
      confidence: Number(parsed.confidence ?? 0),
      noveltyScore: Number(parsed.novelty_score ?? 0),
      recommendedAmount: Number(parsed.recommended_amount ?? params.policy.baseReward),
      summary: parsed.summary ?? 'OpenAI returned no summary.',
      modelName: getOpenAiModel(),
      createdAt: nowIso(),
    };
  } catch {
    return evaluateSpotlightHeuristically(params);
  }
}
