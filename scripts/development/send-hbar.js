import { Client, TransferTransaction, Hbar, PrivateKey } from "@hashgraph/sdk";
import dotenv from "dotenv";
dotenv.config();

async function sendHbar() {
    // Initialize client for testnet
    const client = Client.forTestnet();
    
    // Set operator (CONTROLLER account will sign the transaction)
    const controllerAccountId = process.env.CONTROLLER_ACCOUNT_ID;
    const controllerPrivateKey = PrivateKey.fromString(process.env.CONTROLLER_PRIVATE_KEY);
    
    client.setOperator(controllerAccountId, controllerPrivateKey);
    
    // Recipient account
    const operatorAccountId = process.env.OPERATOR_ACCOUNT_ID;
    
    try {
        console.log(`Sending 1337 tinybars from ${controllerAccountId} to ${operatorAccountId}...`);
        
        // Create transfer transaction
        const transferTransaction = new TransferTransaction()
            .addHbarTransfer(controllerAccountId, Hbar.fromTinybars(-1337)) // Deduct from CONTROLLER
            .addHbarTransfer(operatorAccountId, Hbar.fromTinybars(1337));   // Add to OPERATOR
        
        // Execute transaction
        const transferResponse = await transferTransaction.execute(client);
        
        // Get receipt to confirm transaction
        const receipt = await transferResponse.getReceipt(client);
        
        console.log(`✅ Transaction successful!`);
        console.log(`Transaction ID: ${transferResponse.transactionId}`);
        console.log(`Status: ${receipt.status.toString()}`);
        console.log(`Sent: 1337 tinybars (0.00001337 HBAR)`);
        
    } catch (error) {
        console.error("❌ Transfer failed:", error.message);
    } finally {
        client.close();
    }
}

sendHbar();