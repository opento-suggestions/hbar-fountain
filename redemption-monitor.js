import { Client, AccountId, PrivateKey, TransferTransaction, TokenBurnTransaction, AccountBalanceQuery } from '@hashgraph/sdk';
import { FOUNTAIN_CONFIG } from './config.js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

class RedemptionMonitor {
    constructor() {
        this.operatorId = AccountId.fromString(process.env.OPERATOR_ID);
        this.operatorKey = PrivateKey.fromStringED25519(process.env.OPERATOR_KEY);
        this.client = Client.forTestnet();
        this.client.setOperator(this.operatorId, this.operatorKey);
        
        this.config = FOUNTAIN_CONFIG;
        
        // Redemption tracking
        this.redemptionRecords = [];
    }
    
    async checkWishBalance(accountId) {
        try {
            const balanceQuery = new AccountBalanceQuery()
                .setAccountId(accountId);
            
            const balance = await balanceQuery.execute(this.client);
            const wishBalance = balance.tokens.get(this.config.tokens.WISH) || 0;
            
            return Number(wishBalance);
        } catch (error) {
            console.error("❌ Failed to check WISH balance:", error.message);
            return 0;
        }
    }
    
    async checkTreasuryHbarBalance() {
        try {
            const balanceQuery = new AccountBalanceQuery()
                .setAccountId(this.config.accounts.treasury);
            
            const balance = await balanceQuery.execute(this.client);
            return balance.hbars.toBigNumber().toNumber();
        } catch (error) {
            console.error("❌ Failed to check treasury HBAR balance:", error.message);
            return 0;
        }
    }
    
    calculateRedemptionValue(wishAmount) {
        // Fixed rate: 1000 WISH = 1 HBAR (0.001 HBAR per WISH)
        const hbarAmount = wishAmount * this.config.parameters.wishToHbarRate;
        const tinybarAmount = Math.floor(hbarAmount * 100000000); // Convert to tinybars
        
        return {
            wishAmount,
            hbarAmount,
            tinybarAmount
        };
    }
    
