/**
 * Forest JSON Schema registry.
 */

type JsonSchema = Record<string, any>;

const COMMON_SCHEMA_JSON = `
{
  "schema.common.inputBase.v1": {
    "type": "object",
    "properties": {
      "env": {"type": "string", "enum": ["mainnet", "testnet"], "default": "mainnet"},
      "dryRun": {"type": "boolean", "default": false},
      "traceId": {"type": "string"},
      "timeoutMs": {"type": "integer", "minimum": 1000, "maximum": 180000}
    },
    "required": ["env"]
  },
  "schema.common.success.v1": {
    "type": "object",
    "properties": {
      "success": {"const": true},
      "code": {"type": "string", "enum": ["OK"]},
      "data": {"type": "object"},
      "warnings": {"type": "array", "items": {"type": "string"}},
      "traceId": {"type": "string"}
    },
    "required": ["success", "code", "data", "warnings"]
  },
  "schema.common.failure.v1": {
    "type": "object",
    "properties": {
      "success": {"const": false},
      "code": {
        "type": "string",
        "enum": [
          "INVALID_PARAMS",
          "SERVICE_DISABLED",
          "MAINTENANCE",
          "UPSTREAM_ERROR",
          "ONCHAIN_REVERT",
          "TX_TIMEOUT",
          "UNAUTHORIZED",
          "RATE_LIMITED",
          "INTERNAL_ERROR"
        ]
      },
      "message": {"type": "string"},
      "maintenance": {"type": "boolean"},
      "retryable": {"type": "boolean"},
      "traceId": {"type": "string"},
      "details": {"type": "object"}
    },
    "required": ["success", "code", "message"]
  }
}
`;

