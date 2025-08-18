import { 
    Client, 
    TransferTransaction, 
    TokenMintTransaction,
    TokenAssociateTransaction,
    TokenUnfreezeAccountTransaction,
    TokenFreezeAccountTransaction,
    Hbar, 
    PrivateKey,
    AccountId,
    TokenId
} from "@hashgraph/sdk";
import dotenv from "dotenv";
dotenv.config();

async function testFountainDonation() {
    console.log("=== FOUNTAIN PROTOCOL DONATION TEST ===\n");
    
    // Step 1: TEST_USER_1 donates 1 HBAR to CONTROLLER
    console.log("Step 1: TEST_USER_1 donates 1 HBAR to CONTROLLER...");
    
    const client = Client.forTestnet();
    
    // Use TEST_USER_1 as operator for donation
    const testUser1AccountId = process.env.TEST_USER_1_ACCOUNT_ID;
    const testUser1PrivateKey = PrivateKey.fromString(process.env.TEST_USER_1_PRIVATE_KEY);
    const controllerAccountId = process.env.CONTROLLER_ACCOUNT_ID;
    
    client.setOperator(testUser1AccountId, testUser1PrivateKey);
    
    try {
        const donationTx = new TransferTransaction()
            .addHbarTransfer(testUser1AccountId, new Hbar(-1)) // Donate 1 HBAR
            .addHbarTransfer(controllerAccountId, new Hbar(1));
        
        const donationResponse = await donationTx.execute(client);
        const donationReceipt = await donationResponse.getReceipt(client);
        
        console.log(`✅ Donation successful!`);
        console.log(`Transaction ID: ${donationResponse.transactionId}`);
        console.log(`Status: ${donationReceipt.status.toString()}\n`);
        
        return { success: true, transactionId: donationResponse.transactionId.toString() };
        
    } catch (error) {
        console.error("❌ Donation failed:", error.message);
        return { success: false, error: error.message };
    } finally {
        client.close();
    }
}

// Execute the donation test
testFountainDonation();