    async processRedemption(redeemerAccountId, wishAmount) {
        console.log(`🔥 PROCESSING REDEMPTION: ${redeemerAccountId}`);
        console.log(`Amount: ${wishAmount} WISH tokens`);
        console.log("=" * 60);
        
        try {
            // Step 1: Validate redemption amount
            if (wishAmount <= 0 || wishAmount > 1000) {
                throw new Error("❌ INVALID AMOUNT: Must redeem 1-1000 WISH tokens");
            }
            
            // Step 2: Check redeemer's WISH balance
            console.log("1. Checking WISH token balance...");
            const wishBalance = await this.checkWishBalance(redeemerAccountId);
            
            if (wishBalance < wishAmount) {
                throw new Error(`❌ INSUFFICIENT WISH: Account has ${wishBalance}, requested ${wishAmount}`);
            }
            
            console.log(`✅ WISH balance verified: ${wishBalance} tokens`);
            
            // Step 3: Calculate redemption value
            console.log("2. Calculating redemption value...");
            const redemptionValue = this.calculateRedemptionValue(wishAmount);
            
            console.log(`✅ Redemption calculation:`);
            console.log(`   💫 WISH to burn: ${redemptionValue.wishAmount}`);
            console.log(`   💰 HBAR to pay: ${redemptionValue.hbarAmount}`);
            console.log(`   🔢 Tinybars: ${redemptionValue.tinybarAmount}`);
            
            // Step 4: Check treasury has sufficient HBAR
            console.log("3. Checking treasury HBAR balance...");
            const treasuryBalance = await this.checkTreasuryHbarBalance();
            
            if (treasuryBalance < redemptionValue.hbarAmount) {
                throw new Error(`❌ INSUFFICIENT TREASURY: Treasury has ${treasuryBalance} HBAR, needs ${redemptionValue.hbarAmount}`);
            }
            
            console.log(`✅ Treasury balance sufficient: ${treasuryBalance} HBAR`);
            
            // Step 5: Transfer WISH tokens to treasury (for burning)
            console.log("4. Transferring WISH tokens to treasury...");
            const transferTx = await new TransferTransaction()
                .addTokenTransfer(this.config.tokens.WISH, redeemerAccountId, -wishAmount)
                .addTokenTransfer(this.config.tokens.WISH, this.config.accounts.treasury, wishAmount)
                .execute(this.client);
            
            await transferTx.getReceipt(this.client);
            console.log(`✅ ${wishAmount} WISH transferred to treasury`);
            
            // Step 6: Burn WISH tokens from treasury
            console.log("5. Burning WISH tokens...");
            const burnTx = await new TokenBurnTransaction()
                .setTokenId(this.config.tokens.WISH)
                .setAmount(wishAmount)
                .execute(this.client);
            
            await burnTx.getReceipt(this.client);
            console.log(`✅ ${wishAmount} WISH tokens burned (removed from supply)`);
            
            // Step 7: Pay HBAR to redeemer
            console.log("6. Paying HBAR to redeemer...");
            const paymentTx = await new TransferTransaction()
                .addHbarTransfer(this.config.accounts.treasury, -redemptionValue.tinybarAmount)
                .addHbarTransfer(redeemerAccountId, redemptionValue.tinybarAmount)
                .execute(this.client);
            
            await paymentTx.getReceipt(this.client);
            console.log(`✅ ${redemptionValue.hbarAmount} HBAR paid to redeemer`);
            
            // Step 8: Record redemption
            const redemptionRecord = {
                redeemer: redeemerAccountId,
                wishBurned: wishAmount,
                hbarPaid: redemptionValue.hbarAmount,
                rate: this.config.parameters.wishToHbarRate,
                timestamp: new Date().toISOString(),
                transferTxId: transferTx.transactionId.toString(),
                burnTxId: burnTx.transactionId.toString(),
                paymentTxId: paymentTx.transactionId.toString()
            };
            
            this.redemptionRecords.push(redemptionRecord);
            console.log("✅ Redemption recorded");
            
            console.log("=" * 60);
            console.log("🎉 REDEMPTION SUCCESSFUL!");
            console.log(`👤 Redeemer: ${redeemerAccountId}`);
            console.log(`🔥 WISH Burned: ${wishAmount}`);
            console.log(`💰 HBAR Paid: ${redemptionValue.hbarAmount}`);
            console.log(`📊 Exchange Rate: ${this.config.parameters.wishToHbarRate} HBAR per WISH`);
            
            return {
                success: true,
                redemptionRecord,
                wishBurned: wishAmount,
                hbarPaid: redemptionValue.hbarAmount
            };
            
        } catch (error) {
            console.error("❌ REDEMPTION FAILED:", error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    async getRedemptionHistory() {
        return this.redemptionRecords;
    }
    
    async getTotalBurned() {
        return this.redemptionRecords.reduce((total, record) => total + record.wishBurned, 0);
    }
    
    async getTotalHbarPaid() {
        return this.redemptionRecords.reduce((total, record) => total + record.hbarPaid, 0);
    }
}

// Test the redemption system
async function testRedemption() {
    const redemptionMonitor = new RedemptionMonitor();
    
    console.log("🧪 TESTING REDEMPTION SYSTEM");
    console.log("=" * 60);
    
    // Check current balances first
    console.log("\n📊 PRE-REDEMPTION STATUS:");
    const wishBalance = await redemptionMonitor.checkWishBalance(process.env.OPERATOR_ID);
    const treasuryBalance = await redemptionMonitor.checkTreasuryHbarBalance();
    console.log(`💫 Your WISH balance: ${wishBalance}`);
    console.log(`🏛️ Treasury HBAR: ${treasuryBalance}`);
    
    if (wishBalance > 0) {
        // Test redemption: 100 WISH tokens
        console.log("\n📋 TEST: Redeem 100 WISH tokens");
        const result = await redemptionMonitor.processRedemption(
            process.env.OPERATOR_ID,
            100  // Redeem 100 WISH for 0.1 HBAR
        );
        
        console.log("\n🎯 REDEMPTION RESULT:", result.success ? "✅ SUCCESS" : "❌ FAILED");
        
        if (result.success) {
            console.log("\n📊 POST-REDEMPTION STATUS:");
            const newWishBalance = await redemptionMonitor.checkWishBalance(process.env.OPERATOR_ID);
            const newTreasuryBalance = await redemptionMonitor.checkTreasuryHbarBalance();
            console.log(`💫 Your WISH balance: ${newWishBalance} (was ${wishBalance})`);
            console.log(`🏛️ Treasury HBAR: ${newTreasuryBalance} (was ${treasuryBalance})`);
            
            console.log("\n📈 REDEMPTION SUMMARY:");
            console.log(`🔥 WISH burned: ${result.wishBurned}`);
            console.log(`💰 HBAR received: ${result.hbarPaid}`);
            
            // Show redemption history
            const history = await redemptionMonitor.getRedemptionHistory();
            console.log("\n📚 REDEMPTION RECORD:");
            console.log(JSON.stringify(result.redemptionRecord, null, 2));
        }
    } else {
        console.log("\n⚠️ No WISH tokens to redeem! Run claim-system.js first to get WISH tokens.");
    }
}

testRedemption().catch(console.error);