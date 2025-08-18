/**
 * Weekly WISH Issuance and AutoRedeem Cycle
 * 
 * This script processes a complete 7-day cycle where:
 * 1. Daily WISH tokens are issued to all active members
 * 2. Any member reaching 1000+ WISH triggers AutoRedeem automatically
 * 3. AutoRedeem: Burn 1000 WISH, pay 1.8 HBAR, collect 1 HBAR deposit, mint new DRIP
 * 4. All operations logged to HCS for transparency
 * 
 * Goal: Have all TEST_USER accounts (1-6) cycle through AutoRedeem for profit
 */

import { 
    Client, 
    TokenMintTransaction,
    TokenBurnTransaction,
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

class WeeklyWishAndAutoRedeemCycle {
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
        
        // All TEST_USER accounts for this cycle
        this.testUsers = [
            {
                name: 'TEST_USER_1',
                accountId: process.env.TEST_USER_1_ACCOUNT_ID,
                privateKey: process.env.TEST_USER_1_PRIVATE_KEY,
                hasDrop: true // 75 WISH/day
            },
            {
                name: 'TEST_USER_2',
                accountId: process.env.TEST_USER_2_ACCOUNT_ID,
                privateKey: process.env.TEST_USER_2_PRIVATE_KEY,
                hasDrop: false // 50 WISH/day
            },
            {
                name: 'TEST_USER_3',
                accountId: process.env.TEST_USER_3_ACCOUNT_ID,
                privateKey: process.env.TEST_USER_3_PRIVATE_KEY,
                hasDrop: true // 75 WISH/day
            },
            {
                name: 'TEST_USER_4',
                accountId: process.env.TEST_USER_4_ACCOUNT_ID,
                privateKey: process.env.TEST_USER_4_PRIVATE_KEY,
                hasDrop: false // 50 WISH/day
            },
            {
                name: 'TEST_USER_5',
                accountId: process.env.TEST_USER_5_ACCOUNT_ID,
                privateKey: process.env.TEST_USER_5_PRIVATE_KEY,
                hasDrop: true // 75 WISH/day
            },
            {
                name: 'TEST_USER_6',
                accountId: process.env.TEST_USER_6_ACCOUNT_ID,
                privateKey: process.env.TEST_USER_6_PRIVATE_KEY,
                hasDrop: true // 75 WISH/day
            }
        ];
        
        this.weeklyResults = {
            days: [],
            totalWishIssued: 0,
            totalAutoRedeems: 0,
            totalProfits: 0,
            memberProfits: {}
        };
    }

    async initialize() {
        console.log('🌊 Initializing Weekly WISH & AutoRedeem Cycle...');
        this.client.setOperator(this.treasuryId, this.treasuryKey);
        console.log('✅ Client initialized with treasury operator');
        
        // Initialize member profit tracking
        this.testUsers.forEach(user => {
            this.weeklyResults.memberProfits[user.name] = {
                autoRedeemCount: 0,
                totalHbarProfit: 0,
                wishBurned: 0,
                dripGained: 0
            };
        });
    }

    /**
     * Log operation to HCS Topic 0.0.6591043
     */
    async logToHCS(eventData, summary) {
        try {
            const messageBytes = Buffer.from(JSON.stringify(eventData, null, 2));
            
            const hcsTransaction = new TopicMessageSubmitTransaction()
                .setTopicId(this.hcsTopicId)
                .setMessage(messageBytes);
            
            const response = await hcsTransaction.execute(this.client);
            
            console.log(`  📋 HCS Logged: ${response.transactionId} (${summary})`);
            
            return {
                success: true,
                transactionId: response.transactionId.toString()
            };
            
        } catch (error) {
            console.error(`  ❌ HCS logging failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get current balances for all TEST_USER accounts
     */
    async getCurrentBalances() {
        const balances = {};
        
        for (const user of this.testUsers) {
            try {
                const accountId = AccountId.fromString(user.accountId);
                const balance = await new AccountBalanceQuery()
                    .setAccountId(accountId)
                    .execute(this.client);
                
                balances[user.name] = {
                    hbar: balance.hbars.toTinybars(),
                    drip: parseInt(balance.tokens.get(this.tokenIds.DRIP) || 0),
                    wish: parseInt(balance.tokens.get(this.tokenIds.WISH) || 0),
                    drop: parseInt(balance.tokens.get(this.tokenIds.DROP) || 0)
                };
            } catch (error) {
                console.error(`  ❌ Failed to get balance for ${user.name}: ${error.message}`);
                balances[user.name] = { error: error.message };
            }
        }
        
        return balances;
    }

    /**
     * Issue daily WISH tokens to all active members
     */
    async issueDailyWish(day) {
        console.log(`\n💰 Issuing Daily WISH Tokens (Day ${day})...`);
        
        const dailyIssues = [];
        
        for (const user of this.testUsers) {
            try {
                const accountId = AccountId.fromString(user.accountId);
                const dailyWishAmount = user.hasDrop ? 75 : 50; // DROP bonus
                
                console.log(`  🪙 ${user.name}: Issuing ${dailyWishAmount} WISH...`);
                
                // Mint WISH tokens
                const wishMintTx = new TokenMintTransaction()
                    .setTokenId(this.tokenIds.WISH)
                    .setAmount(dailyWishAmount);
                
                const mintResponse = await wishMintTx.execute(this.client);
                
                // Transfer WISH to user
                const wishTransferTx = new TransferTransaction()
                    .addTokenTransfer(this.tokenIds.WISH, this.treasuryId, -dailyWishAmount)
                    .addTokenTransfer(this.tokenIds.WISH, accountId, dailyWishAmount);
                
                const transferResponse = await wishTransferTx.execute(this.client);
                
                console.log(`    ✅ Minted & Transferred: ${transferResponse.transactionId}`);
                
                dailyIssues.push({
                    user: user.name,
                    accountId: user.accountId,
                    amount: dailyWishAmount,
                    mintTx: mintResponse.transactionId.toString(),
                    transferTx: transferResponse.transactionId.toString()
                });
                
                this.weeklyResults.totalWishIssued += dailyWishAmount;
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                console.error(`  ❌ Failed to issue WISH to ${user.name}: ${error.message}`);
                dailyIssues.push({
                    user: user.name,
                    error: error.message
                });
            }
        }
        
        // Log daily issuance to HCS
        const dailyIssuanceEvent = {
            protocol: "Fountain Protocol",
            version: "1.0",
            type: "daily_wish_issuance",
            event: "DailyWishDistribution",
            timestamp: new Date().toISOString(),
            day: day,
            details: {
                totalMembersIssued: dailyIssues.filter(d => !d.error).length,
                totalWishIssued: dailyIssues.reduce((sum, d) => sum + (d.amount || 0), 0),
                memberDistributions: dailyIssues
            },
            tokenAddresses: {
                DRIP: this.tokenIds.DRIP,
                WISH: this.tokenIds.WISH,
                DROP: this.tokenIds.DROP
            },
            treasury: this.treasuryId.toString(),
            auditTrail: {
                operation: "DAILY_WISH_ISSUANCE",
                initiator: this.treasuryId.toString(),
                compliance: "PROTOCOL_DAILY_ALLOCATION"
            }
        };
        
        await this.logToHCS(dailyIssuanceEvent, `Day ${day} WISH Issuance`);
        
        return dailyIssues;
    }

    /**
     * Process AutoRedeem for a single account
     */
    async processAutoRedeem(user, currentWish) {
        console.log(`\n🔄 Processing AutoRedeem for ${user.name}...`);
        console.log(`  Current WISH: ${currentWish}`);
        
        try {
            const accountId = AccountId.fromString(user.accountId);
            const accountKey = PrivateKey.fromString(user.privateKey);
            
            // Step 1: Burn 1000 WISH tokens
            console.log(`  🔥 Burning 1000 WISH tokens...`);
            const wishBurnTx = new TokenBurnTransaction()
                .setTokenId(this.tokenIds.WISH)
                .setAmount(1000);
            
            const wishBurnResponse = await wishBurnTx.execute(this.client);
            
            // Step 2: Pay out 1.8 HBAR
            console.log(`  💰 Paying out 1.8 HBAR...`);
            const payoutAmount = Hbar.fromTinybars(180000000);
            const payoutTx = new TransferTransaction()
                .addHbarTransfer(this.treasuryId, payoutAmount.negated())
                .addHbarTransfer(accountId, payoutAmount);
            
            const payoutResponse = await payoutTx.execute(this.client);
            
            // Step 3: Collect 1 HBAR membership deposit
            console.log(`  🏦 Processing 1 HBAR membership deposit...`);
            const depositAmount = Hbar.fromTinybars(100000000);
            const depositTx = new TransferTransaction()
                .addHbarTransfer(accountId, depositAmount.negated())
                .addHbarTransfer(this.treasuryId, depositAmount)
                .freezeWith(this.client);
            
            const signedDepositTx = await depositTx.sign(accountKey);
            const depositResponse = await signedDepositTx.execute(this.client);
            
            // Step 4: Mint new DRIP token
            console.log(`  🪙 Minting new DRIP token...`);
            const dripMintTx = new TokenMintTransaction()
                .setTokenId(this.tokenIds.DRIP)
                .setAmount(1);
            
            const dripMintResponse = await dripMintTx.execute(this.client);
            
            // Step 5: Transfer DRIP (unfreeze, transfer, refreeze)
            console.log(`  🎫 Transferring new DRIP token...`);
            
            const unfreezeAccountTx = new TokenUnfreezeTransaction()
                .setTokenId(this.tokenIds.DRIP)
                .setAccountId(accountId);
            await unfreezeAccountTx.execute(this.client);
            
            const dripTransferTx = new TransferTransaction()
                .addTokenTransfer(this.tokenIds.DRIP, this.treasuryId, -1)
                .addTokenTransfer(this.tokenIds.DRIP, accountId, 1);
            const dripTransferResponse = await dripTransferTx.execute(this.client);
            
            const refreezeAccountTx = new TokenFreezeTransaction()
                .setTokenId(this.tokenIds.DRIP)
                .setAccountId(accountId);
            await refreezeAccountTx.execute(this.client);
            
            console.log(`  ✅ AutoRedeem completed for ${user.name}`);
            console.log(`    Net profit: 0.8 HBAR per cycle`);
            
            // Update profit tracking
            this.weeklyResults.memberProfits[user.name].autoRedeemCount++;
            this.weeklyResults.memberProfits[user.name].totalHbarProfit += 80000000; // 0.8 HBAR in tinybars
            this.weeklyResults.memberProfits[user.name].wishBurned += 1000;
            this.weeklyResults.memberProfits[user.name].dripGained += 1;
            this.weeklyResults.totalAutoRedeems++;
            this.weeklyResults.totalProfits += 80000000;
            
            // Log AutoRedeem to HCS
            const autoRedeemEvent = {
                protocol: "Fountain Protocol",
                version: "1.0",
                type: "auto_redeem",
                event: "AutoRedeemProcessed",
                timestamp: new Date().toISOString(),
                member: accountId.toString(),
                memberName: user.name,
                details: {
                    wishBurned: 1000,
                    hbarPayout: payoutAmount.toTinybars(),
                    membershipDeposit: depositAmount.toTinybars(),
                    dripTokensIssued: 1,
                    netHbarBenefit: 80000000,
                    wishBurnTransactionId: wishBurnResponse.transactionId.toString(),
                    payoutTransactionId: payoutResponse.transactionId.toString(),
                    depositTransactionId: depositResponse.transactionId.toString(),
                    dripMintTransactionId: dripMintResponse.transactionId.toString(),
                    dripTransferTransactionId: dripTransferResponse.transactionId.toString()
                },
                auditTrail: {
                    operation: "AUTO_REDEEM",
                    initiator: this.treasuryId.toString(),
                    compliance: "AUTOMATED_QUOTA_ENFORCEMENT"
                }
            };
            
            await this.logToHCS(autoRedeemEvent, `AutoRedeem: ${user.name}`);
            
            return {
                success: true,
                user: user.name,
                hbarProfit: 80000000,
                transactions: {
                    wishBurn: wishBurnResponse.transactionId.toString(),
                    hbarPayout: payoutResponse.transactionId.toString(),
                    membershipDeposit: depositResponse.transactionId.toString(),
                    dripMint: dripMintResponse.transactionId.toString(),
                    dripTransfer: dripTransferResponse.transactionId.toString()
                }
            };
            
        } catch (error) {
            console.error(`  ❌ AutoRedeem failed for ${user.name}: ${error.message}`);
            return {
                success: false,
                user: user.name,
                error: error.message
            };
        }
    }

    /**
     * Check for and process any AutoRedeems needed
     */
    async checkAndProcessAutoRedeems(balances, day) {
        console.log(`\n🔍 Checking for AutoRedeem eligibility (Day ${day})...`);
        
        const autoRedeems = [];
        
        for (const user of this.testUsers) {
            const userBalance = balances[user.name];
            if (userBalance && !userBalance.error && userBalance.wish >= 1000) {
                console.log(`  🎯 ${user.name} is eligible for AutoRedeem (${userBalance.wish} WISH)`);
                
                const autoRedeemResult = await this.processAutoRedeem(user, userBalance.wish);
                autoRedeems.push(autoRedeemResult);
                
                // Delay between AutoRedeems
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        if (autoRedeems.length === 0) {
            console.log(`  ℹ️ No accounts eligible for AutoRedeem on Day ${day}`);
        } else {
            console.log(`  ✅ Processed ${autoRedeems.length} AutoRedeems on Day ${day}`);
        }
        
        return autoRedeems;
    }

    /**
     * Process a single day of the cycle
     */
    async processDay(day) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📅 DAY ${day} - WISH ISSUANCE & AUTOREDEEM PROCESSING`);
        console.log(`${'='.repeat(60)}`);
        
        // Step 1: Get current balances
        console.log(`\n📊 Getting current balances...`);
        const startBalances = await this.getCurrentBalances();
        
        // Step 2: Issue daily WISH
        const wishIssuances = await this.issueDailyWish(day);
        
        // Small delay for transactions to settle
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Step 3: Get updated balances after WISH issuance
        console.log(`\n📊 Getting updated balances after WISH issuance...`);
        const postWishBalances = await this.getCurrentBalances();
        
        // Step 4: Check for and process AutoRedeems
        const autoRedeems = await this.checkAndProcessAutoRedeems(postWishBalances, day);
        
        // Step 5: Get final balances after any AutoRedeems
        let finalBalances = postWishBalances;
        if (autoRedeems.length > 0) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            console.log(`\n📊 Getting final balances after AutoRedeems...`);
            finalBalances = await this.getCurrentBalances();
        }
        
        // Step 6: Generate day summary
        const dayResult = {
            day: day,
            startBalances: startBalances,
            wishIssuances: wishIssuances,
            autoRedeems: autoRedeems,
            finalBalances: finalBalances,
            summary: {
                wishIssued: wishIssuances.reduce((sum, w) => sum + (w.amount || 0), 0),
                autoRedeemsProcessed: autoRedeems.filter(a => a.success).length,
                totalHbarProfits: autoRedeems.reduce((sum, a) => sum + (a.hbarProfit || 0), 0)
            }
        };
        
        this.weeklyResults.days.push(dayResult);
        
        console.log(`\n📋 Day ${day} Summary:`);
        console.log(`  WISH Issued: ${dayResult.summary.wishIssued}`);
        console.log(`  AutoRedeems: ${dayResult.summary.autoRedeemsProcessed}`);
        console.log(`  HBAR Profits: ${Hbar.fromTinybars(dayResult.summary.totalHbarProfits).toString()}`);
        
        return dayResult;
    }

    /**
     * Process complete 7-day cycle
     */
    async processWeeklyCycle() {
        console.log('🌊 Starting 7-Day WISH Issuance & AutoRedeem Cycle...');
        console.log('🎯 Goal: All TEST_USER accounts cycle through AutoRedeem for profit\n');
        
        for (let day = 1; day <= 7; day++) {
            await this.processDay(day);
            
            // Longer delay between days
            if (day < 7) {
                console.log(`\n⏳ Waiting before next day...`);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
        
        return this.weeklyResults;
    }

    /**
     * Generate comprehensive weekly summary
     */
    generateWeeklySummary() {
        console.log('\n' + '='.repeat(80));
        console.log('🎉 WEEKLY WISH & AUTOREDEEM CYCLE COMPLETE');
        console.log('='.repeat(80));
        
        console.log(`\n📊 OVERALL STATISTICS:`);
        console.log(`   Total Days Processed: 7`);
        console.log(`   Total WISH Issued: ${this.weeklyResults.totalWishIssued}`);
        console.log(`   Total AutoRedeems: ${this.weeklyResults.totalAutoRedeems}`);
        console.log(`   Total HBAR Profits: ${Hbar.fromTinybars(this.weeklyResults.totalProfits).toString()}`);
        
        console.log(`\n👥 INDIVIDUAL MEMBER PROFITS:`);
        Object.entries(this.weeklyResults.memberProfits).forEach(([member, profits]) => {
            if (profits.autoRedeemCount > 0) {
                console.log(`   ${member}:`);
                console.log(`     AutoRedeem Cycles: ${profits.autoRedeemCount}`);
                console.log(`     Total HBAR Profit: ${Hbar.fromTinybars(profits.totalHbarProfit).toString()}`);
                console.log(`     WISH Burned: ${profits.wishBurned}`);
                console.log(`     DRIP Gained: ${profits.dripGained}`);
            } else {
                console.log(`   ${member}: No AutoRedeems (insufficient WISH accumulation)`);
            }
        });
        
        console.log(`\n📈 DAY-BY-DAY BREAKDOWN:`);
        this.weeklyResults.days.forEach(day => {
            console.log(`   Day ${day.day}: ${day.summary.wishIssued} WISH issued, ${day.summary.autoRedeemsProcessed} AutoRedeems, ${Hbar.fromTinybars(day.summary.totalHbarProfits).toString()} profit`);
        });
        
        console.log(`\n🔗 VERIFICATION:`);
        console.log(`   Dashboard: https://opento-suggestions.github.io/hbar-fountain/`);
        console.log(`   HCS Topic: https://hashscan.io/testnet/topic/${this.hcsTopicId}`);
        
        return this.weeklyResults;
    }

    /**
     * Run complete weekly cycle
     */
    async run() {
        try {
            await this.initialize();
            await this.processWeeklyCycle();
            const summary = this.generateWeeklySummary();
            
            console.log('\n🎉 Weekly cycle completed successfully!');
            console.log('🚀 All TEST_USER accounts have maximized their AutoRedeem profits!');
            
            return summary;
            
        } catch (error) {
            console.error('❌ Weekly cycle failed:', error);
            throw error;
        } finally {
            this.client.close();
        }
    }
}

// Execute the weekly cycle
const weeklyProcessor = new WeeklyWishAndAutoRedeemCycle();
weeklyProcessor.run()
    .then(() => {
        console.log('\n✨ Weekly WISH & AutoRedeem cycle complete!');
    })
    .catch(error => {
        console.error('\n💥 Weekly cycle failed:', error);
        process.exit(1);
    });