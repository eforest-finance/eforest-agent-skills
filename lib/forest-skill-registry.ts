/**
 * Forest skill registry (tier + schema refs + service key binding).
 */

import { FOREST_SERVICE_KEYS } from './forest-service';

export type SkillTier = 'P0' | 'P1' | 'P2';

export type SkillKind = 'workflow' | 'method.contract' | 'method.api';

export interface ForestSkillSchemaBinding {
  in: string;
  out: string;
  tier: SkillTier;
}

export interface ForestSkillDefinition extends ForestSkillSchemaBinding {
  name: string;
  kind: SkillKind;
  serviceKey: string;
}

const SKILL_REGISTRY_JSON = `
{
  "skills": {
    "aelf-forest-create-collection": {"in": "schema.workflow.createCollection.in.v1", "out": "schema.workflow.createCollection.out.v1", "tier": "P0"},
    "aelf-forest-create-item": {"in": "schema.workflow.createItem.in.v1", "out": "schema.workflow.createItem.out.v1", "tier": "P0"},
    "aelf-forest-batch-create-items": {"in": "schema.workflow.batchCreateItems.in.v1", "out": "schema.workflow.batchCreateItems.out.v1", "tier": "P0"},
    "aelf-forest-list-item": {"in": "schema.workflow.listItem.in.v1", "out": "schema.workflow.listItem.out.v1", "tier": "P0"},
    "aelf-forest-buy-now": {"in": "schema.workflow.buyNow.in.v1", "out": "schema.workflow.buyNow.out.v1", "tier": "P0"},
    "aelf-forest-make-offer": {"in": "schema.workflow.makeOffer.in.v1", "out": "schema.workflow.makeOffer.out.v1", "tier": "P0"},
    "aelf-forest-deal-offer": {"in": "schema.workflow.dealOffer.in.v1", "out": "schema.workflow.dealOffer.out.v1", "tier": "P0"},
    "aelf-forest-cancel-offer": {"in": "schema.workflow.cancelOffer.in.v1", "out": "schema.workflow.cancelOffer.out.v1", "tier": "P0"},
    "aelf-forest-cancel-listing": {"in": "schema.workflow.cancelListing.in.v1", "out": "schema.workflow.cancelListing.out.v1", "tier": "P0"},
    "aelf-forest-transfer-item": {"in": "schema.workflow.transferItem.in.v1", "out": "schema.workflow.transferItem.out.v1", "tier": "P0"},
    "aelf-forest-get-price-quote": {"in": "schema.workflow.getPriceQuote.in.v1", "out": "schema.workflow.getPriceQuote.out.v1", "tier": "P0"},

    "aelf-forest-issue-item": {"in": "schema.workflow.issueItem.in.v1", "out": "schema.workflow.issueItem.out.v1", "tier": "P1"},
    "aelf-forest-place-bid": {"in": "schema.workflow.placeBid.in.v1", "out": "schema.workflow.placeBid.out.v1", "tier": "P1"},
    "aelf-forest-claim-drop": {"in": "schema.workflow.claimDrop.in.v1", "out": "schema.workflow.claimDrop.out.v1", "tier": "P1"},
    "aelf-forest-query-drop": {"in": "schema.workflow.queryDrop.in.v1", "out": "schema.workflow.queryDrop.out.v1", "tier": "P1"},
    "aelf-forest-whitelist-read": {"in": "schema.workflow.whitelistRead.in.v1", "out": "schema.workflow.whitelistRead.out.v1", "tier": "P1"},
    "aelf-forest-whitelist-manage": {"in": "schema.workflow.whitelistManage.in.v1", "out": "schema.workflow.whitelistManage.out.v1", "tier": "P1"},

    "aelf-forest-ai-generate": {"in": "schema.workflow.aiGenerate.in.v1", "out": "schema.workflow.aiGenerate.out.v1", "tier": "P2"},
    "aelf-forest-ai-retry": {"in": "schema.workflow.aiRetry.in.v1", "out": "schema.workflow.aiRetry.out.v1", "tier": "P2"},
    "aelf-forest-create-platform-nft": {"in": "schema.workflow.platformNft.in.v1", "out": "schema.workflow.platformNft.out.v1", "tier": "P2"},
    "aelf-forest-miniapp-action": {"in": "schema.workflow.miniappAction.in.v1", "out": "schema.workflow.miniappAction.out.v1", "tier": "P2"},
    "aelf-forest-update-profile": {"in": "schema.workflow.updateProfile.in.v1", "out": "schema.workflow.updateProfile.out.v1", "tier": "P2"},
    "aelf-forest-query-collections": {"in": "schema.workflow.queryCollections.in.v1", "out": "schema.workflow.queryCollections.out.v1", "tier": "P2"},
    "aelf-forest-watch-market-signals": {"in": "schema.workflow.watchSignals.in.v1", "out": "schema.workflow.watchSignals.out.v1", "tier": "P2"},

    "aelf-forest-contract-market": {"in": "schema.method.contract.market.in.v1", "out": "schema.method.contract.market.out.v1", "tier": "P0"},
    "aelf-forest-contract-multitoken": {"in": "schema.method.contract.multitoken.in.v1", "out": "schema.method.contract.multitoken.out.v1", "tier": "P0"},
    "aelf-forest-contract-token-adapter": {"in": "schema.method.contract.tokenAdapter.in.v1", "out": "schema.method.contract.tokenAdapter.out.v1", "tier": "P0"},
    "aelf-forest-contract-proxy": {"in": "schema.method.contract.proxy.in.v1", "out": "schema.method.contract.proxy.out.v1", "tier": "P0"},
    "aelf-forest-contract-auction": {"in": "schema.method.contract.auction.in.v1", "out": "schema.method.contract.auction.out.v1", "tier": "P1"},
    "aelf-forest-contract-drop": {"in": "schema.method.contract.drop.in.v1", "out": "schema.method.contract.drop.out.v1", "tier": "P1"},
    "aelf-forest-contract-whitelist": {"in": "schema.method.contract.whitelist.in.v1", "out": "schema.method.contract.whitelist.out.v1", "tier": "P1"},
    "aelf-forest-contract-miniapp": {"in": "schema.method.contract.miniapp.in.v1", "out": "schema.method.contract.miniapp.out.v1", "tier": "P2"},

    "aelf-forest-api-market": {"in": "schema.method.api.market.in.v1", "out": "schema.method.api.market.out.v1", "tier": "P0"},
    "aelf-forest-api-nft": {"in": "schema.method.api.nft.in.v1", "out": "schema.method.api.nft.out.v1", "tier": "P0"},
    "aelf-forest-api-collection": {"in": "schema.method.api.collection.in.v1", "out": "schema.method.api.collection.out.v1", "tier": "P0"},
    "aelf-forest-api-sync": {"in": "schema.method.api.sync.in.v1", "out": "schema.method.api.sync.out.v1", "tier": "P0"},
    "aelf-forest-api-seed-auction": {"in": "schema.method.api.seedAuction.in.v1", "out": "schema.method.api.seedAuction.out.v1", "tier": "P0"},
    "aelf-forest-api-drop": {"in": "schema.method.api.drop.in.v1", "out": "schema.method.api.drop.out.v1", "tier": "P1"},
    "aelf-forest-api-whitelist": {"in": "schema.method.api.whitelist.in.v1", "out": "schema.method.api.whitelist.out.v1", "tier": "P1"},
    "aelf-forest-api-ai": {"in": "schema.method.api.ai.in.v1", "out": "schema.method.api.ai.out.v1", "tier": "P2"},
    "aelf-forest-api-platform": {"in": "schema.method.api.platform.in.v1", "out": "schema.method.api.platform.out.v1", "tier": "P2"},
    "aelf-forest-api-miniapp": {"in": "schema.method.api.miniapp.in.v1", "out": "schema.method.api.miniapp.out.v1", "tier": "P2"},
    "aelf-forest-api-user": {"in": "schema.method.api.user.in.v1", "out": "schema.method.api.user.out.v1", "tier": "P2"},
    "aelf-forest-api-system": {"in": "schema.method.api.system.in.v1", "out": "schema.method.api.system.out.v1", "tier": "P2"},
    "aelf-forest-api-realtime": {"in": "schema.method.api.realtime.in.v1", "out": "schema.method.api.realtime.out.v1", "tier": "P2"}
  }
}
`;

