export const CHAIN_SET = new Set(['AELF', 'tDVV', 'tDVW']);

export const CONTRACT_VIEW_METHODS: Record<string, Set<string>> = {
  'aelf-forest-contract-market': new Set([
    'GetListedNFTInfoList',
    'GetTotalOfferAmount',
    'GetTotalEffectiveListedNFTAmount',
  ]),
  'aelf-forest-contract-multitoken': new Set([
    'GetBalance',
    'GetTokenInfo',
    'GetAllowance',
  ]),
  'aelf-forest-contract-token-adapter': new Set([]),
  'aelf-forest-contract-proxy': new Set([
    'GetProxyAccountByProxyAccountAddress',
  ]),
  'aelf-forest-contract-auction': new Set([]),
  'aelf-forest-contract-drop': new Set([]),
  'aelf-forest-contract-whitelist': new Set([
    'GetAddressFromWhitelist',
    'GetWhitelist',
    'GetTagInfoFromWhitelist',
    'GetWhitelistDetail',
    'GetWhitelistId',
    'GetTagInfoListByWhitelist',
  ]),
  'aelf-forest-contract-miniapp': new Set([]),
};

export const DROP_ACTION_MAP: Record<string, string> = {
  list: 'fetchDropList',
  detail: 'fetchDropDetail',
  quota: 'fetchDropQuota',
  recommendation: 'fetchRecommendAction',
};

export const WHITELIST_READ_METHOD_MAP: Record<string, string> = {
  getWhitelist: 'GetWhitelist',
  getWhitelistDetail: 'GetWhitelistDetail',
  getAddressFromWhitelist: 'GetAddressFromWhitelist',
  getTagInfoFromWhitelist: 'GetTagInfoFromWhitelist',
  getWhitelistId: 'GetWhitelistId',
  getTagInfoListByWhitelist: 'GetTagInfoListByWhitelist',
};

export const WHITELIST_MANAGE_METHOD_MAP: Record<string, string> = {
  enable: 'EnableWhitelist',
  disable: 'DisableWhitelist',
  addAddressInfo: 'AddAddressInfoListToWhitelist',
  removeInfo: 'RemoveInfoFromWhitelist',
  updateExtraInfo: 'UpdateExtraInfo',
  addExtraInfo: 'AddExtraInfo',
  removeTagInfo: 'RemoveTagInfo',
  reset: 'ResetWhitelist',
};

export const AI_RETRY_ACTION_MAP: Record<string, string> = {
  retryByTransactionId: 'fetchRetryGenerateAIArts',
  listFailed: 'fetchFailedAIArtsNFT',
  listImages: 'fetchAiImages',
  updateImageStatus: 'updateAiImagesStatus',
};

export const PLATFORM_ACTION_MAP: Record<string, string> = {
  create: 'fetchCreatePlatformNFT',
  info: 'fetchCreatePlatformNFTInfo',
};

export const MINIAPP_API_ACTION_MAP: Record<string, string> = {
  userInfo: 'fetchMiniAppUserInfo',
  watering: 'fetchMiniAppWatering',
  claim: 'fetchMiniAppClaim',
  levelUpdate: 'fetchMiniAppLevelUpdate',
  activityList: 'fetchMiniAppActivityList',
  activityDetail: 'fetchMiniAppActivityDetail',
  pointsConvert: 'fetchMiniAppPointsConvert',
  friendList: 'fetchMiniAppFriendList',
};

export const MINIAPP_ONCHAIN_METHOD_MAP: Record<string, string> = {
  onchainAddPoints: 'AddTreePoints',
  onchainLevelUpgrade: 'TreeLevelUpgrade',
  onchainClaimPoints: 'ClaimTreePoints',
};

export const COLLECTION_ACTION_MAP: Record<string, string> = {
  collections: 'fetchCollections',
  searchCollections: 'fetchSearchCollections',
  recommendedCollections: 'fetchRecommendedCollections',
  collectionInfo: 'fetchNFTCollectionInfo',
  compositeNftInfos: 'fetchCompositeNftInfos',
  traits: 'fetchCollectionAllTraitsInfos',
  generation: 'fetchCollectionGenerationInfos',
  rarity: 'fetchCollectionRarityInfos',
  activities: 'fetchCollectionActivities',
  trending: 'fetchTrendingCollections',
  hot: 'fetchHotNFTs',
};

export const WATCH_SIGNAL_ACTION_MAP: Record<string, string> = {
  subscribe: 'registerHandler',
  unsubscribe: 'unRegisterHandler',
  pullSnapshot: 'snapshot',
};

export const QUOTE_INCLUDE_ACTIONS: Record<string, string> = {
  tokenData: 'fetchGetTokenData',
  nftMarketData: 'fetchGetNftPrices',
  saleInfo: 'fetchNftSalesInfo',
  txFee: 'fetchTransactionFee',
};
