/**
 * Core — issue-token business logic.
 *
 * Pure logic: no console.log / process.exit. All warnings collected in result.
 * Throws Error on fatal failures.
 *
 * Because TokenAdapter creates a proxy account as the on-chain issuer,
 * direct MultiToken.Issue calls fail with "No permission". Instead we:
 *   1. GetTokenInfo → find the proxy issuer address
 *   2. GetProxyAccountByProxyAccountAddress → get proxyAccountHash
 *   3. Encode IssueInput via protobuf
 *   4. Call ProxyContract.ForwardCall to relay the Issue call
 */

import AElf from 'aelf-sdk';

import type {
  ResolvedConfig,
  IssueTokenParams,
  IssueTokenResult,
  IssueTokenDryRunResult,
  IssueInput,
  DryRunStep,
} from '../../lib/types';
import { ISSUE_INPUT_PROTO_DEF } from '../../lib/types';
import { callContractSend, callContractView } from '../../lib/aelf-client';

// ============================================================================
// encodeIssueInput
// ============================================================================

/**
 * Encode IssueInput into protobuf bytes for use in Proxy ForwardCall.
 */
export function encodeIssueInput(params: IssueInput): Uint8Array {
  const root = AElf.pbjs.Root.fromJSON(ISSUE_INPUT_PROTO_DEF);
  const IssueInputType = root.lookupType('token.IssueInput');
  const resolved = IssueInputType.resolveAll();

  const { transform } = AElf.utils;
  let input = transform.transformMapToArray(resolved, params);
  input = transform.transform(
    resolved,
    input,
    AElf.utils.transform.INPUT_TRANSFORMERS,
  );
  const message = resolved.create(input);
  return resolved.encode(message).finish();
}

// ============================================================================
// issueToken
// ============================================================================

export async function issueToken(
  config: ResolvedConfig,
  opts: IssueTokenParams,
  dryRun = false,
): Promise<IssueTokenResult | IssueTokenDryRunResult> {
  const warnings: string[] = [];
  const chain = opts.chain;

  const issueParams: IssueInput = {
    symbol: opts.symbol,
    amount: opts.amount,
    to: opts.to,
    memo: opts.memo || '',
  };

  const multiTokenAddr =
    chain === 'AELF'
      ? config.contracts.mainChainAddress
      : config.contracts.sideChainAddress;

  const proxyAddr =
    chain === 'AELF'
      ? config.contracts.proxyMainAddress
      : config.contracts.proxySideAddress;

  const steps: DryRunStep[] = [
    {
      action: 'Get token info (find proxy issuer)',
      contract: 'MultiToken',
      method: 'GetTokenInfo',
      params: { symbol: opts.symbol },
    },
    {
      action: 'Get proxy account hash',
      contract: 'ProxyAccount',
      method: 'GetProxyAccountByProxyAccountAddress',
      params: { address: opts.issuer || '<proxyIssuerFromTokenInfo>' },
    },
    {
      action: 'Encode IssueInput and ForwardCall via Proxy',
      contract: 'ProxyAccount',
      method: 'ForwardCall',
      params: {
        proxyAccountHash: '<fromStep2>',
        contractAddress: multiTokenAddr || '<multiTokenAddress>',
        methodName: 'Issue',
        args: '<encodedIssueInput>',
      },
    },
  ];

  if (dryRun) {
    return { dryRun: true, steps };
  }

  // Validate contract addresses
  if (!multiTokenAddr) {
    throw new Error(
      `MultiToken contract address not found for chain "${chain}".`,
    );
  }
  if (!proxyAddr) {
    throw new Error(
      `Proxy contract address not found for chain "${chain}". ` +
        `Ensure proxyMainAddress / proxySideAddress is configured in CMS.`,
    );
  }

  const rpcUrl = config.rpcUrls[chain];
  if (!rpcUrl) {
    throw new Error(`RPC URL not configured for chain "${chain}".`);
  }

  // Step 1: Determine the proxy issuer address
  let proxyIssuerAddress = opts.issuer;
  if (!proxyIssuerAddress) {
    const tokenInfo = await callContractView(
      rpcUrl,
      multiTokenAddr,
      'GetTokenInfo',
      { symbol: opts.symbol },
    );
    proxyIssuerAddress =
      typeof tokenInfo?.issuer === 'string' ? tokenInfo.issuer : '';
    if (!proxyIssuerAddress) {
      throw new Error(
        `Cannot find issuer for token "${opts.symbol}" on chain "${chain}". ` +
          `Token may not exist on this chain yet. Provide --issuer explicitly.`,
      );
    }
  }

  // Step 2: Get proxy account hash
  const proxyAccountResult = await callContractView(
    rpcUrl,
    proxyAddr,
    'GetProxyAccountByProxyAccountAddress',
    proxyIssuerAddress,
  );

  const proxyAccountHash = proxyAccountResult?.proxyAccountHash;
  if (!proxyAccountHash) {
    throw new Error(
      `Failed to get proxy account hash for issuer "${proxyIssuerAddress}". ` +
        `This address may not be a proxy account.`,
    );
  }

  // Step 3: Encode IssueInput and call ForwardCall via Proxy
  const encodedArgs = encodeIssueInput(issueParams);

  const result = await callContractSend(
    rpcUrl,
    proxyAddr,
    'ForwardCall',
    {
      proxyAccountHash,
      contractAddress: multiTokenAddr,
      methodName: 'Issue',
      args: Buffer.from(encodedArgs).toString('base64'),
    },
    config.signer,
  );

  return {
    success: true,
    transactionId: result.TransactionId,
    proxyIssuer: proxyIssuerAddress,
    proxyAccountHash:
      typeof proxyAccountHash === 'string'
        ? proxyAccountHash
        : proxyAccountHash?.value
          ? Buffer.from(proxyAccountHash.value).toString('hex')
          : JSON.stringify(proxyAccountHash),
    data: issueParams,
    warnings,
  };
}
