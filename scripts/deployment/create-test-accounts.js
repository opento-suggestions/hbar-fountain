import { Client, AccountCreateTransaction, Hbar, PrivateKey } from "@hashgraph/sdk";
import dotenv from "dotenv";
dotenv.config();

async function createTestAccounts() {
    // Initialize client for testnet
    const client = Client.forTestnet();
    
    // Set operator (CONTROLLER account will fund the new accounts)
    const controllerAccountId = process.env.CONTROLLER_ACCOUNT_ID;
    const controllerPrivateKey = PrivateKey.fromString(process.env.CONTROLLER_PRIVATE_KEY);
    
    client.setOperator(controllerAccountId, controllerPrivateKey);
    
    const accounts = [];
    
    try {
        console.log("Creating 5 test user accounts...\n");
        
        for (let i = 1; i <= 5; i++) {
            console.log(`Creating TEST_USER_${i}...`);
            
            // Generate new key pair for the account
            const newAccountPrivateKey = PrivateKey.generateED25519();
            const newAccountPublicKey = newAccountPrivateKey.publicKey;
            
            // Create the account with initial balance
            const newAccountTx = await new AccountCreateTransaction()
                .setKey(newAccountPublicKey)
                .setInitialBalance(new Hbar(10)) // Start with 10 HBAR
                .execute(client);
            
            // Get the receipt to retrieve the account ID
            const receipt = await newAccountTx.getReceipt(client);
            const newAccountId = receipt.accountId;
            
            const accountInfo = {
                name: `TEST_USER_${i}`,
                accountId: newAccountId.toString(),
                privateKey: newAccountPrivateKey.toString(),
                publicKey: newAccountPublicKey.toString()
            };
            
            accounts.push(accountInfo);
            
            console.log(`✅ ${accountInfo.name} created: ${accountInfo.accountId}`);
        }
        
        console.log("\n=== ACCOUNT CREATION SUMMARY ===");
        accounts.forEach(account => {
            console.log(`\n${account.name}:`);
            console.log(`  Account ID: ${account.accountId}`);
            console.log(`  Private Key: ${account.privateKey}`);
            console.log(`  Public Key: ${account.publicKey}`);
        });
        
        // Generate .env format output
        console.log("\n=== .ENV FORMAT ===");
        accounts.forEach(account => {
            const envName = account.name.replace(' ', '_').toUpperCase();
            console.log(`${envName}_ACCOUNT_ID=${account.accountId}`);
            console.log(`${envName}_PRIVATE_KEY=${account.privateKey}`);
        });
        
        return accounts;
        
    } catch (error) {
        console.error("❌ Account creation failed:", error.message);
        throw error;
    } finally {
        client.close();
    }
}

createTestAccounts();