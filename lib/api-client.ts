/**
 * @eforest-finance/token-agent-kit — eForest backend API client.
 *
 * Auth, SEED info, save token infos, cross-chain sync, token-exist polling.
 */

import AElf from 'aelf-sdk';
import axios, { type AxiosInstance } from 'axios';

import type {
  SeedPriceInfo,
  SaveTokenInfosParams,
  SyncChainParams,
} from './types';
import { SYNC_POLL_INTERVAL_MS, SYNC_POLL_MAX_RETRIES } from './types';
import { sleep } from './aelf-client';

// ============================================================================
// HTTP Client
// ============================================================================

export function createApiClient(
  baseUrl: string,
  token?: string,
): AxiosInstance {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return axios.create({ baseURL: baseUrl, timeout: 60000, headers });
}

// ============================================================================
// Authentication
// ============================================================================

/**
 * Obtain a bearer token from eForest connect endpoint.
 *
 * FIX(Auth-signature): Must use SHA256 hash (not raw hex) and match web app
 * auth params: client_id=NFTMarketServer_App, scope=NFTMarketServer, version=v2.
 * Reference: src/utils/wallet/login.ts
 *
 * @returns access_token string, or empty string on failure.
 */
export async function fetchAuthToken(
  connectUrl: string,
  wallet: any,
): Promise<string> {
  try {
    const timestamp = Date.now();
    const signInfo = AElf.utils.sha256(`${wallet.address}-${timestamp}`);
    const signature = AElf.wallet
      .sign(signInfo, wallet.keyPair)
      .toString('hex');

    const resp = await axios.post(
      `${connectUrl}/token`,
      new URLSearchParams({
        grant_type: 'signature',
        scope: 'NFTMarketServer',
        client_id: 'NFTMarketServer_App',
        pubkey: wallet.keyPair.getPublic('hex'),
        signature,
        timestamp: String(timestamp),
        version: 'v2',
        source: 'nightElf',
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );
    return resp.data?.access_token || '';
  } catch {
    return '';
  }
}

// ============================================================================
// SEED Info
// ============================================================================

/**
 * Query SEED price & availability from eForest backend.
 *
 * FIX(tokenType): The search-symbol-info API requires tokenType='FT' to
 * return FT SEED pricing. Without it the API returns null.
 */
export async function fetchSeedInfo(
  apiUrl: string,
  symbol: string,
  tokenType: string = 'FT',
): Promise<SeedPriceInfo | null> {
  try {
    const resp = await axios.get(`${apiUrl}/app/seed/search-symbol-info`, {
      params: { symbol, tokenType },
    });
    return resp.data?.data || resp.data || null;
  } catch {
    return null;
  }
}

// ============================================================================
// Token Info Save & Sync
// ============================================================================

export async function saveTokenInfos(
  api: AxiosInstance,
  params: SaveTokenInfosParams,
): Promise<void> {
  await api.post('/app/nft/nft-infos', params);
}

export async function syncToken(
  api: AxiosInstance,
  params: SyncChainParams,
): Promise<void> {
  await api.post('/app/nft/sync', params);
}

export async function getSyncResult(
  api: AxiosInstance,
  params: SyncChainParams,
): Promise<{ status: string }> {
  const resp = await api.get('/app/nft/syncResult', { params });
  return resp.data;
}

export async function getTokenExist(
  api: AxiosInstance,
  params: { IssueChainId: string; TokenSymbol: string },
): Promise<{ exist: boolean }> {
  const resp = await api.get('/app/token/token-exist', { params });
  return resp.data;
}

// ============================================================================
// Sync Polling Loops
// ============================================================================

/**
 * Poll backend syncResult endpoint for cross-chain sync status.
 * Used as a secondary check behind token-exist endpoint.
 */
export async function synchronizeLoop(
  api: AxiosInstance,
  params: SyncChainParams,
): Promise<boolean> {
  for (let i = 0; i < SYNC_POLL_MAX_RETRIES; i++) {
    try {
      const result = await getSyncResult(api, params);
      if (result?.status === 'CrossChainTokenCreated') return true;
      if (result?.status === 'Failed') return false;
    } catch {
      // continue polling
    }
    await sleep(SYNC_POLL_INTERVAL_MS);
  }
  throw new Error(
    `Cross-chain sync timed out after ${SYNC_POLL_MAX_RETRIES} retries ` +
      `(~${Math.round((SYNC_POLL_MAX_RETRIES * SYNC_POLL_INTERVAL_MS) / 60000)} min).`,
  );
}

/**
 * Poll token-exist endpoint (primary sync check).
 */
export async function syncResultExistLoop(
  api: AxiosInstance,
  issueChainId: string,
  tokenSymbol: string,
): Promise<boolean> {
  for (let i = 0; i < SYNC_POLL_MAX_RETRIES; i++) {
    try {
      const result = await getTokenExist(api, {
        IssueChainId: issueChainId,
        TokenSymbol: tokenSymbol,
      });
      if (result?.exist) return true;
    } catch {
      // continue polling
    }
    await sleep(SYNC_POLL_INTERVAL_MS);
  }
  throw new Error(
    `Token existence check timed out after ${SYNC_POLL_MAX_RETRIES} retries ` +
      `(~${Math.round((SYNC_POLL_MAX_RETRIES * SYNC_POLL_INTERVAL_MS) / 60000)} min).`,
  );
}
