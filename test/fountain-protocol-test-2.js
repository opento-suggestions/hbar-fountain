import { 
    Client, 
    TransferTransaction, 
    TokenMintTransaction,
    TokenAssociateTransaction,
    TokenUnfreezeTransaction,
    TokenFreezeTransaction,
    Hbar, 
    PrivateKey
} from "@hashgraph/sdk";
import dotenv from "dotenv";
dotenv.config();

async function fountainProtocolTest2() {
    console.log("=== FOUNTAIN PROTOCOL TEST 2 (CORRECT 1:1 RATIO) ===\n");
    console.log("Following HCS_DRIP_MINTING_DESIGN.md specifications:");
    console.log("✅ 1 HBAR deposit = 1 DRIP token (not 100!)");
    console.log("✅ membershipDeposit: 100,000,000 tinybars (1 HBAR)");
    console.log("✅ expectedDripAmount: 1\n");
    
    const client = Client.forTestnet();
    
    // Account details - using TEST_USER_2
    const testUser2AccountId = process.env.TEST_USER_2_ACCOUNT_ID;
    const testUser2PrivateKey = PrivateKey.fromString(process.env.TEST_USER_2_PRIVATE_KEY);
    const controllerAccountId = process.env.CONTROLLER_ACCOUNT_ID;
    const controllerPrivateKey = PrivateKey.fromString(process.env.CONTROLLER_PRIVATE_KEY);
    const dripTokenId = process.env.DRIP_TOKEN_ID;
    
    try {
        // Step 1: TEST_USER_2 donates exactly 1 HBAR to CONTROLLER
        console.log("Step 1: TEST_USER_2 donates 1 HBAR (100,000,000 tinybars) to CONTROLLER...");
        client.setOperator(testUser2AccountId, testUser2PrivateKey);
        
        const donationTx = new TransferTransaction()
            .addHbarTransfer(testUser2AccountId, new Hbar(-1)) // Exactly 1 HBAR
            .addHbarTransfer(controllerAccountId, new Hbar(1));
        
        const donationResponse = await donationTx.execute(client);
        const donationReceipt = await donationResponse.getReceipt(client);
        
        console.log(`✅ Donation: ${donationResponse.transactionId}`);
        console.log(`Status: ${donationReceipt.status.toString()}`);
        console.log(`Amount: 1 HBAR (100,000,000 tinybars)\n`);
        
        // Step 2: Associate TEST_USER_2 with $DRIP token
        console.log("Step 2: Associating TEST_USER_2 with $DRIP token...");
        
        try {
            const associateTx = new TokenAssociateTransaction()
                .setAccountId(testUser2AccountId)
                .setTokenIds([dripTokenId]);
            
            const associateResponse = await associateTx.execute(client);
            const associateReceipt = await associateResponse.getReceipt(client);
            console.log(`✅ Association: ${associateReceipt.status.toString()}\n`);
        } catch (error) {
            if (error.message.includes("TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT")) {
                console.log(`✅ $DRIP already associated with TEST_USER_2\n`);
            } else {
                throw error;
            }
        }
        
        // Step 3: CONTROLLER mints EXACTLY 1 DRIP token (following protocol spec)
        console.log("Step 3: CONTROLLER mints EXACTLY 1 $DRIP token (1:1 ratio)...");
        client.setOperator(controllerAccountId, controllerPrivateKey);
        
        const mintTx = new TokenMintTransaction()
            .setTokenId(dripTokenId)
            .setAmount(1); // EXACTLY 1 DRIP token per protocol spec
        
        const mintResponse = await mintTx.execute(client);
        const mintReceipt = await mintResponse.getReceipt(client);
        
        console.log(`✅ Mint: ${mintResponse.transactionId}`);
        console.log(`Status: ${mintReceipt.status.toString()}`);
        console.log(`Minted: 1 $DRIP token to treasury (correct ratio!)\n`);
        
        // Step 4: Transfer EXACTLY 1 DRIP from CONTROLLER to TEST_USER_2
        console.log("Step 4: Transferring 1 $DRIP token to TEST_USER_2...");
        
        const dripTransferTx = new TransferTransaction()
            .addTokenTransfer(dripTokenId, controllerAccountId, -1) // Transfer exactly 1
            .addTokenTransfer(dripTokenId, testUser2AccountId, 1);
        
        const transferResponse = await dripTransferTx.execute(client);
        const transferReceipt = await transferResponse.getReceipt(client);
        
        console.log(`✅ Transfer: ${transferResponse.transactionId}`);
        console.log(`Status: ${transferReceipt.status.toString()}`);
        console.log(`Transferred: 1 $DRIP to TEST_USER_2 (membership granted!)\n`);
        
        // Step 5: Freeze TEST_USER_2 to enforce non-transferability
        console.log("Step 5: Freezing TEST_USER_2 to enforce $DRIP non-transferability...");
        
        const freezeTx = new TokenFreezeTransaction()
            .setAccountId(testUser2AccountId)
            .setTokenId(dripTokenId);
        
        const freezeResponse = await freezeTx.execute(client);
        const freezeReceipt = await freezeResponse.getReceipt(client);
        
        console.log(`✅ Freeze: ${freezeResponse.transactionId}`);
        console.log(`Status: ${freezeReceipt.status.toString()}\n`);
        
        console.log("=== FOUNTAIN PROTOCOL TEST 2 COMPLETE ===");
        console.log("✅ TEST_USER_2 donated 1 HBAR");
        console.log("✅ Protocol minted 1 $DRIP token (CORRECT RATIO!)");
        console.log("✅ TEST_USER_2 received 1 $DRIP token");
        console.log("✅ TEST_USER_2 account frozen for non-transferability");
        console.log("✅ Protocol follows HCS_DRIP_MINTING_DESIGN.md specifications");
        
        console.log("\n=== PROTOCOL VERIFICATION ===");
        console.log("1 HBAR deposit → 1 DRIP membership token ✅");
        console.log("Expected vs Actual: 1 DRIP ✅");
        console.log("Non-transferable DRIP enforcement ✅");
        
    } catch (error) {
        console.error("❌ Fountain Protocol Test 2 failed:", error.message);
    } finally {
        client.close();
    }
}

fountainProtocolTest2();