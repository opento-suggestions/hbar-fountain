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

async function fountainProtocolTest() {
    console.log("=== FOUNTAIN PROTOCOL TEST ===\n");
    
    const client = Client.forTestnet();
    
    // Account details
    const testUser1AccountId = process.env.TEST_USER_1_ACCOUNT_ID;
    const testUser1PrivateKey = PrivateKey.fromString(process.env.TEST_USER_1_PRIVATE_KEY);
    const controllerAccountId = process.env.CONTROLLER_ACCOUNT_ID;
    const controllerPrivateKey = PrivateKey.fromString(process.env.CONTROLLER_PRIVATE_KEY);
    const dripTokenId = process.env.DRIP_TOKEN_ID;
    
    try {
        // Step 1: TEST_USER_1 donates 1 HBAR to CONTROLLER
        console.log("Step 1: TEST_USER_1 donates 1 HBAR to CONTROLLER...");
        client.setOperator(testUser1AccountId, testUser1PrivateKey);
        
        const donationTx = new TransferTransaction()
            .addHbarTransfer(testUser1AccountId, new Hbar(-1))
            .addHbarTransfer(controllerAccountId, new Hbar(1));
        
        const donationResponse = await donationTx.execute(client);
        const donationReceipt = await donationResponse.getReceipt(client);
        
        console.log(`✅ Donation: ${donationResponse.transactionId}`);
        console.log(`Status: ${donationReceipt.status.toString()}\n`);
        
        // Step 2: Associate TEST_USER_1 with $DRIP token
        console.log("Step 2: Associating TEST_USER_1 with $DRIP token...");
        
        try {
            const associateTx = new TokenAssociateTransaction()
                .setAccountId(testUser1AccountId)
                .setTokenIds([dripTokenId]);
            
            const associateResponse = await associateTx.execute(client);
            const associateReceipt = await associateResponse.getReceipt(client);
            console.log(`✅ Association: ${associateReceipt.status.toString()}\n`);
        } catch (error) {
            if (error.message.includes("TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT")) {
                console.log(`✅ $DRIP already associated with TEST_USER_1\n`);
            } else {
                throw error;
            }
        }
        
        // Step 3: CONTROLLER mints $DRIP tokens (has supply key)
        console.log("Step 3: CONTROLLER mints 100 $DRIP tokens...");
        client.setOperator(controllerAccountId, controllerPrivateKey);
        
        const mintTx = new TokenMintTransaction()
            .setTokenId(dripTokenId)
            .setAmount(100); // 100 DRIP tokens (0 decimals)
        
        const mintResponse = await mintTx.execute(client);
        const mintReceipt = await mintResponse.getReceipt(client);
        
        console.log(`✅ Mint: ${mintResponse.transactionId}`);
        console.log(`Status: ${mintReceipt.status.toString()}`);
        console.log(`Minted: 100 $DRIP to treasury\n`);
        
        // Step 4: Transfer $DRIP from CONTROLLER to TEST_USER_1
        console.log("Step 4: Transferring 100 $DRIP to TEST_USER_1...");
        
        const dripTransferTx = new TransferTransaction()
            .addTokenTransfer(dripTokenId, controllerAccountId, -100)
            .addTokenTransfer(dripTokenId, testUser1AccountId, 100);
        
        const transferResponse = await dripTransferTx.execute(client);
        const transferReceipt = await transferResponse.getReceipt(client);
        
        console.log(`✅ Transfer: ${transferResponse.transactionId}`);
        console.log(`Status: ${transferReceipt.status.toString()}`);
        console.log(`Transferred: 100 $DRIP to TEST_USER_1\n`);
        
        // Step 5: Optional - Freeze TEST_USER_1 to enforce non-transferability
        console.log("Step 5: Freezing TEST_USER_1 to enforce non-transferability...");
        
        const freezeTx = new TokenFreezeTransaction()
            .setAccountId(testUser1AccountId)
            .setTokenId(dripTokenId);
        
        const freezeResponse = await freezeTx.execute(client);
        const freezeReceipt = await freezeResponse.getReceipt(client);
        
        console.log(`✅ Freeze: ${freezeResponse.transactionId}`);
        console.log(`Status: ${freezeReceipt.status.toString()}\n`);
        
        console.log("=== FOUNTAIN PROTOCOL TEST COMPLETE ===");
        console.log("✅ TEST_USER_1 donated 1 HBAR");
        console.log("✅ Protocol minted 100 $DRIP tokens");
        console.log("✅ TEST_USER_1 received 100 $DRIP tokens");
        console.log("✅ TEST_USER_1 account frozen for non-transferability");
        
    } catch (error) {
        console.error("❌ Fountain Protocol test failed:", error.message);
    } finally {
        client.close();
    }
}

fountainProtocolTest();