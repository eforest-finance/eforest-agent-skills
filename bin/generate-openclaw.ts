#!/usr/bin/env bun
/**
 * Generate OpenClaw skill catalog from registry.
 */

import { writeFileSync } from 'fs';
import * as path from 'path';

import { listForestSkills } from '../lib/forest-skill-registry';
import { getPackageRoot } from './platforms/utils';

type ParamType = 'string' | 'number' | 'boolean';

interface OpenClawParameter {
  type: ParamType;
  required: boolean;
  description: string;
  default?: string | number | boolean;
}

interface OpenClawSkill {
  name: string;
  command: string;
  description: string;
  working_directory: string;
  parameters: Record<string, OpenClawParameter>;
}

interface OpenClawConfig {
  skills: OpenClawSkill[];
}

interface StructuredParamTemplate {
  name: string;
  fieldPath: string;
  type: ParamType;
  required: boolean;
  description: string;
  default?: string | number | boolean;
}

const WORKING_DIRECTORY = '.';

export const HIGH_FREQUENCY_FOREST_SKILLS = [
  'aelf-forest-create-collection',
  'aelf-forest-create-item',
  'aelf-forest-batch-create-items',
  'aelf-forest-list-item',
  'aelf-forest-buy-now',
  'aelf-forest-make-offer',
  'aelf-forest-deal-offer',
  'aelf-forest-cancel-offer',
  'aelf-forest-cancel-listing',
  'aelf-forest-transfer-item',
  'aelf-forest-get-price-quote',
  'aelf-forest-query-collections',
] as const;

const HIGH_FREQUENCY_SET = new Set<string>(HIGH_FREQUENCY_FOREST_SKILLS);