const WORKFLOW_SCHEMA_JSON = `
{
  "schema.workflow.createCollection.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "payload": {
        "type": "object",
        "required": ["symbol", "tokenName", "seedSymbol", "issueChainId", "owner", "issuer", "externalInfo"],
        "properties": {
          "symbol": {"type": "string"},
          "tokenName": {"type": "string"},
          "seedSymbol": {"type": "string"},
          "issueChainId": {"type": "string", "enum": ["AELF", "tDVV", "tDVW"]},
          "owner": {"type": "string"},
          "issuer": {"type": "string"},
          "isBurnable": {"type": "boolean", "default": true},
          "externalInfo": {"type": "object"}
        }
      }
    },
    "required": ["payload"]
  },
  "schema.workflow.createCollection.out.v1": {
    "allOf": [{"$ref": "schema.common.success.v1"}],
    "properties": {
      "data": {
        "type": "object",
        "required": ["transactionId", "symbol"],
        "properties": {
          "transactionId": {"type": "string"},
          "symbol": {"type": "string"},
          "crossChainSynced": {"type": "boolean"}
        }
      }
    }
  },

  "schema.workflow.createItem.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "payload": {
        "type": "object",
        "required": ["symbol", "tokenName", "owner", "issuer", "issueChainId", "totalSupply", "externalInfo"],
        "properties": {
          "symbol": {"type": "string"},
          "tokenName": {"type": "string"},
          "owner": {"type": "string"},
          "issuer": {"type": "string"},
          "issueChainId": {"type": "string", "enum": ["AELF", "tDVV", "tDVW"]},
          "totalSupply": {"type": "integer", "minimum": 1},
          "externalInfo": {"type": "object"}
        }
      }
    },
    "required": ["payload"]
  },
  "schema.workflow.createItem.out.v1": {
    "allOf": [{"$ref": "schema.common.success.v1"}],
    "properties": {
      "data": {
        "type": "object",
        "required": ["transactionId", "symbol"],
        "properties": {
          "transactionId": {"type": "string"},
          "symbol": {"type": "string"},
          "issued": {"type": "boolean"}
        }
      }
    }
  },

  "schema.workflow.batchCreateItems.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "payload": {
        "type": "object",
        "required": ["items", "proxyOwnerAddress", "proxyIssuerAddress"],
        "properties": {
          "proxyOwnerAddress": {"type": "string"},
          "proxyIssuerAddress": {"type": "string"},
          "items": {"type": "array", "minItems": 1, "items": {"type": "object"}}
        }
      }
    },
    "required": ["payload"]
  },
  "schema.workflow.batchCreateItems.out.v1": {
    "allOf": [{"$ref": "schema.common.success.v1"}],
    "properties": {
      "data": {
        "type": "object",
        "required": ["transactionId", "count"],
        "properties": {
          "transactionId": {"type": "string"},
          "count": {"type": "integer"}
        }
      }
    }
  },

  "schema.workflow.listItem.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "payload": {
        "type": "object",
        "required": ["symbol", "quantity", "price", "duration", "chain"],
        "properties": {
          "symbol": {"type": "string"},
          "quantity": {"type": "integer", "minimum": 1},
          "price": {
            "type": "object",
            "required": ["symbol", "amount"],
            "properties": {
              "symbol": {"type": "string"},
              "amount": {"type": "number"}
            }
          },
          "duration": {"type": "object"},
          "chain": {"type": "string", "enum": ["AELF", "tDVV", "tDVW"]}
        }
      }
    },
    "required": ["payload"]
  },
  "schema.workflow.listItem.out.v1": {
    "allOf": [{"$ref": "schema.common.success.v1"}],
    "properties": {
      "data": {
        "type": "object",
        "required": ["transactionId"],
        "properties": {
          "transactionId": {"type": "string"}
        }
      }
    }
  },

  "schema.workflow.buyNow.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "payload": {
        "type": "object",
        "required": ["symbol", "fixPriceList", "chain"],
        "properties": {
          "symbol": {"type": "string"},
          "chain": {"type": "string", "enum": ["AELF", "tDVV", "tDVW"]},
          "fixPriceList": {"type": "array", "minItems": 1, "items": {"type": "object"}}
        }
      }
    },
    "required": ["payload"]
  },
  "schema.workflow.buyNow.out.v1": {
    "allOf": [{"$ref": "schema.common.success.v1"}],
    "properties": {
      "data": {
        "type": "object",
        "required": ["transactionId"],
        "properties": {
          "transactionId": {"type": "string"},
          "gasFee": {"type": "number"},
          "partialFailed": {"type": "boolean"}
        }
      }
    }
  },

  "schema.workflow.makeOffer.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "payload": {
        "type": "object",
        "required": ["symbol", "quantity", "price", "chain"],
        "properties": {
          "symbol": {"type": "string"},
          "offerTo": {"type": "string"},
          "quantity": {"type": "integer", "minimum": 1},
          "price": {"type": "object"},
          "expireTime": {"type": "integer"},
          "chain": {"type": "string", "enum": ["AELF", "tDVV", "tDVW"]}
        }
      }
    },
    "required": ["payload"]
  },
  "schema.workflow.makeOffer.out.v1": {
    "allOf": [{"$ref": "schema.common.success.v1"}],
    "properties": {
      "data": {
        "type": "object",
        "required": ["transactionId"],
        "properties": {
          "transactionId": {"type": "string"}
        }
      }
    }
  },

  "schema.workflow.dealOffer.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "payload": {
        "type": "object",
        "required": ["symbol", "offerFrom", "quantity", "price", "chain"],
        "properties": {
          "symbol": {"type": "string"},
          "offerFrom": {"type": "string"},
          "quantity": {"type": "integer", "minimum": 1},
          "price": {"type": "object"},
          "chain": {"type": "string", "enum": ["AELF", "tDVV", "tDVW"]}
        }
      }
    },
    "required": ["payload"]
  },
  "schema.workflow.dealOffer.out.v1": {
    "allOf": [{"$ref": "schema.common.success.v1"}],
    "properties": {
      "data": {
        "type": "object",
        "required": ["transactionId"],
        "properties": {
          "transactionId": {"type": "string"}
        }
      }
    }
  },

  "schema.workflow.cancelOffer.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "payload": {
        "type": "object",
        "required": ["mode", "chain"],
        "properties": {
          "mode": {"type": "string", "enum": ["single", "batch"]},
          "chain": {"type": "string", "enum": ["AELF", "tDVV", "tDVW"]},
          "params": {"type": "object"}
        }
      }
    },
    "required": ["payload"]
  },
  "schema.workflow.cancelOffer.out.v1": {
    "allOf": [{"$ref": "schema.common.success.v1"}],
    "properties": {
      "data": {
        "type": "object",
        "required": ["transactionId"],
        "properties": {
          "transactionId": {"type": "string"}
        }
      }
    }
  },

  "schema.workflow.cancelListing.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "payload": {
        "type": "object",
        "required": ["mode", "chain"],
        "properties": {
          "mode": {"type": "string", "enum": ["single", "batch", "batchDelist", "batchCancelList"]},
          "chain": {"type": "string", "enum": ["AELF", "tDVV", "tDVW"]},
          "params": {"type": "object"}
        }
      }
    },
    "required": ["payload"]
  },
  "schema.workflow.cancelListing.out.v1": {
    "allOf": [{"$ref": "schema.common.success.v1"}],
    "properties": {
      "data": {
        "type": "object",
        "required": ["transactionId"],
        "properties": {
          "transactionId": {"type": "string"}
        }
      }
    }
  },

  "schema.workflow.transferItem.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "payload": {
        "type": "object",
        "required": ["symbol", "to", "amount", "chain"],
        "properties": {
          "symbol": {"type": "string"},
          "to": {"type": "string"},
          "amount": {"type": "integer", "minimum": 1},
          "chain": {"type": "string", "enum": ["AELF", "tDVV", "tDVW"]}
        }
      }
    },
    "required": ["payload"]
  },
  "schema.workflow.transferItem.out.v1": {
    "allOf": [{"$ref": "schema.common.success.v1"}],
    "properties": {
      "data": {
        "type": "object",
        "required": ["transactionId"],
        "properties": {
          "transactionId": {"type": "string"}
        }
      }
    }
  },

  "schema.workflow.getPriceQuote.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "payload": {
        "type": "object",
        "required": ["symbol"],
        "properties": {
          "symbol": {"type": "string"},
          "nftId": {"type": "string"},
          "chain": {"type": "string"},
          "include": {
            "type": "array",
            "items": {
              "type": "string",
              "enum": ["tokenData", "nftMarketData", "saleInfo", "txFee"]
            }
          }
        }
      }
    },
    "required": ["payload"]
  },
  "schema.workflow.getPriceQuote.out.v1": {
    "allOf": [{"$ref": "schema.common.success.v1"}],
    "properties": {
      "data": {
        "type": "object",
        "properties": {
          "tokenPrice": {"type": "object"},
          "marketPrice": {"type": "object"},
          "saleInfo": {"type": "object"},
          "txFee": {"type": "object"}
        }
      }
    }
  },

  "schema.workflow.issueItem.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "payload": {
        "type": "object",
        "required": ["symbol", "amount", "to", "chain"],
        "properties": {
          "symbol": {"type": "string"},
          "amount": {"type": "number"},
          "to": {"type": "string"},
          "chain": {"type": "string", "enum": ["AELF", "tDVV", "tDVW"]},
          "issuer": {"type": "string"},
          "memo": {"type": "string"}
        }
      }
    },
    "required": ["payload"]
  },
  "schema.workflow.issueItem.out.v1": {
    "allOf": [{"$ref": "schema.common.success.v1"}],
    "properties": {
      "data": {
        "type": "object",
        "required": ["transactionId"],
        "properties": {
          "transactionId": {"type": "string"},
          "proxyIssuer": {"type": "string"}
        }
      }
    }
  },

  "schema.workflow.placeBid.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "payload": {
        "type": "object",
        "required": ["auctionId", "amount", "chain"],
        "properties": {
          "auctionId": {"type": "string"},
          "amount": {"type": "number"},
          "chain": {"type": "string"}
        }
      }
    },
    "required": ["payload"]
  },
  "schema.workflow.placeBid.out.v1": {
    "allOf": [{"$ref": "schema.common.success.v1"}],
    "properties": {
      "data": {
        "type": "object",
        "required": ["transactionId"],
        "properties": {
          "transactionId": {"type": "string"}
        }
      }
    }
  },

  "schema.workflow.claimDrop.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "payload": {
        "type": "object",
        "required": ["dropId", "claimAmount", "chain"],
        "properties": {
          "dropId": {"type": "string"},
          "claimAmount": {"type": "number"},
          "chain": {"type": "string"}
        }
      }
    },
    "required": ["payload"]
  },
  "schema.workflow.claimDrop.out.v1": {
    "allOf": [{"$ref": "schema.common.success.v1"}],
    "properties": {
      "data": {
        "type": "object",
        "required": ["transactionId"],
        "properties": {
          "transactionId": {"type": "string"},
          "claimDetailList": {"type": "array"}
        }
      }
    }
  },

  "schema.workflow.queryDrop.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "action": {"type": "string", "enum": ["list", "detail", "quota", "recommendation"]},
      "params": {"type": "object"}
    },
    "required": ["action"]
  },
  "schema.workflow.queryDrop.out.v1": {
    "allOf": [{"$ref": "schema.common.success.v1"}]
  },

  "schema.workflow.whitelistRead.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "action": {
        "type": "string",
        "enum": [
          "getWhitelist",
          "getWhitelistDetail",
          "getAddressFromWhitelist",
          "getTagInfoFromWhitelist",
          "getWhitelistId",
          "getTagInfoListByWhitelist"
        ]
      },
      "params": {"type": "object"}
    },
    "required": ["action", "params"]
  },
  "schema.workflow.whitelistRead.out.v1": {
    "allOf": [{"$ref": "schema.common.success.v1"}]
  },

  "schema.workflow.whitelistManage.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "action": {
        "type": "string",
        "enum": [
          "enable",
          "disable",
          "addAddressInfo",
          "removeInfo",
          "updateExtraInfo",
          "addExtraInfo",
          "removeTagInfo",
          "reset"
        ]
      },
      "params": {"type": "object"}
    },
    "required": ["action", "params"]
  },
  "schema.workflow.whitelistManage.out.v1": {
    "allOf": [{"$ref": "schema.common.success.v1"}]
  },

  "schema.workflow.aiGenerate.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "payload": {
        "type": "object",
        "required": ["prompt", "negativePrompt", "number", "size"],
        "properties": {
          "prompt": {"type": "string"},
          "negativePrompt": {"type": "string"},
          "number": {"type": "integer", "minimum": 1},
          "size": {"type": "string"},
          "style": {"type": "string"},
          "model": {"type": "string"}
        }
      }
    },
    "required": ["payload"]
  },
  "schema.workflow.aiGenerate.out.v1": {
    "allOf": [{"$ref": "schema.common.success.v1"}],
    "properties": {
      "data": {
        "type": "object",
        "properties": {
          "transactionId": {"type": "string"},
          "items": {"type": "array"}
        }
      }
    }
  },

  "schema.workflow.aiRetry.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "action": {"type": "string", "enum": ["retryByTransactionId", "listFailed", "listImages", "updateImageStatus"]},
      "params": {"type": "object"}
    },
    "required": ["action"]
  },
  "schema.workflow.aiRetry.out.v1": {
    "allOf": [{"$ref": "schema.common.success.v1"}]
  },

  "schema.workflow.platformNft.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "action": {"type": "string", "enum": ["create", "info"]},
      "params": {"type": "object"}
    },
    "required": ["action"]
  },
  "schema.workflow.platformNft.out.v1": {
    "allOf": [{"$ref": "schema.common.success.v1"}]
  },

  "schema.workflow.miniappAction.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "action": {
        "type": "string",
        "enum": [
          "userInfo",
          "watering",
          "claim",
          "levelUpdate",
          "activityList",
          "activityDetail",
          "pointsConvert",
          "friendList",
          "onchainAddPoints",
          "onchainLevelUpgrade",
          "onchainClaimPoints"
        ]
      },
      "params": {"type": "object"}
    },
    "required": ["action"]
  },
  "schema.workflow.miniappAction.out.v1": {
    "allOf": [{"$ref": "schema.common.success.v1"}]
  },

  "schema.workflow.updateProfile.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "payload": {
        "type": "object",
        "properties": {
          "name": {"type": "string"},
          "email": {"type": "string"},
          "twitter": {"type": "string"},
          "instagram": {"type": "string"},
          "bannerImage": {"type": "string"},
          "profileImage": {"type": "string"}
        }
      }
    },
    "required": ["payload"]
  },
  "schema.workflow.updateProfile.out.v1": {
    "allOf": [{"$ref": "schema.common.success.v1"}]
  },

  "schema.workflow.queryCollections.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "action": {
        "type": "string",
        "enum": [
          "collections",
          "searchCollections",
          "recommendedCollections",
          "collectionInfo",
          "compositeNftInfos",
          "traits",
          "generation",
          "rarity",
          "activities",
          "trending",
          "hot"
        ]
      },
      "params": {"type": "object"}
    },
    "required": ["action"]
  },
  "schema.workflow.queryCollections.out.v1": {
    "allOf": [{"$ref": "schema.common.success.v1"}]
  },

  "schema.workflow.watchSignals.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "action": {"type": "string", "enum": ["subscribe", "unsubscribe", "pullSnapshot"]},
      "channels": {
        "type": "array",
        "items": {
          "type": "string",
          "enum": [
            "ReceiveSymbolBidInfo",
            "ReceiveSymbolBidInfos",
            "ReceiveSymbolAuctionInfo",
            "ReceiveListingChangeSignal",
            "ReceiveOfferChangeSignal",
            "ReceiveMessageChangeSignal"
          ]
        }
      },
      "address": {"type": "string"}
    },
    "required": ["action"]
  },
  "schema.workflow.watchSignals.out.v1": {
    "allOf": [{"$ref": "schema.common.success.v1"}],
    "properties": {
      "data": {
        "type": "object",
        "properties": {
          "events": {"type": "array"}
        }
      }
    }
  }
}
`;

