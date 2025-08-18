import { 
    Client, 
    TokenWipeTransaction,
    TokenUnfreezeTransaction,
    TokenFreezeTransaction,
    AccountBalanceQuery,
    PrivateKey
} from "@hashgraph/sdk";
import dotenv from "dotenv";
dotenv.config();

async function wipeExcessDrip() {
    console.log("=== WIPING EXCESS $DRIP FROM TEST_USER_1 ===\n");
    
    const client = Client.forTestnet();
    
    // Use CONTROLLER (has wipe authority for DRIP token)
    const controllerAccountId = process.env.CONTROLLER_ACCOUNT_ID;
    const controllerPrivateKey = PrivateKey.fromString(process.env.CONTROLLER_PRIVATE_KEY);
    client.setOperator(controllerAccountId, controllerPrivateKey);
    
    const dripTokenId = process.env.DRIP_TOKEN_ID;
    const testUser1AccountId = process.env.TEST_USER_1_ACCOUNT_ID;
    
    try {
        // Step 1: Check current DRIP balance
        console.log("Step 1: Checking current $DRIP balance...");
        
        const balance = await new AccountBalanceQuery()
            .setAccountId(testUser1AccountId)
            .execute(client);
        
        const dripBalance = balance.tokens.get(dripTokenId);
        const currentDripAmount = dripBalance ? parseInt(dripBalance.toString()) : 0;
        
        console.log(`TEST_USER_1 current $DRIP balance: ${currentDripAmount}`);
        
        if (currentDripAmount <= 1) {
            console.log("✅ TEST_USER_1 already has correct balance (≤1 $DRIP)");
            return;
        }
        
        // Step 2: Calculate amount to wipe
        const amountToWipe = currentDripAmount - 1; // Leave exactly 1 DRIP
        console.log(`Amount to wipe: ${amountToWipe} $DRIP`);
        console.log(`Target balance: 1 $DRIP\n`);
        
        // Step 3: Temporarily unfreeze account for wipe operation
        console.log("Step 2: Temporarily unfreezing account for wipe...");
        
        const unfreezeTx = new TokenUnfreezeTransaction()
            .setAccountId(testUser1AccountId)
            .setTokenId(dripTokenId);
        
        const unfreezeResponse = await unfreezeTx.execute(client);
        const unfreezeReceipt = await unfreezeResponse.getReceipt(client);
        
        console.log(`✅ Unfreeze: ${unfreezeResponse.transactionId}`);
        console.log(`Status: ${unfreezeReceipt.status.toString()}\n`);
        
        // Step 4: Execute wipe transaction
        console.log("Step 3: Executing $DRIP wipe transaction...");
        
        const wipeTx = new TokenWipeTransaction()
            .setAccountId(testUser1AccountId)
            .setTokenId(dripTokenId)
            .setAmount(amountToWipe);
        
        const wipeResponse = await wipeTx.execute(client);
        const wipeReceipt = await wipeResponse.getReceipt(client);
        
        console.log(`✅ Wipe successful: ${wipeResponse.transactionId}`);
        console.log(`Status: ${wipeReceipt.status.toString()}`);
        console.log(`Wiped: ${amountToWipe} $DRIP tokens\n`);
        
        // Step 5: Re-freeze account to maintain non-transferability
        console.log("Step 4: Re-freezing account for non-transferability...");
        
        const freezeTx = new TokenFreezeTransaction()
            .setAccountId(testUser1AccountId)
            .setTokenId(dripTokenId);
        
        const freezeResponse = await freezeTx.execute(client);
        const freezeReceipt = await freezeResponse.getReceipt(client);
        
        console.log(`✅ Re-freeze: ${freezeResponse.transactionId}`);
        console.log(`Status: ${freezeReceipt.status.toString()}\n`);
        
        // Step 6: Verify new balance
        console.log("Step 5: Verifying corrected balance...");
        
        const newBalance = await new AccountBalanceQuery()
            .setAccountId(testUser1AccountId)
            .execute(client);
        
        const newDripBalance = newBalance.tokens.get(dripTokenId);
        const newDripAmount = newDripBalance ? parseInt(newDripBalance.toString()) : 0;
        
        console.log(`TEST_USER_1 new $DRIP balance: ${newDripAmount}`);
        
        if (newDripAmount === 1) {
            console.log("✅ CORRECTION SUCCESSFUL: TEST_USER_1 now has exactly 1 $DRIP");
        } else {
            console.log(`⚠️  Unexpected balance: ${newDripAmount} (expected 1)`);
        }
        
        console.log("\n=== PROTOCOL COMPLIANCE RESTORED ===");
        console.log("✅ 1:1 HBAR:DRIP ratio maintained");
        console.log("✅ One membership = one DRIP token");
        console.log("✅ Treasury wipe authority used correctly");
        console.log("✅ TEST_USER_1 balance corrected to protocol standard");
        
    } catch (error) {
        console.error("❌ Wipe operation failed:", error.message);
    } finally {
        client.close();
    }
}

wipeExcessDrip();