const STRUCTURED_TEMPLATES: Record<string, StructuredParamTemplate[]> = {
  'aelf-forest-create-collection': [
    {
      name: 'symbol',
      fieldPath: 'payload.symbol',
      type: 'string',
      required: true,
      description: 'Collection symbol',
    },
    {
      name: 'tokenName',
      fieldPath: 'payload.tokenName',
      type: 'string',
      required: true,
      description: 'Collection display name',
    },
    {
      name: 'seedSymbol',
      fieldPath: 'payload.seedSymbol',
      type: 'string',
      required: true,
      description: 'Owned seed symbol',
    },
    {
      name: 'issueChainId',
      fieldPath: 'payload.issueChainId',
      type: 'string',
      required: true,
      description: 'Issue chain: AELF | tDVV | tDVW',
    },
    {
      name: 'owner',
      fieldPath: 'payload.owner',
      type: 'string',
      required: true,
      description: 'Owner address',
    },
    {
      name: 'issuer',
      fieldPath: 'payload.issuer',
      type: 'string',
      required: true,
      description: 'Issuer address',
    },
    {
      name: 'externalInfoJson',
      fieldPath: 'payload.externalInfo',
      type: 'string',
      required: true,
      description: 'JSON string for externalInfo object',
    },
  ],
  'aelf-forest-create-item': [
    {
      name: 'symbol',
      fieldPath: 'payload.symbol',
      type: 'string',
      required: true,
      description: 'NFT symbol',
    },
    {
      name: 'tokenName',
      fieldPath: 'payload.tokenName',
      type: 'string',
      required: true,
      description: 'NFT display name',
    },
    {
      name: 'owner',
      fieldPath: 'payload.owner',
      type: 'string',
      required: true,
      description: 'Owner address',
    },
    {
      name: 'issuer',
      fieldPath: 'payload.issuer',
      type: 'string',
      required: true,
      description: 'Issuer address',
    },
    {
      name: 'issueChainId',
      fieldPath: 'payload.issueChainId',
      type: 'string',
      required: true,
      description: 'Issue chain: AELF | tDVV | tDVW',
    },
    {
      name: 'totalSupply',
      fieldPath: 'payload.totalSupply',
      type: 'number',
      required: true,
      description: 'Total supply',
    },
    {
      name: 'externalInfoJson',
      fieldPath: 'payload.externalInfo',
      type: 'string',
      required: true,
      description: 'JSON string for externalInfo object',
    },
  ],
  'aelf-forest-batch-create-items': [
    {
      name: 'proxyOwnerAddress',
      fieldPath: 'payload.proxyOwnerAddress',
      type: 'string',
      required: true,
      description: 'Proxy owner address',
    },
    {
      name: 'proxyIssuerAddress',
      fieldPath: 'payload.proxyIssuerAddress',
      type: 'string',
      required: true,
      description: 'Proxy issuer address',
    },
    {
      name: 'itemsJson',
      fieldPath: 'payload.items',
      type: 'string',
      required: true,
      description: 'JSON array string for items',
    },
  ],
  'aelf-forest-list-item': [
    {
      name: 'symbol',
      fieldPath: 'payload.symbol',
      type: 'string',
      required: true,
      description: 'NFT symbol',
    },
    {
      name: 'quantity',
      fieldPath: 'payload.quantity',
      type: 'number',
      required: true,
      description: 'Listing quantity',
    },
    {
      name: 'priceSymbol',
      fieldPath: 'payload.price.symbol',
      type: 'string',
      required: true,
      description: 'Price token symbol',
    },
    {
      name: 'priceAmount',
      fieldPath: 'payload.price.amount',
      type: 'number',
      required: true,
      description: 'Price amount',
    },
    {
      name: 'durationJson',
      fieldPath: 'payload.duration',
      type: 'string',
      required: true,
      description: 'JSON string for duration',
    },
    {
      name: 'chain',
      fieldPath: 'payload.chain',
      type: 'string',
      required: true,
      description: 'Chain: AELF | tDVV | tDVW',
    },
  ],
  'aelf-forest-buy-now': [
    {
      name: 'symbol',
      fieldPath: 'payload.symbol',
      type: 'string',
      required: true,
      description: 'NFT symbol',
    },
    {
      name: 'chain',
      fieldPath: 'payload.chain',
      type: 'string',
      required: true,
      description: 'Chain: AELF | tDVV | tDVW',
    },
    {
      name: 'fixPriceListJson',
      fieldPath: 'payload.fixPriceList',
      type: 'string',
      required: true,
      description: 'JSON array string for fixPriceList',
    },
  ],
  'aelf-forest-make-offer': [
    {
      name: 'symbol',
      fieldPath: 'payload.symbol',
      type: 'string',
      required: true,
      description: 'NFT symbol',
    },
    {
      name: 'quantity',
      fieldPath: 'payload.quantity',
      type: 'number',
      required: true,
      description: 'Offer quantity',
    },
    {
      name: 'priceJson',
      fieldPath: 'payload.price',
      type: 'string',
      required: true,
      description: 'JSON string for price object',
    },
    {
      name: 'chain',
      fieldPath: 'payload.chain',
      type: 'string',
      required: true,
      description: 'Chain: AELF | tDVV | tDVW',
    },
    {
      name: 'offerTo',
      fieldPath: 'payload.offerTo',
      type: 'string',
      required: false,
      description: 'Optional target address',
    },
    {
      name: 'expireTime',
      fieldPath: 'payload.expireTime',
      type: 'number',
      required: false,
      description: 'Optional expire timestamp',
    },
  ],
  'aelf-forest-deal-offer': [
    {
      name: 'symbol',
      fieldPath: 'payload.symbol',
      type: 'string',
      required: true,
      description: 'NFT symbol',
    },
    {
      name: 'offerFrom',
      fieldPath: 'payload.offerFrom',
      type: 'string',
      required: true,
      description: 'Offer maker address',
    },
    {
      name: 'quantity',
      fieldPath: 'payload.quantity',
      type: 'number',
      required: true,
      description: 'Deal quantity',
    },
    {
      name: 'priceJson',
      fieldPath: 'payload.price',
      type: 'string',
      required: true,
      description: 'JSON string for price object',
    },
    {
      name: 'chain',
      fieldPath: 'payload.chain',
      type: 'string',
      required: true,
      description: 'Chain: AELF | tDVV | tDVW',
    },
  ],
  'aelf-forest-cancel-offer': [
    {
      name: 'mode',
      fieldPath: 'payload.mode',
      type: 'string',
      required: true,
      description: 'single | batch',
    },
    {
      name: 'chain',
      fieldPath: 'payload.chain',
      type: 'string',
      required: true,
      description: 'Chain: AELF | tDVV | tDVW',
    },
    {
      name: 'paramsJson',
      fieldPath: 'payload.params',
      type: 'string',
      required: false,
      description: 'Optional JSON string for payload.params',
    },
  ],
  'aelf-forest-cancel-listing': [
    {
      name: 'mode',
      fieldPath: 'payload.mode',
      type: 'string',
      required: true,
      description: 'single | batch | batchDelist | batchCancelList',
    },
    {
      name: 'chain',
      fieldPath: 'payload.chain',
      type: 'string',
      required: true,
      description: 'Chain: AELF | tDVV | tDVW',
    },
    {
      name: 'paramsJson',
      fieldPath: 'payload.params',
      type: 'string',
      required: false,
      description: 'Optional JSON string for payload.params',
    },
  ],
  'aelf-forest-transfer-item': [
    {
      name: 'symbol',
      fieldPath: 'payload.symbol',
      type: 'string',
      required: true,
      description: 'NFT symbol',
    },
    {
      name: 'to',
      fieldPath: 'payload.to',
      type: 'string',
      required: true,
      description: 'Recipient address',
    },
    {
      name: 'amount',
      fieldPath: 'payload.amount',
      type: 'number',
      required: true,
      description: 'Transfer amount',
    },
    {
      name: 'chain',
      fieldPath: 'payload.chain',
      type: 'string',
      required: true,
      description: 'Chain: AELF | tDVV | tDVW',
    },
  ],
  'aelf-forest-get-price-quote': [
    {
      name: 'symbol',
      fieldPath: 'payload.symbol',
      type: 'string',
      required: true,
      description: 'NFT symbol',
    },
    {
      name: 'nftId',
      fieldPath: 'payload.nftId',
      type: 'string',
      required: false,
      description: 'Optional NFT ID',
    },
    {
      name: 'chain',
      fieldPath: 'payload.chain',
      type: 'string',
      required: false,
      description: 'Optional chain',
    },
    {
      name: 'includeJson',
      fieldPath: 'payload.include',
      type: 'string',
      required: false,
      description: 'Optional JSON array string for include fields',
    },
  ],
  'aelf-forest-query-collections': [
    {
      name: 'action',
      fieldPath: 'action',
      type: 'string',
      required: true,
      description:
        'collections | searchCollections | recommendedCollections | collectionInfo | compositeNftInfos | traits | generation | rarity | activities | trending | hot',
    },
    {
      name: 'paramsJson',
      fieldPath: 'params',
      type: 'string',
      required: false,
      description: 'Optional JSON string for params',
    },
  ],
};

