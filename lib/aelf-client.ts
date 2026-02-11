/**
 * @eforest-finance/token-agent-kit — aelf-sdk wrapper.
 *
 * Wallet creation, contract instantiation, transaction polling, and helpers.
 */

import AElf from 'aelf-sdk';
import { TX_POLL_INTERVAL_MS, TX_POLL_MAX_RETRIES } from './types';

// ============================================================================
// Utilities
// ============================================================================

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// Wallet
// ============================================================================

export function getWallet(privateKey?: string): any {
  const key =
    process.env.AELF_PRIVATE_KEY ||
    process.env.EFOREST_PRIVATE_KEY ||
    privateKey;

  if (!key) {
    throw new Error(
      'Private key is required. Set AELF_PRIVATE_KEY env var or pass --private-key.',
    );
  }
  return AElf.wallet.getWalletByPrivateKey(key);
}

// ============================================================================
// Contract
// ============================================================================

export function getAElfInstance(rpcUrl: string): any {
  return new AElf(new AElf.providers.HttpProvider(rpcUrl));
}

export async function getContractInstance(
  rpcUrl: string,
  contractAddress: string,
  wallet: any,
): Promise<any> {
  const aelf = getAElfInstance(rpcUrl);
  return await aelf.chain.contractAt(contractAddress, wallet);
}

// ============================================================================
// Transaction Polling
// ============================================================================

/**
 * Poll for transaction result until mined or timeout.
 *
 * FIX(NOTEXISTED-retry): Transactions may temporarily show "NOTEXISTED"
 * before the node indexes them. Treat this like "pending" and retry.
 */
export async function getTxResult(
  rpcUrl: string,
  transactionId: string,
  retryCount = 0,
): Promise<{ TransactionId: string; txResult: any }> {
  const aelf = getAElfInstance(rpcUrl);
  const txResult = await aelf.chain.getTxResult(transactionId);

  if (txResult.error && txResult.errorMessage) {
    throw new Error(
      txResult.errorMessage.message ||
        txResult.errorMessage.Message ||
        'Transaction error',
    );
  }

  if (!txResult) {
    throw new Error('Cannot get transaction result.');
  }

  const status = txResult.Status?.toLowerCase();

  if (status === 'pending' || status === 'notexisted') {
    if (retryCount >= TX_POLL_MAX_RETRIES) {
      throw new Error(
        `Transaction polling timeout. TransactionId: ${transactionId}`,
      );
    }
    await sleep(TX_POLL_INTERVAL_MS);
    return getTxResult(rpcUrl, transactionId, retryCount + 1);
  }

  if (status === 'mined') {
    return { TransactionId: transactionId, txResult };
  }

  throw new Error(
    `Transaction failed with status "${txResult.Status}". TransactionId: ${transactionId}. Error: ${JSON.stringify(txResult.Error || '')}`,
  );
}

// ============================================================================
// Contract Call Helpers
// ============================================================================

export async function callContractSend(
  rpcUrl: string,
  contractAddress: string,
  methodName: string,
  params: any,
  wallet: any,
): Promise<{ TransactionId: string; txResult: any }> {
  const contract = await getContractInstance(rpcUrl, contractAddress, wallet);
  const tx = await contract[methodName](params);
  const transactionId = tx.TransactionId || tx.transactionId || tx;
  if (!transactionId || typeof transactionId !== 'string') {
    throw new Error(
      `Failed to get TransactionId from ${methodName}. Response: ${JSON.stringify(tx)}`,
    );
  }
  await sleep(TX_POLL_INTERVAL_MS);
  return getTxResult(rpcUrl, transactionId);
}

export async function callContractView(
  rpcUrl: string,
  contractAddress: string,
  methodName: string,
  params: any,
  wallet: any,
): Promise<any> {
  const contract = await getContractInstance(rpcUrl, contractAddress, wallet);
  return await contract[methodName].call(params);
}
