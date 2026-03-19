import fs from 'fs';
import path from 'path';

import WDK from '@tetherto/wdk';
import WalletManagerEvm from '@tetherto/wdk-wallet-evm';

function loadDotEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1);
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = args[index + 1];
    if (next && !next.startsWith('--')) {
      parsed[key] = next;
      index += 1;
    } else {
      parsed[key] = 'true';
    }
  }

  return parsed;
}

function toBaseUnits(amount, decimals) {
  return BigInt(Math.round(amount * 10 ** decimals));
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${typeof body === 'string' ? body : JSON.stringify(body)}`);
  }

  return body;
}

async function pollIndexerForTransfer({ baseUrl, apiKey, address, txHash, attempts, delayMs }) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const data = await fetchJson(`${baseUrl}/api/v1/sepolia/usdt/${address}/token-transfers?limit=20`, {
      headers: {
        'x-api-key': apiKey,
      },
    });

    const transfers = Array.isArray(data?.transfers) ? data.transfers : [];
    const match = transfers.find((transfer) => String(transfer.transactionHash).toLowerCase() === txHash.toLowerCase());
    if (match) {
      return match;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return null;
}

async function main() {
  loadDotEnv();

  const args = parseArgs();
  const recipient = args.recipient;
  const amount = Number(args.amount ?? '0.01');
  const hdIndex = Number(args.index ?? '12');
  const decimals = Number(process.env.ERC20_DECIMALS ?? '6');
  const rpcUrl = process.env.SEPOLIA_RPC_URL ?? 'https://ethereum-sepolia-rpc.publicnode.com';
  const chainId = Number(process.env.SEPOLIA_CHAIN_ID ?? '11155111');
  const tokenAddress = process.env.SEPOLIA_USDT_ADDRESS ?? '0xd077A400968890Eacc75cdc901F0356c943e4fDb';
  const indexerUrl = process.env.WDK_INDEXER_API_URL ?? 'https://wdk-api.tether.io';
  const indexerKey = process.env.WDK_INDEXER_API_KEY ?? '';

  if (!recipient || !recipient.startsWith('0x') || recipient.length !== 42) {
    throw new Error('Pass a recipient with --recipient 0x... to run a real Sepolia USDT transfer.');
  }

  requireEnv('WDK_SEED_PHRASE');

  const wdk = new WDK(process.env.WDK_SEED_PHRASE).registerWallet('sepolia', WalletManagerEvm, {
    provider: rpcUrl,
  });

  const account = await wdk.getAccount('sepolia', hdIndex);
  const treasuryAddress = await account.getAddress();
  const balanceBeforeRaw = await account.getTokenBalance(tokenAddress);
  const balanceBefore = Number(balanceBeforeRaw) / 10 ** decimals;

  console.log(JSON.stringify({
    chain: 'sepolia',
    chainId,
    treasuryAddress,
    recipient,
    tokenAddress,
    amount,
    balanceBefore,
  }, null, 2));

  if (balanceBefore < amount) {
    throw new Error(`Treasury balance ${balanceBefore} is below requested transfer amount ${amount}.`);
  }

  const result = await account.transfer({
    token: tokenAddress,
    recipient,
    amount: toBaseUnits(amount, decimals),
  });

  console.log(JSON.stringify({
    broadcast: 'submitted',
    txHash: result.hash,
  }, null, 2));

  if (indexerKey) {
    const match = await pollIndexerForTransfer({
      baseUrl: indexerUrl,
      apiKey: indexerKey,
      address: recipient,
      txHash: result.hash,
      attempts: 8,
      delayMs: 4000,
    });

    console.log(JSON.stringify({
      indexerVerified: Boolean(match),
      indexerTransfer: match,
    }, null, 2));
  } else {
    console.log('WDK_INDEXER_API_KEY not set, skipping transfer verification.');
  }

  const balanceAfterRaw = await account.getTokenBalance(tokenAddress);
  const balanceAfter = Number(balanceAfterRaw) / 10 ** decimals;

  console.log(JSON.stringify({
    balanceAfter,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