const parsed = JSON.parse(SKILL_REGISTRY_JSON) as {
  skills: Record<string, ForestSkillSchemaBinding>;
};

export const FOREST_SKILL_BINDINGS: Record<string, ForestSkillSchemaBinding> =
  parsed.skills;

export type ForestSkillName = keyof typeof FOREST_SKILL_BINDINGS;

function inferKind(binding: ForestSkillSchemaBinding): SkillKind {
  if (binding.in.startsWith('schema.workflow.')) return 'workflow';
  if (binding.in.startsWith('schema.method.contract.')) return 'method.contract';
  if (binding.in.startsWith('schema.method.api.')) return 'method.api';
  throw new Error(`Unknown skill kind for schema: ${binding.in}`);
}

function inferServiceDomain(skillName: string): string {
  if (skillName.includes('whitelist')) return 'forest.whitelist';
  if (skillName.includes('drop')) return 'forest.drop';
  if (skillName.includes('ai')) return 'forest.ai';
  if (skillName.includes('miniapp')) return 'forest.miniapp';
  if (skillName.includes('profile') || skillName.includes('-user')) {
    return 'forest.profile';
  }
  if (skillName.includes('watch-market-signals') || skillName.includes('realtime')) {
    return 'forest.realtime';
  }
  if (skillName.includes('quote')) return 'forest.quote';
  if (skillName.includes('query-collections') || skillName.includes('collection') || skillName.includes('discover') || skillName.includes('-system')) {
    return 'forest.discover';
  }
  if (
    skillName.includes('create') ||
    skillName.includes('issue') ||
    skillName.includes('token-adapter') ||
    skillName.includes('sync') ||
    skillName.includes('platform')
  ) {
    return 'forest.create';
  }
  return 'forest.market';
}

