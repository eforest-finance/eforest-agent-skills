#!/usr/bin/env bun
/**
 * @eforest-finance/token-agent-kit — CLI Adapter
 *
 * Thin CLI wrapper around core functions. All business logic lives in src/core/.
 *
 * Usage:
 *   bun run create_token_skill.ts <command> [options]
 *
 * Commands:
 *   buy-seed      Purchase a SEED from SymbolRegister contract
 *   create-token  Create a new FT token using an owned SEED
 *   issue-token   Issue tokens to an address
 */

import { Command } from 'commander';

// Bootstrap: load .env before anything else
import { loadEnvFile, getNetworkConfig } from './lib/config';
loadEnvFile();

// Core functions (pure business logic)
import { buySeed } from './src/core/seed';
import { createToken } from './src/core/token';
import { issueToken } from './src/core/issue';

// Validation helpers (pure functions)
import {
  validateBuySeedParams,
  validateCreateTokenParams,
  validateIssueTokenParams,
} from './lib/types';

// ============================================================================
// CLI Output Helpers
// ============================================================================

export function formatOutput(result: any): string {
  return JSON.stringify(result);
}

export function formatError(err: any): string {
  if (typeof err === 'string') return `[ERROR] ${err}`;
  if (err == null) return '[ERROR] Unknown error';
  const msg =
    err?.message ||
    err?.errorMessage?.message ||
    err?.Error ||
    (typeof err === 'object' ? JSON.stringify(err) : String(err)) ||
    'Unknown error';
  return `[ERROR] ${msg}`;
}

/**
 * Print collected warnings from core function results to stderr,
 * so they're visible to the user but don't pollute stdout JSON.
 */
function printWarnings(result: any): void {
  if (Array.isArray(result?.warnings)) {
    for (const w of result.warnings) {
      console.error(`[WARN] ${w}`);
    }
  }
}

// ============================================================================
// CLI Definition
// ============================================================================

const program = new Command();

program
  .name('create-token-skill')
  .description(
    'eForest Token Agent Kit — CLI for aelf token lifecycle (buy-seed, create-token, issue-token)',
  )
  .version('0.2.0');

function addGlobalOptions(cmd: Command): Command {
  return cmd
    .option(
      '--private-key <key>',
      'aelf wallet private key (fallback: AELF_PRIVATE_KEY env)',
    )
    .option('--env <env>', 'Environment: mainnet | testnet', 'mainnet')
    .option('--api-url <url>', 'Override backend API base URL')
    .option('--rpc-url <url>', 'Override AELF MainChain RPC URL')
    .option(
      '--dry-run',
      'Print execution plan without sending transactions',
      false,
    );
}

// --- buy-seed ---
addGlobalOptions(
  program
    .command('buy-seed')
    .description(
      'Purchase a SEED from SymbolRegister contract on aelf MainChain',
    )
    .requiredOption(
      '--symbol <symbol>',
      'SEED symbol to buy (e.g. "MYTOKEN")',
    )
    .requiredOption('--issuer <address>', 'Token issuer address (issueTo)')
    .option(
      '--force [maxPrice]',
      'Confirm purchase. Optional max price in ELF (e.g. --force 2)',
    ),
).action(async (opts) => {
  try {
    validateBuySeedParams(opts);
    const config = await getNetworkConfig(opts);

    let force: boolean | number | undefined = opts.force;
    if (force === true) {
      // --force with no value
    } else if (typeof force === 'string') {
      force = parseFloat(force);
      if (isNaN(force))
        throw new Error('--force value must be a number (max ELF price).');
    }

    const result = await buySeed(
      config,
      { symbol: opts.symbol, issueTo: opts.issuer, force },
      opts.dryRun,
    );
    printWarnings(result);
    console.log(formatOutput(result));
  } catch (err: any) {
    console.error(formatError(err));
    process.exit(1);
  }
});

// --- create-token ---
addGlobalOptions(
  program
    .command('create-token')
    .description('Create a new FT token using an owned SEED')
    .requiredOption('--symbol <symbol>', 'Token symbol (e.g. "MYTOKEN")')
    .requiredOption('--token-name <name>', 'Token display name')
    .requiredOption(
      '--seed-symbol <seed>',
      'Owned SEED symbol (e.g. "SEED-321")',
    )
    .requiredOption('--total-supply <supply>', 'Maximum total supply (integer)')
    .requiredOption('--decimals <n>', 'Token decimals (0-18)', parseInt)
    .option(
      '--issuer <address>',
      'Token issuer address (defaults to wallet address). Note: on-chain issuer will be a proxy account created by TokenAdapter.',
    )
    .requiredOption('--issue-chain <chain>', 'Issue chain: AELF | tDVV | tDVW')
    .option('--is-burnable', 'Token is burnable', true)
    .option('--no-is-burnable', 'Token is NOT burnable')
    .option('--token-image <url>', 'Token logo image URL', ''),
).action(async (opts) => {
  try {
    const config = await getNetworkConfig(opts);
    if (!opts.issuer) {
      opts.issuer = config.walletAddress;
    }
    validateCreateTokenParams(opts);
    const result = await createToken(config, opts, opts.dryRun);
    printWarnings(result);
    console.log(formatOutput(result));
  } catch (err: any) {
    console.error(formatError(err));
    process.exit(1);
  }
});

// --- issue-token ---
addGlobalOptions(
  program
    .command('issue-token')
    .description(
      'Issue tokens to an address via Proxy ForwardCall. ' +
        'Because TokenAdapter creates a proxy account as the on-chain issuer, ' +
        'this command routes through the Proxy contract. If --issuer is not ' +
        'provided, it auto-detects by querying GetTokenInfo on the target chain.',
    )
    .requiredOption('--symbol <symbol>', 'Token symbol to issue')
    .requiredOption('--amount <n>', 'Amount to issue', Number)
    .requiredOption('--to <address>', 'Recipient address')
    .requiredOption('--chain <chain>', 'Chain: AELF | tDVV | tDVW')
    .option(
      '--issuer <address>',
      'Proxy issuer address (from create-token output proxyIssuer). Auto-detected from GetTokenInfo if omitted.',
    )
    .option('--memo <memo>', 'Transaction memo', ''),
).action(async (opts) => {
  try {
    validateIssueTokenParams(opts);
    const config = await getNetworkConfig(opts);
    const result = await issueToken(config, opts, opts.dryRun);
    printWarnings(result);
    console.log(formatOutput(result));
  } catch (err: any) {
    console.error(formatError(err));
    process.exit(1);
  }
});

// Only parse CLI when running as main module (not when imported for tests)
const isMainModule =
  typeof Bun !== 'undefined'
    ? Bun.main === import.meta.path
    : process.argv[1]?.endsWith('create_token_skill.ts');

if (isMainModule) {
  program.parse();
}

// Re-export for test compatibility
export { program };
