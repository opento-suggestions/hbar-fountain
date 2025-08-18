# Hedera Reference Guide - HCS/HTS/EVM

## Fountain Protocol Core Concepts

### Three Native Tokens
- **$DRIP**: Non-transferable fungible token (HTS with freeze mechanics)
- **$WISH**: Utility token with ERC-20 compatibility (daily claim/burn)
- **$DROP**: Non-fungible recognition token (NFT for donors)

### Key Architecture
- **HTS (Hedera Token Service)**: Native tokenization with freeze/pause/wipe capabilities
- **HCS (Hedera Consensus Service)**: Daily state snapshots at 00:00 UTC
- **Mirror Node**: REST API for balance queries and audit trails
- **Off-chain Keeper**: Automated snapshot and distribution service

## HTS (Hedera Token Service) Documentation

### Core Token Operations
- **Native Tokenization**: https://docs.hedera.com/hedera/core-concepts/tokens/hedera-token-service-hts-native-tokenization
- **Token Creation/Keys**: https://docs.hedera.com/hedera/sdks-and-apis/sdks/token-service/define-a-token
- **Freeze Account**: https://docs.hedera.com/hedera/sdks-and-apis/sdks/token-service/freeze-an-account
- **Unfreeze Account**: https://docs.hedera.com/hedera/sdks-and-apis/hedera-api/tokenservice/tokenunfreezeaccount
- **Pause Token**: https://docs.hedera.com/hedera/sdks-and-apis/sdks/token-service/pause-a-token
- **Pause API**: https://docs.hedera.com/hedera/sdks-and-apis/hedera-api/tokenservice/tokenpause
- **Wipe Token**: https://docs.hedera.com/hedera/sdks-and-apis/sdks/token-service/wipe-a-token
- **Tutorial - Pause/Freeze/Wipe**: https://docs.hedera.com/hedera/tutorials/smart-contracts/hts-x-evm-part-3-how-to-pause-freeze-wipe-and-delete-nfts

### Token Configuration Patterns

#### $DRIP Token (Non-transferable)
- **freezeDefault = true**: All accounts start frozen
- **freezeKey**: Protocol-controlled for distribution
- **adminKey**: Metadata updates
- **supplyKey**: Mint new tokens
- **Process**: Unfreeze → Transfer → Re-freeze

#### $WISH Token (ERC-20 Compatible)
- **freezeDefault = false**: Standard fungible behavior
- **adminKey + supplyKey**: Controlled minting
- **wipeKey**: Optional for burning from accounts
- **18 decimals**: ERC-20 standard
- **Lifetime cap**: 1,000 per $DRIP owned

#### $DROP Token (NFT Recognition)
- **NON_FUNGIBLE_UNIQUE**: Each has unique serial
- **supplyKey**: Mint on donation threshold
- **adminKey**: Management
- **Once per wallet**: Enforced off-chain

## HTS x EVM Integration

### System Smart Contracts
- **HTS Precompile (0x167)**: https://docs.hedera.com/hedera/core-concepts/smart-contracts/system-smart-contracts
- **HIP-206 Spec**: https://hips.hedera.com/HIP/hip-206.html
- **ERC-20 on Hedera**: https://docs.hedera.com/hedera/core-concepts/smart-contracts/tokens-managed-by-smart-contracts/erc-20-fungible-tokens
- **EVM-Compatible Tokenization**: https://docs.hedera.com/hedera/core-concepts/tokens/erc-evm-compatible-tokenization

### Key EVM Concepts
- HTS tokens get Solidity contract addresses
- ERC-20 interface calls trigger HTS operations
- Compatible with DEXes like SaucerSwap
- Use IHederaTokenService interface

## HCS (Hedera Consensus Service)

### Topic Operations
- **Create Topic**: https://docs.hedera.com/hedera/sdks-and-apis/sdks/consensus-service/create-a-topic
- **Submit Message**: https://docs.hedera.com/hedera/sdks-and-apis/sdks/consensus-service/submit-a-message
- **Tutorial**: https://docs.hedera.com/hedera/tutorials/consensus/submit-your-first-message

### Daily Snapshot Process
1. **Query Mirror Node**: Get $DRIP balances at 00:00 UTC
2. **Compute Metrics**: Calculate Nₜ, Dₜ, gₜ, C, Mₜ, Bₜ, Eₜ
3. **Submit to HCS**: Publish JSON snapshot to topic
4. **Immutable Log**: Time-ordered, consensus-backed audit trail

## Mirror Node REST API

### Core Endpoints
- **API Overview**: https://docs.hedera.com/hedera/sdks-and-apis/rest-api
- **Balances**: https://docs.hedera.com/hedera/sdks-and-apis/rest-api/balances
- **Tokens**: https://docs.hedera.com/hedera/sdks-and-apis/rest-api/tokens
- **Mirror Nodes Concepts**: https://docs.hedera.com/hedera/core-concepts/mirror-nodes

### Key API Patterns
```
/api/v1/tokens/{tokenId}/balances?timestamp=...
/api/v1/accounts/{accountId}/nfts
/api/v1/accounts/{accountId}/tokens
/api/v1/topics/{topicId}/messages
/api/v1/accounts/{account}/transactions
```

### Testnet Base URL
```
https://testnet.mirrornode.hedera.com
```

## Wallet Integration

### HashPack/HashConnect
- **HashConnect Library**: https://github.com/Hashpack/hashconnect
- **WalletConnect Docs**: https://docs.hashpack.app/dapp-developers/walletconnect
- **Developer Hub**: https://www.hashpack.app/developers

## DEX Integration (SaucerSwap)

### Documentation
- **SaucerSwap Docs**: https://docs.saucerswap.finance/
- **V2 Whitepaper**: https://www.saucerswap.finance/whitepaper-v2.pdf

## Protocol Operations Flow

### Daily Cycle (00:00 UTC)
1. **Snapshot**: Query Mirror Node for $DRIP distribution
2. **Calculate**: Compute daily metrics and entitlements
3. **Publish**: Submit snapshot to HCS topic
4. **Mint**: Create new $WISH for distribution
5. **Enable Claims**: Allow users to claim entitlements

### Claim Process
1. **User Initiates**: Trigger claim transaction/endpoint
2. **Verify Eligibility**: Check against snapshot + lifetime caps
3. **Transfer**: HTS CryptoTransfer from treasury
4. **Update Records**: Track cumulative claims

### Redemption Process
1. **Send to Sink**: User transfers $WISH to burn address
2. **Monitor**: Backend watches sink balance
3. **Burn**: TokenBurnTransaction or TokenWipeTransaction
4. **Update Supply**: Adjust circulating supply

## Key Implementation Notes

- **Off-chain Enforcement**: Caps and time limits enforced by keeper service
- **UTC Alignment**: Use NTP for precise daily timing
- **Consensus Receipts**: Wait for transaction confirmation
- **Database Tracking**: Maintain cumulative claim records
- **Error Handling**: Retry logic for failed operations
- **Auto-renewal**: Monitor account/token expiry