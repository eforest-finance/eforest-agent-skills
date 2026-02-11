/**
 * Core — buy-seed business logic.
 *
 * Pure logic: no console.log / process.exit. All warnings collected in result.
 * Throws Error on fatal failures.
 */

import type {
  ResolvedConfig,
  BuySeedParams,
  BuySeedResult,
  BuySeedDryRunResult,
  DryRunStep,
} from '../../lib/types';
import { ELF_DECIMALS } from '../../lib/types';
import { callContractSend, callContractView } from '../../lib/aelf-client';
import { fetchSeedInfo } from '../../lib/api-client';

// ============================================================================
// parseSeedSymbolFromLogs
// ============================================================================

/**
 * Parse the real SEED symbol (e.g. "SEED-321") from Buy transaction logs.
 *
 * The SymbolRegister.Buy transaction emits SeedCreated / TokenCreated events.
 * The SEED symbol is encoded as a protobuf string field inside base64-encoded
 * Indexed / NonIndexed log fields. We decode each and regex-match "SEED-\d+".
 */
export function parseSeedSymbolFromLogs(logs: any[]): string | null {
  if (!Array.isArray(logs)) return null;

  const targetNames = ['SeedCreated', 'TokenCreated'];
  const targetLogs = logs.filter((log) => targetNames.includes(log.Name));

  for (const log of targetLogs) {
    const fields = [
      ...(Array.isArray(log.Indexed) ? log.Indexed : []),
      log.NonIndexed,
    ].filter(Boolean);

    for (const b64 of fields) {
      try {
        const decoded = Buffer.from(b64, 'base64').toString('utf-8');
        const match = decoded.match(/SEED-\d+/);
        if (match) return match[0];
      } catch {
        // skip non-decodable fields
      }
    }
  }
  return null;
}

// ============================================================================
// buySeed
// ============================================================================

export async function buySeed(
  config: ResolvedConfig,
  params: BuySeedParams,
  dryRun = false,
): Promise<BuySeedResult | BuySeedDryRunResult> {
  const warnings: string[] = [];

  // Step 0: Query SEED price & availability
  const seedInfo = await fetchSeedInfo(config.apiUrl, params.symbol);
  const priceELF = seedInfo?.tokenPrice?.amount ?? null;
  const priceSymbol = seedInfo?.tokenPrice?.symbol ?? 'ELF';
  const seedStatus = seedInfo?.status ?? null;

  // Pre-flight check: refuse if already registered
  if (seedStatus !== null && seedStatus !== 0) {
    const statusLabels: Record<number, string> = {
      1: 'in auction',
      2: 'already registered/purchased',
    };
    const statusLabel =
      statusLabels[seedStatus] || `unavailable (status=${seedStatus})`;
    const ownerInfo = seedInfo?.owner
      ? ` Current owner: ${seedInfo.owner}.`
      : '';
    const seedSymbolInfo = seedInfo?.seedSymbol
      ? ` Existing SEED: ${seedInfo.seedSymbol}.`
      : '';
    throw new Error(
      `Symbol "${params.symbol}" is ${statusLabel}.${ownerInfo}${seedSymbolInfo} ` +
        `Choose a different symbol name.`,
    );
  }

  const steps: DryRunStep[] = [
    {
      action: 'Query SEED price & availability',
      api: 'GET /app/seed/search-symbol-info',
      params: {
        symbol: params.symbol,
        status: seedStatus ?? 'unknown',
        price:
          priceELF !== null ? `${priceELF} ${priceSymbol}` : 'unknown',
      },
    },
    {
      action: 'Check ELF balance',
      contract: 'MultiToken',
      method: 'GetBalance',
      params: { symbol: 'ELF', owner: config.walletAddress },
    },
    {
      action: 'Approve ELF to SymbolRegister (if needed)',
      contract: 'MultiToken',
      method: 'Approve',
      params: { symbol: 'ELF', spender: '<symbolRegisterMainAddress>' },
    },
    {
      action: 'Buy SEED',
      contract: 'SymbolRegister',
      method: 'Buy',
      params: { symbol: params.symbol, issueTo: params.issueTo },
    },
  ];

  if (dryRun) {
    return {
      dryRun: true,
      priceELF,
      priceSymbol,
      available: seedStatus === 0 || seedStatus === null,
      steps,
    };
  }

  // Price safety check
  if (!params.force && params.force !== 0) {
    const priceStr =
      priceELF !== null
        ? `${priceELF} ${priceSymbol}`
        : 'unknown (API unavailable)';
    throw new Error(
      `SEED price is ${priceStr}. Purchase requires explicit confirmation. ` +
        `Use --force to buy unconditionally, or --force <maxPrice> to set a spending limit (e.g. --force 2 for max 2 ELF).`,
    );
  }
  if (
    typeof params.force === 'number' &&
    priceELF !== null &&
    priceELF > params.force
  ) {
    throw new Error(
      `SEED price is ${priceELF} ${priceSymbol}, exceeding your limit of ${params.force} ELF. ` +
        `Increase --force value or choose a longer symbol (6+ chars are typically ~2 ELF).`,
    );
  }

  const contractAddr = config.contracts.symbolRegisterMainAddress;
  if (!contractAddr) {
    throw new Error('symbolRegisterMainAddress not found in config.');
  }
  const multiTokenAddr = config.contracts.mainChainAddress;
  if (!multiTokenAddr) {
    throw new Error('mainChainAddress not found in config.');
  }

  const rpcUrl = config.rpcUrls['AELF'];

  // Check ELF balance
  if (priceELF !== null) {
    const balance = await callContractView(
      rpcUrl,
      multiTokenAddr,
      'GetBalance',
      { symbol: 'ELF', owner: config.walletAddress },
      config.wallet,
    );
    const balanceELF =
      Number(balance?.balance ?? 0) / 10 ** ELF_DECIMALS;
    if (balanceELF < priceELF) {
      throw new Error(
        `Insufficient ELF balance. Need ${priceELF} ELF but only have ${balanceELF.toFixed(4)} ELF.`,
      );
    }
  }

  // Approve ELF to SymbolRegister (if needed)
  if (priceELF !== null) {
    const priceInSmallUnits = Math.ceil(priceELF * 10 ** ELF_DECIMALS);
    const allowance = await callContractView(
      rpcUrl,
      multiTokenAddr,
      'GetAllowance',
      {
        symbol: 'ELF',
        owner: config.walletAddress,
        spender: contractAddr,
      },
      config.wallet,
    );
    if (Number(allowance?.allowance ?? 0) < priceInSmallUnits) {
      await callContractSend(
        rpcUrl,
        multiTokenAddr,
        'Approve',
        {
          spender: contractAddr,
          symbol: 'ELF',
          amount: String(priceInSmallUnits),
        },
        config.wallet,
      );
    }
  }

  // Buy
  const result = await callContractSend(
    rpcUrl,
    contractAddr,
    'Buy',
    { symbol: params.symbol, issueTo: params.issueTo },
    config.wallet,
  );

  const seedSymbol = parseSeedSymbolFromLogs(result.txResult?.Logs);

  return {
    success: true,
    transactionId: result.TransactionId,
    seedSymbol,
    data: {
      symbol: params.symbol,
      issueTo: params.issueTo,
      priceELF,
      priceSymbol,
    },
    warnings,
  };
}
