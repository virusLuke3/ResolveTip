import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DemoState } from '@/lib/types';

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const dataDirectory = path.resolve(moduleDirectory, '../data');
const defaultDataFile = path.join(dataDirectory, 'demo-state.json');

function getDataFilePath() {
  const configured = process.env.RESOLVETIP_DATA_FILE;
  if (!configured) return defaultDataFile;
  if (path.isAbsolute(configured)) return configured;
  return path.join(dataDirectory, path.basename(configured));
}

async function ensureFile() {
  const dataFile = getDataFilePath();
  await fs.mkdir(path.dirname(dataFile), { recursive: true });

  try {
    await fs.access(dataFile);
  } catch {
    const seedContent = await fs.readFile(defaultDataFile, 'utf8');
    await fs.writeFile(dataFile, seedContent, 'utf8');
  }
}

export async function readState(): Promise<DemoState> {
  await ensureFile();
  const raw = await fs.readFile(getDataFilePath(), 'utf8');
  const parsed = JSON.parse(raw) as Partial<DemoState>;

  return {
    programs: parsed.programs ?? [],
    rewardPolicies: parsed.rewardPolicies ?? [],
    creators: parsed.creators ?? [],
    skills: parsed.skills ?? [],
    walletBindings: parsed.walletBindings ?? [],
    skillSignals: parsed.skillSignals ?? [],
    skillSpotlights: parsed.skillSpotlights ?? [],
    discoveryRuns: parsed.discoveryRuns ?? [],
    rewardDecisions: parsed.rewardDecisions ?? [],
    tipEvents: parsed.tipEvents ?? [],
    tipTransfers: parsed.tipTransfers ?? [],
    auditLogs: parsed.auditLogs ?? [],
  };
}

export async function writeState(state: DemoState) {
  await ensureFile();
  const dataFile = getDataFilePath();
  const tmpPath = `${dataFile}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(state, null, 2), 'utf8');
  await fs.rename(tmpPath, dataFile);
}

export async function updateState(updater: (state: DemoState) => DemoState | Promise<DemoState>) {
  const state = await readState();
  const nextState = await updater(state);
  await writeState(nextState);
  return nextState;
}
