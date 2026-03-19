import { RewardProgram, RewardRecipient, TipEvent, TipTransfer } from '@/lib/types';
import {
  getErc20Decimals,
  getSepoliaRpcUrl,
  getSepoliaUsdtAddress,
  getWalletMode,
  getWdkSeedPhrase,
  isLiveWalletEnabled,
} from '@/lib/config';
import { ensureServerProxy } from '@/lib/network';
import { nowIso, randomId, shortHash } from '@/lib/utils';

type TransferExecution = {
  transfers: TipTransfer[];
  status: TipEvent['status'];
  confirmedAmount: number;
  currentBalance?: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __skilltipWdk: unknown;
}

function toBaseUnits(amount: number) {
  return BigInt(Math.round(amount * 10 ** getErc20Decimals()));
}

function fromBaseUnits(amount: bigint) {
  return Number(amount) / 10 ** getErc20Decimals();
}

function getMockTreasuryAddress(hdIndex: number) {
  return `0xskill${hdIndex.toString().padStart(35, '0')}`;
}

async function getWdkInstance() {
  ensureServerProxy();
  if (!isLiveWalletEnabled()) {
    return null;
  }

  if (!global.__skilltipWdk) {
    const [{ default: WDK }, { default: WalletManagerEvm }] = await Promise.all([
      import('@tetherto/wdk'),
      import('@tetherto/wdk-wallet-evm'),
    ]);

    global.__skilltipWdk = new WDK(getWdkSeedPhrase()).registerWallet('sepolia', WalletManagerEvm, {
      provider: getSepoliaRpcUrl(),
    });
  }

  return global.__skilltipWdk as {
    getAccount: (
      blockchain: string,
      index: number,
    ) => Promise<{
      getAddress: () => Promise<string>;
      getTokenBalance: (tokenAddress: string) => Promise<bigint>;
      transfer: (options: { token: string; recipient: string; amount: bigint }) => Promise<{ hash: string }>;
    }>;
  };
}

async function getLiveAccount(hdIndex: number) {
  const wdk = await getWdkInstance();
  if (!wdk) {
    throw new Error('Live WDK mode is not configured.');
  }
  return await wdk.getAccount('sepolia', hdIndex);
}

export async function resolveTreasuryAddress(hdIndex: number) {
  if (!isLiveWalletEnabled()) {
    return getMockTreasuryAddress(hdIndex);
  }

  const account = await getLiveAccount(hdIndex);
  return await account.getAddress();
}

export async function getProgramTreasuryBalance(program: RewardProgram) {
  if (!isLiveWalletEnabled()) {
    return program.treasuryBalance;
  }

  const account = await getLiveAccount(program.hdIndex);
  const balance = await account.getTokenBalance(getSepoliaUsdtAddress());
  return Number(fromBaseUnits(balance).toFixed(6));
}

export async function executeRewardTransfers(params: {
  program: RewardProgram;
  tipEvent: TipEvent;
  recipients: RewardRecipient[];
}): Promise<TransferExecution> {
  const { program, tipEvent, recipients } = params;

  if (!isLiveWalletEnabled()) {
    const transfers = recipients.map((recipient) => {
      const pending = recipient.status === 'pending_claim';
      return {
        id: randomId('transfer'),
        tipEventId: tipEvent.id,
        recipientCreatorId: recipient.creatorId,
        recipientAddress: recipient.address,
        amount: recipient.amount,
        txHash: pending ? null : shortHash('0x'),
        status: pending ? 'pending_claim' : 'confirmed',
        reason: recipient.reason,
        createdAt: nowIso(),
      } satisfies TipTransfer;
    });

    const confirmedAmount = transfers
      .filter((transfer) => transfer.status === 'confirmed')
      .reduce((total, transfer) => total + transfer.amount, 0);

    return {
      transfers,
      status: transfers.some((transfer) => transfer.status === 'pending_claim') ? 'partial_pending' : 'confirmed',
      confirmedAmount,
      currentBalance: Number((program.treasuryBalance - confirmedAmount).toFixed(6)),
    };
  }

  const account = await getLiveAccount(program.hdIndex);
  const transfers: TipTransfer[] = [];

  for (const recipient of recipients) {
    if (recipient.status === 'pending_claim' || !recipient.address) {
      transfers.push({
        id: randomId('transfer'),
        tipEventId: tipEvent.id,
        recipientCreatorId: recipient.creatorId,
        recipientAddress: null,
        amount: recipient.amount,
        txHash: null,
        status: 'pending_claim',
        reason: recipient.reason,
        createdAt: nowIso(),
      });
      continue;
    }

    const result = await account.transfer({
      token: getSepoliaUsdtAddress(),
      recipient: recipient.address,
      amount: toBaseUnits(recipient.amount),
    });

    transfers.push({
      id: randomId('transfer'),
      tipEventId: tipEvent.id,
      recipientCreatorId: recipient.creatorId,
      recipientAddress: recipient.address,
      amount: recipient.amount,
      txHash: result.hash,
      status: 'confirmed',
      reason: recipient.reason,
      createdAt: nowIso(),
    });
  }

  const confirmedAmount = transfers
    .filter((transfer) => transfer.status === 'confirmed')
    .reduce((total, transfer) => total + transfer.amount, 0);

  return {
    transfers,
    status: transfers.some((transfer) => transfer.status === 'pending_claim') ? 'partial_pending' : 'confirmed',
    confirmedAmount,
    currentBalance: await getProgramTreasuryBalance(program),
  };
}

export function getResolvedWalletMode() {
  return isLiveWalletEnabled() ? 'live' : getWalletMode();
}
