import { Client, TokenInfoQuery, PrivateKey } from "@hashgraph/sdk";
import dotenv from "dotenv";
dotenv.config();

async function checkWishToken() {
    const client = Client.forTestnet();
    
    // Set operator
    const controllerAccountId = process.env.CONTROLLER_ACCOUNT_ID;
    const controllerPrivateKey = PrivateKey.fromString(process.env.CONTROLLER_PRIVATE_KEY);
    client.setOperator(controllerAccountId, controllerPrivateKey);
    
    const wishTokenId = process.env.WISH_TOKEN_ID;
    
    try {
        console.log(`Checking $WISH token info for: ${wishTokenId}\n`);
        
        const tokenInfo = await new TokenInfoQuery()
            .setTokenId(wishTokenId)
            .execute(client);
        
        console.log("=== $WISH TOKEN CONFIGURATION ===");
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
        
        console.log("\n=== $WISH DISTRIBUTION CAPABILITY ===");
        if (tokenInfo.supplyKey) {
            console.log("✅ $WISH CAN be minted (has supply key)");
            console.log(`✅ Can mint to treasury: ${tokenInfo.treasuryAccountId}`);
            console.log("✅ Ready for daily snapshot distribution");
        } else {
            console.log("❌ $WISH CANNOT be minted (no supply key)");
        }
        
        console.log("\n=== TRANSFERABILITY ===");
        if (tokenInfo.freezeKey) {
            console.log("✅ $WISH has freeze capability");
            console.log(`Default freeze status: ${tokenInfo.defaultFreezeStatus ? 'FROZEN' : 'UNFROZEN'}`);
            console.log("✅ $WISH is transferable (unlike $DRIP)");
        } else {
            console.log("❌ $WISH has no freeze capability");
        }
        
    } catch (error) {
        console.error("❌ Failed to query $WISH token info:", error.message);
    } finally {
        client.close();
    }
}

checkWishToken();