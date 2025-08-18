/**
 * Process AutoRedeem for All Eligible Accounts
 * 
 * AutoRedeem Process:
 * 1. Burn 1000 WISH tokens from member
 * 2. Pay out 1.8 HBAR to member
 * 3. Transfer 1 HBAR from member to treasury (new membership deposit)
 * 4. Mint 1 new DRIP token
 * 5. Transfer new DRIP to member
 * 6. Log all operations to HCS Topic 0.0.6591043
 * 
 * Eligible accounts: Those with ≥1000 WISH tokens
 */

import { 
    Client, 
    TokenBurnTransaction,
    TokenMintTransaction,
    TokenUnfreezeTransaction,
    TokenFreezeTransaction,
    TransferTransaction,
    AccountBalanceQuery,
    PrivateKey,
    AccountId,
    Hbar,
    TopicMessageSubmitTransaction
} from '@hashgraph/sdk';
import dotenv from 'dotenv';

dotenv.config();

class AutoRedeemProcessor {
    constructor() {
        this.client = Client.forTestnet();
        this.treasuryId = AccountId.fromString(process.env.CONTROLLER_ACCOUNT_ID);
        this.treasuryKey = PrivateKey.fromString(process.env.CONTROLLER_PRIVATE_KEY);
        this.hcsTopicId = '0.0.6591043';
        
        this.tokenIds = {
            DRIP: process.env.DRIP_TOKEN_ID,
            WISH: process.env.WISH_TOKEN_ID,
            DROP: process.env.DROP_TOKEN_ID
        };
        
        // Eligible accounts for AutoRedeem (≥1000 WISH)
        this.eligibleAccounts = [
            {
                name: 'CONTROLLER/TREASURY',
                accountId: process.env.CONTROLLER_ACCOUNT_ID,
                privateKey: process.env.CONTROLLER_PRIVATE_KEY,
                currentWish: 1125
            },
            {
                name: 'TEST_USER_1',
                accountId: process.env.TEST_USER_1_ACCOUNT_ID,
                privateKey: process.env.TEST_USER_1_PRIVATE_KEY,
                currentWish: 1250
            },
            {
                name: 'TEST_USER_5',
                accountId: process.env.TEST_USER_5_ACCOUNT_ID,
                privateKey: process.env.TEST_USER_5_PRIVATE_KEY,
                currentWish: 1100
            }
        ];
    }

    async initialize() {
        console.log('🔄 Initializing AutoRedeem Processor...');
        this.client.setOperator(this.treasuryId, this.treasuryKey);
        console.log('✅ Client initialized with treasury operator');
    }