function commonEnvelopeParameters(): Record<string, OpenClawParameter> {
  return {
    env: {
      type: 'string',
      required: false,
      default: 'mainnet',
      description: 'Environment: mainnet | testnet',
    },
    dryRun: {
      type: 'boolean',
      required: false,
      default: false,
      description: 'If true, return dry-run response without write execution',
    },
    traceId: {
      type: 'string',
      required: false,
      description: 'Optional traceId for correlation',
    },
    timeoutMs: {
      type: 'number',
      required: false,
      description: 'Optional timeout in milliseconds (1000~180000)',
    },
    privateKey: {
      type: 'string',
      required: false,
      description: 'Optional private key override',
    },
  };
}

function baseForestCommand(skillName: string): string {
  return [
    'bun run src/cli/forest_skill.ts run',
    `--skill ${skillName}`,
    '--env {{env}}',
    '{{#if dryRun}}--dry-run{{/if}}',
    "{{#if traceId}}--trace-id '{{traceId}}'{{/if}}",
    '{{#if timeoutMs}}--timeout-ms {{timeoutMs}}{{/if}}',
    "{{#if privateKey}}--private-key '{{privateKey}}'{{/if}}",
  ].join(' ');
}

function fieldValueExpression(name: string, type: ParamType): string {
  if (type === 'number') return `{{${name}}}`;
  return `'{{${name}}}'`;
}