const METHOD_CONTRACT_SCHEMA_JSON = `
{
  "schema.method.contract.market.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "method": {
        "type": "string",
        "enum": [
          "MakeOffer",
          "Deal",
          "Delist",
          "CancelOfferListByExpireTime",
          "GetListedNFTInfoList",
          "ListWithFixedPrice",
          "GetTotalOfferAmount",
          "GetTotalEffectiveListedNFTAmount",
          "BatchBuyNow",
          "BatchDeList",
          "BatchCancelList",
          "BatchCancelOfferList"
        ]
      },
      "chain": {"type": "string", "enum": ["AELF", "tDVV", "tDVW"]},
      "args": {"type": "object"}
    },
    "required": ["method", "args"]
  },
  "schema.method.contract.market.out.v1": {
    "oneOf": [{"$ref": "schema.common.success.v1"}, {"$ref": "schema.common.failure.v1"}]
  },

  "schema.method.contract.multitoken.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "method": {
        "type": "string",
        "enum": ["Create", "Issue", "GetBalance", "GetTokenInfo", "Transfer", "GetAllowance", "Approve"]
      },
      "chain": {"type": "string"},
      "args": {"type": "object"}
    },
    "required": ["method", "args"]
  },
  "schema.method.contract.multitoken.out.v1": {
    "oneOf": [{"$ref": "schema.common.success.v1"}, {"$ref": "schema.common.failure.v1"}]
  },

  "schema.method.contract.tokenAdapter.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "method": {"type": "string", "enum": ["CreateToken"]},
      "args": {"type": "object"}
    },
    "required": ["method", "args"]
  },
  "schema.method.contract.tokenAdapter.out.v1": {
    "oneOf": [{"$ref": "schema.common.success.v1"}, {"$ref": "schema.common.failure.v1"}]
  },

  "schema.method.contract.proxy.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "method": {
        "type": "string",
        "enum": ["GetProxyAccountByProxyAccountAddress", "ForwardCall", "BatchCreateNFT"]
      },
      "chain": {"type": "string"},
      "args": {"type": "object"}
    },
    "required": ["method", "args"]
  },
  "schema.method.contract.proxy.out.v1": {
    "oneOf": [{"$ref": "schema.common.success.v1"}, {"$ref": "schema.common.failure.v1"}]
  },

  "schema.method.contract.auction.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "method": {"type": "string", "enum": ["PlaceBid"]},
      "args": {"type": "object"}
    },
    "required": ["method", "args"]
  },
  "schema.method.contract.auction.out.v1": {
    "oneOf": [{"$ref": "schema.common.success.v1"}, {"$ref": "schema.common.failure.v1"}]
  },

  "schema.method.contract.drop.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "method": {"type": "string", "enum": ["ClaimDrop"]},
      "args": {"type": "object"}
    },
    "required": ["method", "args"]
  },
  "schema.method.contract.drop.out.v1": {
    "oneOf": [{"$ref": "schema.common.success.v1"}, {"$ref": "schema.common.failure.v1"}]
  },

  "schema.method.contract.whitelist.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "method": {
        "type": "string",
        "enum": [
          "GetAddressFromWhitelist",
          "GetWhitelist",
          "GetTagInfoFromWhitelist",
          "GetWhitelistDetail",
          "GetWhitelistId",
          "GetTagInfoListByWhitelist",
          "EnableWhitelist",
          "DisableWhitelist",
          "RemoveInfoFromWhitelist",
          "AddAddressInfoListToWhitelist",
          "UpdateExtraInfo",
          "RemoveTagInfo",
          "AddExtraInfo",
          "ResetWhitelist"
        ]
      },
      "args": {"type": "object"},
      "chain": {"type": "string"}
    },
    "required": ["method", "args"]
  },
  "schema.method.contract.whitelist.out.v1": {
    "oneOf": [{"$ref": "schema.common.success.v1"}, {"$ref": "schema.common.failure.v1"}]
  },

  "schema.method.contract.miniapp.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "method": {"type": "string", "enum": ["AddTreePoints", "TreeLevelUpgrade", "ClaimTreePoints"]},
      "args": {"type": "object"}
    },
    "required": ["method", "args"]
  },
  "schema.method.contract.miniapp.out.v1": {
    "oneOf": [{"$ref": "schema.common.success.v1"}, {"$ref": "schema.common.failure.v1"}]
  }
}
`;

