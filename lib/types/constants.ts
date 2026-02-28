/**
 * Shared chain/runtime constants for eforest skills.
 */

export const CHAIN_ID_VALUE: Record<string, number> = {
  tDVW: 1931928,
  tDVV: 1866392,
  AELF: 9992731,
};

export const VALID_CHAINS = ['AELF', 'tDVV', 'tDVW'] as const;
export type ChainId = (typeof VALID_CHAINS)[number];

export const ELF_DECIMALS = 8;

export const TX_POLL_INTERVAL_MS = 1000;
export const TX_POLL_MAX_RETRIES = 10;
export const SYNC_POLL_INTERVAL_MS = 20_000;
export const SYNC_POLL_MAX_RETRIES = 30;

// Minimal protobuf definition for encoding IssueInput when using ForwardCall
// via Proxy contract. Extracted from src/proto/token_contract.json.
export const ISSUE_INPUT_PROTO_DEF = {
  nested: {
    token: {
      nested: {
        IssueInput: {
          fields: {
            symbol: { type: 'string', id: 1 },
            amount: { type: 'int64', id: 2 },
            memo: { type: 'string', id: 3 },
            to: { type: 'aelf.Address', id: 4 },
          },
        },
      },
    },
    aelf: {
      nested: {
        Address: {
          fields: { value: { type: 'bytes', id: 1 } },
        },
      },
    },
  },
};