function inferServiceKey(skillName: string, kind: SkillKind): string {
  const domain = inferServiceDomain(skillName);
  const suffix =
    kind === 'workflow' ? 'workflow' : kind === 'method.contract' ? 'contract' : 'api';
  return `${domain}.${suffix}`;
}

function isServiceKeyAllowed(serviceKey: string): boolean {
  for (const pattern of FOREST_SERVICE_KEYS) {
    const prefix = pattern.replace(/\.\*$/, '.');
    if (serviceKey.startsWith(prefix)) return true;
  }
  return false;
}

export const FOREST_SKILLS: Record<string, ForestSkillDefinition> =
  Object.fromEntries(
    Object.entries(FOREST_SKILL_BINDINGS).map(([name, binding]) => {
      const kind = inferKind(binding);
      const serviceKey = inferServiceKey(name, kind);
      if (!isServiceKeyAllowed(serviceKey)) {
        throw new Error(`Service key "${serviceKey}" is outside forest service namespaces.`);
      }
      return [
        name,
        {
          name,
          ...binding,
          kind,
          serviceKey,
        } as ForestSkillDefinition,
      ];
    }),
  );

export function getForestSkill(name: string): ForestSkillDefinition | null {
  return FOREST_SKILLS[name] || null;
}

export function listForestSkills(): ForestSkillDefinition[] {
  return Object.values(FOREST_SKILLS);
}

export function listForestSkillsByTier(tier: SkillTier): ForestSkillDefinition[] {
  return listForestSkills().filter((skill) => skill.tier === tier);
}
