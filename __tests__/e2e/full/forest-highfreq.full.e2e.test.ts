import { describe, expect, test } from 'bun:test';

import {
  assertFailureEnvelope,
  assertSuccessEnvelope,
  runCliJson,
} from '../helpers/cli';

interface HighFreqCase {
  name: string;
  args: string[];
}

const HIGH_FREQ_CASES: HighFreqCase[] = [
  {
    name: 'aelf-forest-create-collection',
    args: [
      '--field payload.symbol=E2ECOLLECTION',
      "--field payload.tokenName='E2E Collection'",
      '--field payload.seedSymbol=SEED-1',
      '--field payload.issueChainId=tDVV',
      '--field payload.owner=E2E-OWNER',
      '--field payload.issuer=E2E-ISSUER',
      `--field payload.externalInfo='{}'`,
    ],
  },
  {
    name: 'aelf-forest-create-item',
    args: [
      '--field payload.symbol=E2EITEM-1',
      "--field payload.tokenName='E2E Item'",
      '--field payload.owner=E2E-OWNER',
      '--field payload.issuer=E2E-ISSUER',
      '--field payload.issueChainId=tDVV',
      '--field payload.totalSupply=1',
      `--field payload.externalInfo='{}'`,
    ],
  },
  {
    name: 'aelf-forest-batch-create-items',
    args: [
      '--field payload.proxyOwnerAddress=E2E-OWNER',
      '--field payload.proxyIssuerAddress=E2E-ISSUER',
      `--field payload.items='[{"symbol":"E2EITEM-2","tokenName":"E2E Item 2"}]'`,
    ],
  },
  {
    name: 'aelf-forest-list-item',
    args: [
      '--field payload.symbol=E2EITEM-1',
      '--field payload.quantity=1',
      '--field payload.price.symbol=ELF',
      '--field payload.price.amount=1',
      `--field payload.duration='{"hours":24}'`,
      '--field payload.chain=tDVV',
    ],
  },
  {
    name: 'aelf-forest-buy-now',
    args: [
      '--field payload.symbol=E2EITEM-1',
      '--field payload.chain=tDVV',
      `--field payload.fixPriceList='[{"symbol":"E2EITEM-1","quantity":1}]'`,
    ],
  },
  {
    name: 'aelf-forest-make-offer',
    args: [
      '--field payload.symbol=E2EITEM-1',
      '--field payload.quantity=1',
      `--field payload.price='{"symbol":"ELF","amount":1}'`,
      '--field payload.chain=tDVV',
    ],
  },
  {
    name: 'aelf-forest-deal-offer',
    args: [
      '--field payload.symbol=E2EITEM-1',
      '--field payload.offerFrom=E2E-OFFER-FROM',
      '--field payload.quantity=1',
      `--field payload.price='{"symbol":"ELF","amount":1}'`,
      '--field payload.chain=tDVV',
    ],
  },
  {
    name: 'aelf-forest-cancel-offer',
    args: [
      '--field payload.mode=single',
      '--field payload.chain=tDVV',
      `--field payload.params='{"symbol":"E2EITEM-1"}'`,
    ],
  },
  {
    name: 'aelf-forest-cancel-listing',
    args: [
      '--field payload.mode=single',
      '--field payload.chain=tDVV',
      `--field payload.params='{"symbol":"E2EITEM-1"}'`,
    ],
  },
  {
    name: 'aelf-forest-transfer-item',
    args: [
      '--field payload.symbol=E2EITEM-1',
      '--field payload.to=E2E-TO',
      '--field payload.amount=1',
      '--field payload.chain=tDVV',
    ],
  },
  {
    name: 'aelf-forest-get-price-quote',
    args: [
      '--field payload.symbol=E2EITEM-1',
      '--field payload.nftId=NFT1',
      '--field payload.chain=tDVV',
      `--field payload.include='["tokenData","nftMarketData","saleInfo","txFee"]'`,
    ],
  },
  {
    name: 'aelf-forest-query-collections',
    args: [
      '--field action=collections',
      `--field params='{"page":1}'`,
    ],
  },
];

describe('e2e full - 12 high-frequency forest skills (structured dry-run)', () => {
  test(
    'all high-frequency structured skills return normalized envelope (OK or MAINTENANCE)',
    { timeout: 120000 },
    () => {
    let successCount = 0;
    let maintenanceCount = 0;

    for (const item of HIGH_FREQ_CASES) {
      const command = [
        'bun run src/cli/forest_skill.ts run',
        `--skill ${item.name}`,
        '--env mainnet',
        '--dry-run',
        ...item.args,
      ].join(' ');

      const result = runCliJson(command);

      if (result.exitCode !== 0) {
        throw new Error(
          `Skill ${item.name} exited with code ${result.exitCode}\nstdout=${result.stdout}\nstderr=${result.stderr}`,
        );
      }
      expect(result.exitCode).toBe(0);

      if (result.json?.success) {
        successCount += 1;
        assertSuccessEnvelope(result.json);
        continue;
      }

      if (result.json?.code !== 'MAINTENANCE') {
        throw new Error(
          `Skill ${item.name} returned unexpected failure envelope: ${JSON.stringify(result.json)}`,
        );
      }

      maintenanceCount += 1;
      assertFailureEnvelope(result.json, 'MAINTENANCE');
    }

    // At least API-driven high-frequency skills should stay green in dry-run.
    expect(successCount).toBeGreaterThanOrEqual(2);
    expect(successCount + maintenanceCount).toBe(HIGH_FREQ_CASES.length);
    },
  );
});
