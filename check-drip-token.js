import { Client, TokenInfoQuery, PrivateKey } from "@hashgraph/sdk";
import dotenv from "dotenv";
dotenv.config();

async function checkDripToken() {
    const client = Client.forTestnet();
    
    // Set operator (any account can query token info)
    const controllerAccountId = process.env.CONTROLLER_ACCOUNT_ID;
    const controllerPrivateKey = PrivateKey.fromString(process.env.CONTROLLER_PRIVATE_KEY);
    client.setOperator(controllerAccountId, controllerPrivateKey);
    
    const dripTokenId = process.env.DRIP_TOKEN_ID;
    
    try {
        console.log(`Checking $DRIP token info for: ${dripTokenId}\n`);
        
        const tokenInfo = await new TokenInfoQuery()
            .setTokenId(dripTokenId)
            .execute(client);
        
        console.log("=== $DRIP TOKEN CONFIGURATION ===");
        console.log(`Name: ${tokenInfo.name}`);
        console.log(`Symbol: ${tokenInfo.symbol}`);
        console.log(`Decimals: ${tokenInfo.decimals}`);
        console.log(`Total Supply: ${tokenInfo.totalSupply}`);
        console.log(`Treasury Account: ${tokenInfo.treasuryAccountId}`);
        console.log(`Supply Type: ${tokenInfo.supplyType}`);
        console.log(`Max Supply: ${tokenInfo.maxSupply}`);
        console.log(`Freeze Default: ${tokenInfo.defaultFreezeStatus}`);
        
        console.log("\n=== TOKEN KEYS ===");
        console.log(`Admin Key: ${tokenInfo.adminKey ? 'SET' : 'NOT SET'}`);
        console.log(`Supply Key: ${tokenInfo.supplyKey ? 'SET' : 'NOT SET'}`);
        console.log(`Freeze Key: ${tokenInfo.freezeKey ? 'SET' : 'NOT SET'}`);
        console.log(`Wipe Key: ${tokenInfo.wipeKey ? 'SET' : 'NOT SET'}`);
        console.log(`KYC Key: ${tokenInfo.kycKey ? 'SET' : 'NOT SET'}`);
        console.log(`Pause Key: ${tokenInfo.pauseKey ? 'SET' : 'NOT SET'}`);
        
        console.log("\n=== MINTING CAPABILITY ===");
        if (tokenInfo.supplyKey) {
            console.log("✅ Token CAN be minted (has supply key)");
            console.log(`✅ Can mint to treasury: ${tokenInfo.treasuryAccountId}`);
        } else {
            console.log("❌ Token CANNOT be minted (no supply key)");
        }
        
        console.log("\n=== FREEZE MECHANICS ===");
        if (tokenInfo.freezeKey) {
            console.log("✅ Token has freeze capability");
            console.log(`Default freeze status: ${tokenInfo.defaultFreezeStatus ? 'FROZEN' : 'UNFROZEN'}`);
        } else {
            console.log("❌ Token has no freeze capability");
        }
        
    } catch (error) {
        console.error("❌ Failed to query token info:", error.message);
    } finally {
        client.close();
    }
}

checkDripToken();