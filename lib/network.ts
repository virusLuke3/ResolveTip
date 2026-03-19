import { ProxyAgent, setGlobalDispatcher } from 'undici';

declare global {
  // eslint-disable-next-line no-var
  var __resolvetipProxyReady: boolean | undefined;
}

function getProxyUrl() {
  return process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.ALL_PROXY || '';
}

export function ensureServerProxy() {
  if (global.__resolvetipProxyReady) {
    return;
  }

  const proxyUrl = getProxyUrl();
  if (!proxyUrl) {
    global.__resolvetipProxyReady = true;
    return;
  }

  setGlobalDispatcher(new ProxyAgent(proxyUrl));
  global.__resolvetipProxyReady = true;
}