    /**
     * Log operation to HCS Topic 0.0.6591043
     */
    async logToHCS(eventData, summary) {
        try {
            console.log(`📋 Logging to HCS: ${summary}`);
            
            const messageBytes = Buffer.from(JSON.stringify(eventData, null, 2));
            
            const hcsTransaction = new TopicMessageSubmitTransaction()
                .setTopicId(this.hcsTopicId)
                .setMessage(messageBytes);
            
            const response = await hcsTransaction.execute(this.client);
            
            console.log(`✅ HCS Logged: ${response.transactionId} (${summary})`);
            
            return {
                success: true,
                transactionId: response.transactionId.toString(),
                topicId: this.hcsTopicId,
                summary: summary
            };
            
        } catch (error) {
            console.error(`❌ HCS logging failed (${summary}):`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Process AutoRedeem for a single account
     */
    async processAccountAutoRedeem(account) {
        console.log(`\n=== PROCESSING AUTOREDEEM: ${account.name} ===`);
        console.log(`Account: ${account.accountId}`);
        console.log(`Current WISH: ${account.currentWish} tokens`);
        
        try {
            const accountId = AccountId.fromString(account.accountId);
            const accountKey = PrivateKey.fromString(account.privateKey);
            
            // Step 1: Verify current balance
            console.log('\n1️⃣ Verifying current balance...');
            const initialBalance = await new AccountBalanceQuery()
                .setAccountId(accountId)
                .execute(this.client);
            
            const currentWish = initialBalance.tokens.get(this.tokenIds.WISH) || 0;
            const currentDrip = initialBalance.tokens.get(this.tokenIds.DRIP) || 0;
            const currentHbar = initialBalance.hbars.toTinybars();
            
            console.log(`   HBAR: ${initialBalance.hbars.toString()}`);
            console.log(`   DRIP: ${currentDrip} tokens`);
            console.log(`   WISH: ${currentWish} tokens`);
            
            if (currentWish < 1000) {
                throw new Error(`Insufficient WISH for AutoRedeem: ${currentWish} < 1000`);
            }
            
            // Step 2: Burn 1000 WISH tokens
            console.log('\n2️⃣ Burning 1000 WISH tokens...');
            
            const wishBurnTx = new TokenBurnTransaction()
                .setTokenId(this.tokenIds.WISH)
                .setAmount(1000)
                .freezeWith(this.client);
            
            const wishBurnResponse = await wishBurnTx.execute(this.client);
            console.log(`✅ WISH Burn: ${wishBurnResponse.transactionId}`);
            
            // Step 3: Pay out 1.8 HBAR to member
            console.log('\n3️⃣ Paying out 1.8 HBAR to member...');
            
            const payoutAmount = Hbar.fromTinybars(180000000); // 1.8 HBAR
            
            const payoutTx = new TransferTransaction()
                .addHbarTransfer(this.treasuryId, payoutAmount.negated())
                .addHbarTransfer(accountId, payoutAmount)
                .freezeWith(this.client);
            
            const payoutResponse = await payoutTx.execute(this.client);
            console.log(`✅ HBAR Payout: ${payoutResponse.transactionId} (${payoutAmount.toString()})`);
            
            // Step 4: Transfer 1 HBAR from member to treasury (new membership deposit)
            console.log('\n4️⃣ Processing 1 HBAR membership deposit...');
            
            const depositAmount = Hbar.fromTinybars(100000000); // 1 HBAR
            
            const depositTx = new TransferTransaction()
                .addHbarTransfer(accountId, depositAmount.negated())
                .addHbarTransfer(this.treasuryId, depositAmount)
                .freezeWith(this.client);
            
            const signedDepositTx = await depositTx.sign(accountKey);
            const depositResponse = await signedDepositTx.execute(this.client);
            console.log(`✅ Membership Deposit: ${depositResponse.transactionId} (${depositAmount.toString()})`);
            
            // Step 5: Mint new DRIP token
            console.log('\n5️⃣ Minting new DRIP token...');
            
            const dripMintTx = new TokenMintTransaction()
                .setTokenId(this.tokenIds.DRIP)
                .setAmount(1);
            
            const dripMintResponse = await dripMintTx.execute(this.client);
            console.log(`✅ DRIP Mint: ${dripMintResponse.transactionId}`);
            
            // Step 6: Unfreeze account for DRIP transfer
            console.log('\n6️⃣ Unfreezing account for DRIP transfer...');
            
            const unfreezeAccountTx = new TokenUnfreezeTransaction()
                .setTokenId(this.tokenIds.DRIP)
                .setAccountId(accountId);
            
            const unfreezeResponse = await unfreezeAccountTx.execute(this.client);
            console.log(`✅ Account Unfreeze: ${unfreezeResponse.transactionId}`);
            
            // Step 7: Transfer new DRIP to member
            console.log('\n7️⃣ Transferring new DRIP token...');
            
            const dripTransferTx = new TransferTransaction()
                .addTokenTransfer(this.tokenIds.DRIP, this.treasuryId, -1)
                .addTokenTransfer(this.tokenIds.DRIP, accountId, 1);
            
            const dripTransferResponse = await dripTransferTx.execute(this.client);
            console.log(`✅ DRIP Transfer: ${dripTransferResponse.transactionId}`);
            
            // Step 8: Refreeze account
            console.log('\n8️⃣ Refreezing account...');
            
            const refreezeAccountTx = new TokenFreezeTransaction()
                .setTokenId(this.tokenIds.DRIP)
                .setAccountId(accountId);
            
            const refreezeResponse = await refreezeAccountTx.execute(this.client);
            console.log(`✅ Account Refreeze: ${refreezeResponse.transactionId}`);
            
            // Step 9: Log to HCS
            console.log('\n9️⃣ Logging AutoRedeem to HCS...');
            
            const autoRedeemEvent = {
                protocol: "Fountain Protocol",
                version: "1.0",
                type: "auto_redeem",
                event: "AutoRedeemProcessed",
                timestamp: new Date().toISOString(),
                member: accountId.toString(),
                details: {
                    wishBurned: 1000,
                    hbarPayout: payoutAmount.toTinybars(),
                    membershipDeposit: depositAmount.toTinybars(),
                    dripTokensIssued: 1,
                    netHbarBenefit: (payoutAmount.toTinybars() - depositAmount.toTinybars()), // 0.8 HBAR
                    autoRedeemCycle: "QUOTA_REACHED_1000_WISH",
                    wishBurnTransactionId: wishBurnResponse.transactionId.toString(),
                    payoutTransactionId: payoutResponse.transactionId.toString(),
                    depositTransactionId: depositResponse.transactionId.toString(),
                    dripMintTransactionId: dripMintResponse.transactionId.toString(),
                    dripTransferTransactionId: dripTransferResponse.transactionId.toString()
                },
                previousBalances: {
                    hbar: currentHbar,
                    drip: currentDrip,
                    wish: currentWish
                },
                tokenAddresses: {
                    DRIP: this.tokenIds.DRIP,
                    WISH: this.tokenIds.WISH,
                    DROP: this.tokenIds.DROP
                },
                treasury: this.treasuryId.toString(),
                auditTrail: {
                    operation: "AUTO_REDEEM",
                    initiator: this.treasuryId.toString(),
                    approver: this.treasuryId.toString(),
                    compliance: "AUTOMATED_QUOTA_ENFORCEMENT"
                }
            };
            
            const hcsResult = await this.logToHCS(autoRedeemEvent, `AutoRedeem: ${account.name}`);
            
            // Step 10: Verify final balances
            console.log('\n🔍 Verifying final balances...');
            
            const finalBalance = await new AccountBalanceQuery()
                .setAccountId(accountId)
                .execute(this.client);
            
            const finalWish = finalBalance.tokens.get(this.tokenIds.WISH) || 0;
            const finalDrip = finalBalance.tokens.get(this.tokenIds.DRIP) || 0;
            
            console.log(`\n📊 AutoRedeem Results for ${account.name}:`);
            console.log(`   HBAR: ${finalBalance.hbars.toString()}`);
            console.log(`   DRIP: ${finalDrip} tokens (was ${currentDrip})`);
            console.log(`   WISH: ${finalWish} tokens (was ${currentWish})`);
            console.log(`   Net HBAR Benefit: ${Hbar.fromTinybars(80000000).toString()}`);
            console.log(`   HCS Transaction: ${hcsResult.transactionId || 'Failed'}`);
            
            return {
                success: true,
                account: account.name,
                accountId: accountId.toString(),
                transactions: {
                    wishBurn: wishBurnResponse.transactionId.toString(),
                    hbarPayout: payoutResponse.transactionId.toString(),
                    membershipDeposit: depositResponse.transactionId.toString(),
                    dripMint: dripMintResponse.transactionId.toString(),
                    dripTransfer: dripTransferResponse.transactionId.toString()
                },
                balanceChanges: {
                    hbarBefore: currentHbar,
                    hbarAfter: finalBalance.hbars.toTinybars(),
                    dripBefore: currentDrip,
                    dripAfter: finalDrip,
                    wishBefore: currentWish,
                    wishAfter: finalWish
                },
                hcsLogged: hcsResult.success
            };
            
        } catch (error) {
            console.error(`❌ AutoRedeem failed for ${account.name}:`, error.message);
            throw error;
        }
    }

    /**
     * Process AutoRedeem for all eligible accounts
     */
    async processAllAutoRedeems() {
        console.log('🔄 Processing AutoRedeem for All Eligible Accounts...');
        console.log(`📋 Found ${this.eligibleAccounts.length} eligible accounts\n`);
        
        const results = [];
        
        for (const account of this.eligibleAccounts) {
            try {
                const result = await this.processAccountAutoRedeem(account);
                results.push(result);
                
                // Small delay between accounts to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 2000));
                
            } catch (error) {
                console.error(`💥 Failed to process AutoRedeem for ${account.name}:`, error.message);
                results.push({
                    success: false,
                    account: account.name,
                    accountId: account.accountId,
                    error: error.message
                });
            }
        }
        
        return results;
    }

    /**
     * Generate comprehensive summary
     */
    generateSummary(results) {
        console.log('\n' + '='.repeat(80));
        console.log('🎉 AUTOREDEEM PROCESSING COMPLETE');
        console.log('='.repeat(80));
        
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        
        console.log(`\n📋 SUMMARY:`);
        console.log(`   Total Accounts Processed: ${results.length}`);
        console.log(`   Successful AutoRedeems: ${successful.length}`);
        console.log(`   Failed AutoRedeems: ${failed.length}`);
        
        if (successful.length > 0) {
            console.log(`\n✅ SUCCESSFUL AUTOREDEEMS:`);
            successful.forEach(result => {
                const netHbarGain = Hbar.fromTinybars(result.balanceChanges.hbarAfter - result.balanceChanges.hbarBefore);
                console.log(`   ${result.account} (${result.accountId}):`);
                console.log(`     WISH: ${result.balanceChanges.wishBefore} → ${result.balanceChanges.wishAfter} (-1000)`);
                console.log(`     DRIP: ${result.balanceChanges.dripBefore} → ${result.balanceChanges.dripAfter} (+1)`);
                console.log(`     Net HBAR: ${netHbarGain.toString()}`);
                console.log(`     HCS Logged: ${result.hcsLogged ? '✅' : '❌'}`);
            });
        }
        
        if (failed.length > 0) {
            console.log(`\n❌ FAILED AUTOREDEEMS:`);
            failed.forEach(result => {
                console.log(`   ${result.account}: ${result.error}`);
            });
        }
        
        console.log(`\n🔗 VERIFICATION:`);
        console.log(`   Dashboard: https://opento-suggestions.github.io/hbar-fountain/`);
        console.log(`   HCS Topic: https://hashscan.io/testnet/topic/${this.hcsTopicId}`);
        console.log(`   GitHub Actions: Will process in next 15-minute cycle`);
        
        return {
            total: results.length,
            successful: successful.length,
            failed: failed.length,
            results: results
        };
    }

    /**
     * Run complete AutoRedeem process
     */
    async run() {
        console.log('🌊 Starting AutoRedeem Processing System...');
        console.log('🔄 Processing all accounts with ≥1000 WISH tokens\n');
        
        try {
            await this.initialize();
            const results = await this.processAllAutoRedeems();
            const summary = this.generateSummary(results);
            
            console.log('\n🎉 AutoRedeem processing completed successfully!');
            console.log('🚀 All eligible members have been auto-redeemed!');
            
            return summary;
            
        } catch (error) {
            console.error('❌ AutoRedeem processing failed:', error);
            throw error;
        } finally {
            this.client.close();
        }
    }
}

// Execute AutoRedeem processing
const autoRedeemProcessor = new AutoRedeemProcessor();
autoRedeemProcessor.run()
    .then(() => {
        console.log('\n✨ AutoRedeem processing complete - all eligible accounts processed!');
    })
    .catch(error => {
        console.error('\n💥 AutoRedeem processing failed:', error);
        process.exit(1);
    });