const METHOD_API_SCHEMA_JSON = `
{
  "schema.method.api.market.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "action": {
        "type": "string",
        "enum": [
          "fetchTokens",
          "fetchNftOffers",
          "fetchListings",
          "fetchActivities",
          "fetchGetTokenData",
          "fetchGetNftPrices",
          "fetchNftSalesInfo",
          "fetchTransactionFee",
          "fetchNftInfoOwners",
          "fetchOfferMade",
          "fetchReceivedOffer",
          "fetchMoreListings"
        ]
      },
      "params": {"type": "object"}
    },
    "required": ["action"]
  },
  "schema.method.api.market.out.v1": {
    "oneOf": [{"$ref": "schema.common.success.v1"}, {"$ref": "schema.common.failure.v1"}]
  },

  "schema.method.api.nft.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "action": {
        "type": "string",
        "enum": [
          "fetchNftInfo",
          "fetchNftTraitsInfo",
          "fetchNftInfos",
          "fetchCompositeNftInfos",
          "fetchSaveNftItemInfos",
          "batchSaveNftItemsInfos",
          "fetchHotNFTs"
        ]
      },
      "params": {"type": "object"}
    },
    "required": ["action"]
  },
  "schema.method.api.nft.out.v1": {
    "oneOf": [{"$ref": "schema.common.success.v1"}, {"$ref": "schema.common.failure.v1"}]
  },

  "schema.method.api.collection.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "action": {
        "type": "string",
        "enum": [
          "fetchCollections",
          "fetchSearchCollections",
          "fetchRecommendedCollections",
          "fetchRecommendCollections",
          "editCollectionInfo",
          "fetchNFTCollectionInfo",
          "fetchIsMinter",
          "fetchCollectionAllTraitsInfos",
          "fetchCollectionGenerationInfos",
          "fetchCollectionRarityInfos",
          "fetchCollectionActivities",
          "fetchTrendingCollections"
        ]
      },
      "params": {"type": "object"}
    },
    "required": ["action"]
  },
  "schema.method.api.collection.out.v1": {
    "oneOf": [{"$ref": "schema.common.success.v1"}, {"$ref": "schema.common.failure.v1"}]
  },

  "schema.method.api.sync.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "action": {
        "type": "string",
        "enum": ["fetchSyncCollection", "fetchSyncResult", "fetchSyncResults", "fetchSaveCollectionInfos"]
      },
      "params": {"type": "object"}
    },
    "required": ["action"]
  },
  "schema.method.api.sync.out.v1": {
    "oneOf": [{"$ref": "schema.common.success.v1"}, {"$ref": "schema.common.failure.v1"}]
  },

  "schema.method.api.seedAuction.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "action": {
        "type": "string",
        "enum": [
          "fetchSymbolList",
          "fetchAllChainSymbolList",
          "fetchSymbolHasExisted",
          "fetchSpecialSeeds",
          "fetchAuctionInfo",
          "fetchBidInfos",
          "fetchMinMarkupPrice"
        ]
      },
      "params": {"type": "object"}
    },
    "required": ["action"]
  },
  "schema.method.api.seedAuction.out.v1": {
    "oneOf": [{"$ref": "schema.common.success.v1"}, {"$ref": "schema.common.failure.v1"}]
  },

  "schema.method.api.drop.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "action": {
        "type": "string",
        "enum": ["fetchRecommendAction", "fetchDropList", "fetchDropDetail", "fetchDropQuota"]
      },
      "params": {"type": "object"}
    },
    "required": ["action"]
  },
  "schema.method.api.drop.out.v1": {
    "oneOf": [{"$ref": "schema.common.success.v1"}, {"$ref": "schema.common.failure.v1"}]
  },

  "schema.method.api.whitelist.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "action": {
        "type": "string",
        "enum": [
          "fetchGetTags",
          "fetchWhitelistByHash",
          "fetchWhitelistExtraInfos",
          "fetchWhitelistManagers",
          "fetchWhiteListPriceTokens"
        ]
      },
      "params": {"type": "object"}
    },
    "required": ["action"]
  },
  "schema.method.api.whitelist.out.v1": {
    "oneOf": [{"$ref": "schema.common.success.v1"}, {"$ref": "schema.common.failure.v1"}]
  },

  "schema.method.api.ai.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "action": {
        "type": "string",
        "enum": [
          "fetchGenerate",
          "fetchCreateAIRetry",
          "fetchAiImages",
          "updateAiImagesStatus",
          "fetchRandomAIPrompt",
          "fetchFailedAIArtsNFT",
          "fetchRetryGenerateAIArts"
        ]
      },
      "params": {"type": "object"}
    },
    "required": ["action"]
  },
  "schema.method.api.ai.out.v1": {
    "oneOf": [{"$ref": "schema.common.success.v1"}, {"$ref": "schema.common.failure.v1"}]
  },

  "schema.method.api.platform.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "action": {"type": "string", "enum": ["fetchCreatePlatformNFT", "fetchCreatePlatformNFTInfo"]},
      "params": {"type": "object"}
    },
    "required": ["action"]
  },
  "schema.method.api.platform.out.v1": {
    "oneOf": [{"$ref": "schema.common.success.v1"}, {"$ref": "schema.common.failure.v1"}]
  },

  "schema.method.api.miniapp.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "action": {
        "type": "string",
        "enum": [
          "fetchMiniAppUserInfo",
          "fetchMiniAppWatering",
          "fetchMiniAppClaim",
          "fetchMiniAppFriendList",
          "fetchMiniAppActivityList",
          "fetchMiniAppActivityDetail",
          "fetchMiniAppLevelUpdate",
          "fetchMiniAppPointsConvert"
        ]
      },
      "params": {"type": "object"}
    },
    "required": ["action"]
  },
  "schema.method.api.miniapp.out.v1": {
    "oneOf": [{"$ref": "schema.common.success.v1"}, {"$ref": "schema.common.failure.v1"}]
  },

  "schema.method.api.user.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "action": {
        "type": "string",
        "enum": [
          "fetchUserInfo",
          "checkUserName",
          "saveUserSettings",
          "fetchMessageList",
          "fetchAvatar",
          "fetchNFTCollectionMyHold",
          "fetchNFTMyHoldSearch",
          "fetchCollectionsByMyCreated",
          "fetchActivitiesSearch"
        ]
      },
      "params": {"type": "object"}
    },
    "required": ["action"]
  },
  "schema.method.api.user.out.v1": {
    "oneOf": [{"$ref": "schema.common.success.v1"}, {"$ref": "schema.common.failure.v1"}]
  },

  "schema.method.api.system.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "action": {
        "type": "string",
        "enum": [
          "fetchChainsList",
          "fetchNftTypes",
          "fetchFooterNavItems",
          "fetchConfigItems",
          "fetchBanner",
          "fetchToken",
          "fetchNftRankingInfoApi"
        ]
      },
      "params": {"type": "object"}
    },
    "required": ["action"]
  },
  "schema.method.api.system.out.v1": {
    "oneOf": [{"$ref": "schema.common.success.v1"}, {"$ref": "schema.common.failure.v1"}]
  },

  "schema.method.api.realtime.in.v1": {
    "allOf": [{"$ref": "schema.common.inputBase.v1"}],
    "type": "object",
    "properties": {
      "action": {"type": "string", "enum": ["registerHandler", "unRegisterHandler", "sendEvent", "snapshot"]},
      "params": {"type": "object"}
    },
    "required": ["action"]
  },
  "schema.method.api.realtime.out.v1": {
    "oneOf": [{"$ref": "schema.common.success.v1"}, {"$ref": "schema.common.failure.v1"}]
  }
}
`;

const commonSchemas = JSON.parse(COMMON_SCHEMA_JSON) as Record<string, JsonSchema>;
const workflowSchemas = JSON.parse(WORKFLOW_SCHEMA_JSON) as Record<string, JsonSchema>;
const methodContractSchemas = JSON.parse(METHOD_CONTRACT_SCHEMA_JSON) as Record<string, JsonSchema>;
const methodApiSchemas = JSON.parse(METHOD_API_SCHEMA_JSON) as Record<string, JsonSchema>;

export const FOREST_SCHEMAS: Record<string, JsonSchema> = {
  ...commonSchemas,
  ...workflowSchemas,
  ...methodContractSchemas,
  ...methodApiSchemas,
};

export function getForestSchema(schemaRef: string): JsonSchema | null {
  return FOREST_SCHEMAS[schemaRef] || null;
}

export function hasForestSchema(schemaRef: string): boolean {
  return Object.prototype.hasOwnProperty.call(FOREST_SCHEMAS, schemaRef);
}

export function listForestSchemaRefs(): string[] {
  return Object.keys(FOREST_SCHEMAS);
}