function buildStructuredFieldPart(param: StructuredParamTemplate): string {
  const assignment = `--field ${param.fieldPath}=${fieldValueExpression(param.name, param.type)}`;
  if (param.required) {
    return assignment;
  }
  return `{{#if ${param.name}}${assignment}{{/if}}`;
}

function buildLegacySkills(): OpenClawSkill[] {
  return [
    {
      name: 'aelf-buy-seed',
      command:
        "bun run create_token_skill.ts buy-seed --symbol '{{symbol}}' --issuer '{{issuer}}' --env {{env}} {{#if force}}--force {{force}}{{/if}} {{#if privateKey}}--private-key '{{privateKey}}'{{/if}} {{#if dryRun}}--dry-run{{/if}}",
      description:
        'Symbol-Market: check and purchase SEED for asset creation entry.',
      working_directory: WORKING_DIRECTORY,
      parameters: {
        symbol: {
          type: 'string',
          required: true,
          description: 'SEED symbol to purchase',
        },
        issuer: {
          type: 'string',
          required: true,
          description: 'Issuer address',
        },
        force: {
          type: 'string',
          required: false,
          description: 'true or max ELF price',
        },
        ...commonEnvelopeParameters(),
      },
    },
    {
      name: 'aelf-create-token',
      command:
        "bun run create_token_skill.ts create-token --symbol '{{symbol}}' --token-name '{{tokenName}}' --seed-symbol '{{seedSymbol}}' --total-supply {{totalSupply}} --decimals {{decimals}} {{#if issuer}}--issuer '{{issuer}}'{{/if}} --issue-chain {{issueChain}} {{#if isBurnable}}--is-burnable{{else}}--no-is-burnable{{/if}} {{#if tokenImage}}--token-image '{{tokenImage}}'{{/if}} --env {{env}} {{#if privateKey}}--private-key '{{privateKey}}'{{/if}} {{#if dryRun}}--dry-run{{/if}}",
      description:
        'Symbol-Market: create FT token with owned seed symbol.',
      working_directory: WORKING_DIRECTORY,
      parameters: {
        symbol: {
          type: 'string',
          required: true,
          description: 'Token symbol',
        },
        tokenName: {
          type: 'string',
          required: true,
          description: 'Token display name',
        },
        seedSymbol: {
          type: 'string',
          required: true,
          description: 'Owned seed symbol',
        },
        totalSupply: {
          type: 'string',
          required: true,
          description: 'Total supply integer string',
        },
        decimals: {
          type: 'number',
          required: true,
          description: 'Token decimals',
        },
        issueChain: {
          type: 'string',
          required: true,
          description: 'Issue chain: AELF | tDVV | tDVW',
        },
        isBurnable: {
          type: 'boolean',
          required: false,
          default: true,
          description: 'Whether token is burnable',
        },
        issuer: {
          type: 'string',
          required: false,
          description: 'Optional issuer address',
        },
        tokenImage: {
          type: 'string',
          required: false,
          description: 'Optional token image URL',
        },
        ...commonEnvelopeParameters(),
      },
    },
    {
      name: 'aelf-issue-token',
      command:
        "bun run create_token_skill.ts issue-token --symbol '{{symbol}}' --amount {{amount}} --to '{{to}}' --chain {{chain}} {{#if issuer}}--issuer '{{issuer}}'{{/if}} {{#if memo}}--memo '{{memo}}'{{/if}} --env {{env}} {{#if privateKey}}--private-key '{{privateKey}}'{{/if}} {{#if dryRun}}--dry-run{{/if}}",
      description:
        'Symbol-Market: issue token amount to target address.',
      working_directory: WORKING_DIRECTORY,
      parameters: {
        symbol: {
          type: 'string',
          required: true,
          description: 'Token symbol',
        },
        amount: {
          type: 'number',
          required: true,
          description: 'Issue amount',
        },
        to: {
          type: 'string',
          required: true,
          description: 'Recipient address',
        },
        chain: {
          type: 'string',
          required: true,
          description: 'Chain: AELF | tDVV | tDVW',
        },
        issuer: {
          type: 'string',
          required: false,
          description: 'Optional proxy issuer',
        },
        memo: {
          type: 'string',
          required: false,
          description: 'Optional memo',
        },
        ...commonEnvelopeParameters(),
      },
    },
  ];
}

