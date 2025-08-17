import { Client, AccountId, PrivateKey, TokenMintTransaction, TransferTransaction } from '@hashgraph/sdk';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

class DripMembershipSystem {
    constructor() {
        this.operatorId = AccountId.fromString(process.env.OPERATOR_ID);
        this.operatorKey = PrivateKey.fromStringED25519(process.env.OPERATOR_KEY);
        this.client = Client.forTestnet();
        this.client.setOperator(this.operatorId, this.operatorKey);
        
        this.DRIP_TOKEN_ID = "0.0.6590960";
    }
    
    async mintMembership(accountId, dripAmount = 1) {
        console.log(`🎫 Creating membership for ${accountId}: ${dripAmount} DRIP token(s)`);
        
        try {
            // Step 1: Mint DRIP tokens (in real protocol, this happens when 1 HBAR is deposited)
            console.log("1. Minting DRIP membership tokens...");
            const mintTx = await new TokenMintTransaction()
                .setTokenId(this.DRIP_TOKEN_ID)
                .setAmount(dripAmount)
                .execute(this.client);
            
            await mintTx.getReceipt(this.client);
            console.log(`✅ Minted ${dripAmount} DRIP token(s)`);
            
            // Step 2: Transfer to new member
            console.log("2. Transferring membership to account...");
            const transferTx = await new TransferTransaction()
                .addTokenTransfer(this.DRIP_TOKEN_ID, this.operatorId, -dripAmount)
                .addTokenTransfer(this.DRIP_TOKEN_ID, accountId, dripAmount)
                .execute(this.client);
            
            await transferTx.getReceipt(this.client);
            console.log(`✅ Membership granted! ${accountId} now has ${dripAmount} DRIP`);
            
            return { success: true, dripAmount };
            
        } catch (error) {
            console.error("❌ Membership creation failed:", error.message);
            return { success: false, error: error.message };
        }
    }
}

// Test membership creation
async function testMembership() {
    const membershipSystem = new DripMembershipSystem();
    
    // Grant yourself 1 DRIP (membership)
    const result = await membershipSystem.mintMembership(
        process.env.OPERATOR_ID,  // Your account
        1  // 1 DRIP token (standard membership)
    );
    
    console.log("🎯 Membership Result:", result);
}

testMembership().catch(console.error);