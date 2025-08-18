import { Client, AccountId, PrivateKey, TokenCreateTransaction, TokenType, TokenSupplyType } from '@hashgraph/sdk';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

async function createNewDripToken() {
    const operatorId = AccountId.fromString(process.env.OPERATOR_ID);
    const operatorKey = PrivateKey.fromStringED25519(process.env.OPERATOR_KEY);    
    
    const client = Client.forTestnet();
    client.setOperator(operatorId, operatorKey);
    
    console.log("Creating NEW DRIP token with wipe capability...");
    
    const dripTokenCreateTx = await new TokenCreateTransaction()
        .setTokenName("Fountain Protocol DRIP v2")
        .setTokenSymbol("DRIP")
        .setTokenType(TokenType.FungibleCommon)
        .setDecimals(0)
        .setInitialSupply(0)
        .setSupplyType(TokenSupplyType.Infinite)
        .setTreasuryAccountId(operatorId)
        .setSupplyKey(operatorKey)
        .setFreezeKey(operatorKey)
        .setWipeKey(operatorKey)  // NEW: Wipe capability!
        .setFreezeDefault(false)
        .execute(client);
    
    const dripReceipt = await dripTokenCreateTx.getReceipt(client);
    const newDripTokenId = dripReceipt.tokenId;
    
    console.log(`✅ NEW DRIP v2 token created! Token ID: ${newDripTokenId}`);
    console.log(`🔧 UPDATE YOUR CONFIG.JS with this new DRIP ID!`);
    console.log(`✅ Complete Fountain Protocol Token Suite v2:`);
    console.log(`   💧 $DRIP v2 (with wipe): ${newDripTokenId}`);
    console.log(`   ✨ $WISH: 0.0.6590974`);
    console.log(`   🎁 $DROP: 0.0.6590982`);
    console.log(`   📡 HCS Topic: 0.0.6591043`);
}

createNewDripToken().catch(console.error);