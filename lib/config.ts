function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getAppBaseUrl() {
  return process.env.APP_BASE_URL ?? 'http://localhost:3000';
}

export function getAppDomain() {
  return new URL(getAppBaseUrl()).host;
}

export function getWalletMode() {
  return process.env.RESOLVETIP_WALLET_MODE ?? 'mock';
}

export function getRuntimeChain() {
  return process.env.RESOLVETIP_CHAIN ?? 'sepolia';
}

export function getDefaultTreasuryHdIndex() {
  return Number(process.env.RESOLVETIP_TREASURY_INDEX ?? '0');
}

export function isLiveWalletEnabled() {
  return (
    getWalletMode() === 'live' &&
    Boolean(process.env.WDK_SEED_PHRASE) &&
    Boolean(getSepoliaRpcUrl()) &&
    Boolean(getSepoliaUsdtAddress())
  );
}

export function getWdkSeedPhrase() {
  return requireEnv('WDK_SEED_PHRASE');
}

export function getWdkIndexerConfig() {
  return {
    url: process.env.WDK_INDEXER_API_URL ?? 'https://wdk-api.tether.io',
    apiKey: requireEnv('WDK_INDEXER_API_KEY'),
  };
}

export function getSepoliaChainId() {
  return Number(process.env.SEPOLIA_CHAIN_ID ?? '11155111');
}

export function getSepoliaNetwork() {
  return `eip155:${getSepoliaChainId()}`;
}

export function getSepoliaRpcUrl() {
  return process.env.SEPOLIA_RPC_URL ?? 'https://ethereum-sepolia-rpc.publicnode.com';
}

export function getSepoliaUsdtAddress() {
  return process.env.SEPOLIA_USDT_ADDRESS ?? '0xd077A400968890Eacc75cdc901F0356c943e4fDb';
}

export function getErc20Decimals() {
  return Number(process.env.ERC20_DECIMALS ?? '6');
}

export function getX402Price() {
  return process.env.X402_PRICE_USDT ?? '0.01';
}

export function getX402BuyerIndex() {
  return Number(process.env.X402_BUYER_INDEX ?? '900');
}

export function getOpenAiModel() {
  return process.env.OPENAI_MODEL ?? 'gpt-5.4';
}

export function getOpenAiApiUrl() {
  return process.env.OPENAI_API_URL ?? 'https://api.openai.com/v1/responses';
}

export function hasOpenAiApiKey() {
  return Boolean(process.env.OPENAI_API_KEY);
}