function buildStructuredForestSkill(skillName: string): OpenClawSkill {
  const templates = STRUCTURED_TEMPLATES[skillName];
  if (!templates) {
    throw new Error(`Missing structured template for ${skillName}`);
  }

  const base = baseForestCommand(skillName);
  const fieldParts = templates.map((param) => buildStructuredFieldPart(param));

  const command = [
    base,
    ...fieldParts,
    "{{#if inputJson}}--input-json '{{inputJson}}'{{/if}}",
  ].join(' ');

  const parameters: Record<string, OpenClawParameter> = {
    ...commonEnvelopeParameters(),
    inputJson: {
      type: 'string',
      required: false,
      description:
        'Optional JSON object for additional fields; structured fields override conflicting keys',
    },
  };

  for (const param of templates) {
    parameters[param.name] = {
      type: param.type,
      required: param.required,
      description: param.description,
      ...(param.default === undefined ? {} : { default: param.default }),
    };
  }

  return {
    name: skillName,
    command,
    description: `Forest skill (structured): ${skillName}`,
    working_directory: WORKING_DIRECTORY,
    parameters,
  };
}

function buildLongTailForestSkill(skillName: string): OpenClawSkill {
  const base = baseForestCommand(skillName);
  const command = `${base} --input-json '{{inputJson}}'`;

  return {
    name: skillName,
    command,
    description: `Forest skill (inputJson): ${skillName}`,
    working_directory: WORKING_DIRECTORY,
    parameters: {
      ...commonEnvelopeParameters(),
      inputJson: {
        type: 'string',
        required: true,
        description: 'JSON object string for full skill input',
      },
    },
  };
}

export function buildForestSkillEntries(): OpenClawSkill[] {
  const forestSkills = listForestSkills();

  return forestSkills.map((skill) => {
    if (HIGH_FREQUENCY_SET.has(skill.name)) {
      return buildStructuredForestSkill(skill.name);
    }
    return buildLongTailForestSkill(skill.name);
  });
}

export function buildOpenClawConfig(): OpenClawConfig {
  return {
    skills: [...buildLegacySkills(), ...buildForestSkillEntries()],
  };
}

export function writeOpenClawConfig(outPath?: string): string {
  const packageRoot = getPackageRoot();
  const targetPath = outPath || path.join(packageRoot, 'openclaw.json');
  const config = buildOpenClawConfig();
  writeFileSync(targetPath, `${JSON.stringify(config, null, 2)}\n`, 'utf-8');
  return targetPath;
}

const isMainModule =
  typeof Bun !== 'undefined'
    ? Bun.main === import.meta.path
    : process.argv[1]?.endsWith('generate-openclaw.ts');

if (isMainModule) {
  const output = writeOpenClawConfig();
  const config = buildOpenClawConfig();
  console.log(
    `[openclaw] generated ${config.skills.length} skills at ${output}`,
  );
}
