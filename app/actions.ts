'use server';

import { revalidatePath } from 'next/cache';
import { bindCreatorWallet, registerSkill, rewardSpotlight, runDiscoveryAgent, submitSpotlight, updatePolicySettings } from '@/lib/resolvetip';

function numberField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? Number(value) : NaN;
}

function booleanField(formData: FormData, key: string) {
  return formData.get(key) === 'on';
}

export async function registerSkillAction(formData: FormData) {
  await registerSkill({
    creatorId: String(formData.get('creatorId') ?? ''),
    name: String(formData.get('name') ?? ''),
    tagline: String(formData.get('tagline') ?? ''),
    description: String(formData.get('description') ?? ''),
    category: String(formData.get('category') ?? ''),
    repoUrl: String(formData.get('repoUrl') ?? ''),
  });
  revalidatePath('/');
  revalidatePath('/audit');
}

export async function updatePolicyAction(formData: FormData) {
  const programId = String(formData.get('programId') ?? '');
  await updatePolicySettings(programId, {
    baseReward: numberField(formData, 'baseReward'),
    minReward: numberField(formData, 'minReward'),
    maxReward: numberField(formData, 'maxReward'),
    dailyBudget: numberField(formData, 'dailyBudget'),
    confidenceThreshold: numberField(formData, 'confidenceThreshold'),
    autoApproveThreshold: numberField(formData, 'autoApproveThreshold'),
    maxRewardsPerDayPerCreator: numberField(formData, 'maxRewardsPerDayPerCreator'),
    allowPendingClaims: booleanField(formData, 'allowPendingClaims'),
    autopilotEnabled: booleanField(formData, 'autopilotEnabled'),
    enabled: booleanField(formData, 'enabled'),
  });
  revalidatePath('/');
  revalidatePath('/audit');
}

export async function bindCreatorWalletAction(formData: FormData) {
  await bindCreatorWallet({
    creatorId: String(formData.get('creatorId') ?? ''),
    address: String(formData.get('address') ?? ''),
  });
  revalidatePath('/');
  revalidatePath('/audit');
}

export async function submitSpotlightAction(formData: FormData) {
  await submitSpotlight({
    programId: String(formData.get('programId') ?? ''),
    skillId: String(formData.get('skillId') ?? ''),
    submittedBy: String(formData.get('submittedBy') ?? ''),
    context: String(formData.get('context') ?? ''),
    whyInteresting: String(formData.get('whyInteresting') ?? ''),
    usageSignal: numberField(formData, 'usageSignal'),
  });
  revalidatePath('/');
  revalidatePath('/audit');
}

export async function rewardSpotlightAction(formData: FormData) {
  await rewardSpotlight({
    spotlightId: String(formData.get('spotlightId') ?? ''),
  });
  revalidatePath('/');
  revalidatePath('/audit');
}

export async function runDiscoveryAgentAction(formData: FormData) {
  await runDiscoveryAgent({
    programId: String(formData.get('programId') ?? ''),
  });
  revalidatePath('/');
  revalidatePath('/audit');
}
