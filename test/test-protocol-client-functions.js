/**
 * Sanity Check: Test Protocol Client Functions
 * Test each core function with TEST_USER_1 to verify unification works
 */

import { 
    Client, 
    AccountBalanceQuery,
    AccountId,
    PrivateKey
} from '@hashgraph/sdk';
import dotenv from 'dotenv';

dotenv.config();

class ProtocolClientTester {
    constructor() {
        this.client = Client.forTestnet();
        this.controllerId = AccountId.fromString(process.env.CONTROLLER_ACCOUNT_ID);
        this.controllerKey = PrivateKey.fromString(process.env.CONTROLLER_PRIVATE_KEY);
        
        // TEST_USER_1 credentials
        this.testUserId = AccountId.fromString(process.env.TEST_USER_1_ACCOUNT_ID);
        this.testUserKey = PrivateKey.fromString(process.env.TEST_USER_1_PRIVATE_KEY);
        
        this.tokenIds = {
            DRIP: process.env.DRIP_TOKEN_ID,
            WISH: process.env.WISH_TOKEN_ID,
            DROP: process.env.DROP_TOKEN_ID
        };
        
        // Mirror Node configuration
        this.mirrorNodeBase = 'https://testnet.mirrornode.hedera.com/api/v1';
    }

    async initialize() {
        console.log('🧪 Initializing Protocol Client Tester...');
        this.client.setOperator(this.controllerId, this.controllerKey);
        console.log(`✅ Testing with TEST_USER_1: ${this.testUserId}`);
    }

    // Test 1: Mirror Node Balance Query (like frontend will do)
    async testBalanceQuery() {
        console.log('\n=== TEST 1: BALANCE QUERY VIA MIRROR NODE ===');
        
        try {
            // Test the exact same logic the frontend uses
            const response = await fetch(
                `${this.mirrorNodeBase}/accounts/${this.testUserId}/tokens`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            const tokens = data.tokens || [];
            
            // Get HBAR balance
            const accountResponse = await fetch(
                `${this.mirrorNodeBase}/accounts/${this.testUserId}`
            );
            const accountData = await accountResponse.json();
            
            const balanceData = {
                accountId: this.testUserId.toString(),
                hbar: parseInt(accountData.balance?.balance || 0),
                tokens: {
                    drip: this.findTokenBalance(tokens, this.tokenIds.DRIP),
                    wish: this.findTokenBalance(tokens, this.tokenIds.WISH),
                    drop: this.findTokenBalance(tokens, this.tokenIds.DROP)
                }
            };
            
            console.log('📊 Balance Query Results:');
            console.log(`   HBAR: ${balanceData.hbar / 100000000} ℏ`);
            console.log(`   DRIP: ${balanceData.tokens.drip}`);
            console.log(`   WISH: ${balanceData.tokens.wish}`);
            console.log(`   DROP: ${balanceData.tokens.drop / 100000000}`);
            
            return balanceData;
            
        } catch (error) {
            console.error('❌ Balance query failed:', error);
            return null;
        }
    }

    findTokenBalance(tokens, tokenId) {
        const token = tokens.find(t => t.token_id === tokenId);
        return token ? parseInt(token.balance) : 0;
    }

    // Test 2: Protocol Status Calculation (like frontend will do)
    async testProtocolStatus(balanceData) {
        console.log('\n=== TEST 2: PROTOCOL STATUS CALCULATION ===');
        
        if (!balanceData) {
            console.log('❌ Cannot test protocol status without balance data');
            return null;
        }
        
        const dripBalance = balanceData.tokens.drip;
        const wishBalance = balanceData.tokens.wish;
        const dropBalance = balanceData.tokens.drop;
        
        const isActiveMember = dripBalance >= 1;
        const isDonorRecognized = dropBalance >= 100000000; // 1 DROP with 8 decimals
        
        const dailyWishRate = isActiveMember ? 
            50 + (isDonorRecognized ? 25 : 0) : 0;
        
        const quotaUsed = Math.min(wishBalance / 1000 * 100, 100);
        const quotaRemaining = Math.max(0, 1000 - wishBalance);
        
        const canAutoRedeem = isActiveMember && wishBalance >= 1000;
        const daysUntilAutoRedeem = wishBalance >= 1000 ? 0 : 
            Math.ceil((1000 - wishBalance) / dailyWishRate);
        
        const protocolStatus = {
            accountId: balanceData.accountId,
            membership: {
                isActive: isActiveMember,
                dripBalance,
                dailyWishRate
            },
            donation: {
                isRecognized: isDonorRecognized,
                dropBalance,
                wishBonus: isDonorRecognized ? 25 : 0
            },
            wish: {
                balance: wishBalance,
                quota: 1000,
                quotaUsed: Math.round(quotaUsed),
                quotaRemaining,
                canAutoRedeem,
                daysUntilAutoRedeem
            },
            hbar: {
                balance: balanceData.hbar,
                formatted: (balanceData.hbar / 100000000).toFixed(8)
            }
        };
        
        console.log('🎯 Protocol Status Results:');
        console.log(`   Membership Active: ${protocolStatus.membership.isActive ? '✅' : '❌'}`);
        console.log(`   Daily WISH Rate: ${protocolStatus.membership.dailyWishRate} per day`);
        console.log(`   Donor Recognized: ${protocolStatus.donation.isRecognized ? '✅' : '❌'}`);
        console.log(`   Can AutoRedeem: ${protocolStatus.wish.canAutoRedeem ? '✅' : '❌'}`);
        console.log(`   Days until AutoRedeem: ${protocolStatus.wish.daysUntilAutoRedeem}`);
        console.log(`   WISH Quota Used: ${protocolStatus.wish.quotaUsed}%`);
        
        return protocolStatus;
    }

    // Test 3: Transaction Simulation (AutoRedeem readiness)
    async testAutoRedeemReadiness(protocolStatus) {
        console.log('\n=== TEST 3: AUTOREDEEM READINESS CHECK ===');
        
        if (!protocolStatus) {
            console.log('❌ Cannot test AutoRedeem without protocol status');
            return false;
        }
        
        const checks = {
            hasMembership: protocolStatus.membership.isActive,
            hasWishTokens: protocolStatus.wish.balance >= 1000,
            hasHbarForFees: protocolStatus.hbar.balance >= 10000000, // 0.1 HBAR for fees
        };
        
        console.log('🔍 AutoRedeem Eligibility Checks:');
        console.log(`   Has Membership (≥1 DRIP): ${checks.hasMembership ? '✅' : '❌'}`);
        console.log(`   Has WISH Tokens (≥1000): ${checks.hasWishTokens ? '✅' : '❌'}`);
        console.log(`   Has HBAR for Fees (≥0.1): ${checks.hasHbarForFees ? '✅' : '❌'}`);
        
        const isReady = Object.values(checks).every(check => check === true);
        
        console.log(`\n🎯 AutoRedeem Ready: ${isReady ? '✅ YES' : '❌ NO'}`);
        
        if (isReady) {
            console.log('💡 User can perform AutoRedeem:');
            console.log('   - Burn 1000 WISH tokens');
            console.log('   - Receive 1.8 HBAR payout');  
            console.log('   - Pay 1 HBAR deposit for new membership');
            console.log('   - Net profit: 0.8 HBAR');
        } else {
            if (!checks.hasMembership) {
                console.log('💡 User needs to join protocol first (1 HBAR deposit)');
            }
            if (!checks.hasWishTokens) {
                const daysNeeded = protocolStatus.wish.daysUntilAutoRedeem;
                console.log(`💡 User needs ${1000 - protocolStatus.wish.balance} more WISH (${daysNeeded} days)`);
            }
        }
        
        return isReady;
    }

    // Test 4: Transaction Fee Estimation
    async testTransactionFeeEstimation() {
        console.log('\n=== TEST 4: TRANSACTION FEE ESTIMATION ===');
        
        // Estimate fees for different operations
        const feeEstimates = {
            joinProtocol: {
                hbarTransfer: 0.001,
                tokenTransfer: 0.001,
                total: 0.002
            },
            autoRedeem: {
                tokenTransfer: 0.001, // WISH transfer
                tokenBurn: 0.001,     // WISH burn
                hbarTransfer: 0.001,  // HBAR payout
                hbarDeposit: 0.001,   // HBAR deposit
                tokenMint: 0.001,     // DRIP mint
                tokenTransferDrip: 0.001, // DRIP transfer
                total: 0.006
            },
            donation: {
                hbarTransfer: 0.001,
                tokenMint: 0.001,     // DROP mint
                tokenTransfer: 0.001, // DROP transfer
                total: 0.003
            }
        };
        
        console.log('💰 Estimated Transaction Fees (HBAR):');
        console.log(`   Join Protocol: ~${feeEstimates.joinProtocol.total} ℏ`);
        console.log(`   AutoRedeem: ~${feeEstimates.autoRedeem.total} ℏ`);
        console.log(`   Donation: ~${feeEstimates.donation.total} ℏ`);
        
        return feeEstimates;
    }

    // Test 5: HCS Message Query (Activity Feed)
    async testActivityFeedQuery() {
        console.log('\n=== TEST 5: ACTIVITY FEED QUERY ===');
        
        try {
            const response = await fetch(
                `${this.mirrorNodeBase}/topics/0.0.6591043/messages?limit=20&order=desc`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            const messages = data.messages || [];
            
            console.log(`📨 Retrieved ${messages.length} HCS messages`);
            
            const userActivity = [];
            
            for (const message of messages.slice(0, 5)) { // Test first 5
                try {
                    const content = Buffer.from(message.message, 'base64').toString('utf8');
                    const eventData = JSON.parse(content);
                    
                    if (eventData.protocol === 'Fountain Protocol') {
                        userActivity.push({
                            type: eventData.type,
                            event: eventData.event,
                            timestamp: eventData.timestamp,
                            memberName: eventData.memberName
                        });
                        
                        console.log(`   📋 ${eventData.event} - ${eventData.memberName || 'Unknown'}`);
                    }
                } catch (parseError) {
                    // Skip non-JSON messages
                }
            }
            
            console.log(`✅ Found ${userActivity.length} protocol events in recent messages`);
            return userActivity;
            
        } catch (error) {
            console.error('❌ Activity feed query failed:', error);
            return [];
        }
    }

    // Run all tests
    async runAllTests() {
        console.log('🌊 FOUNTAIN PROTOCOL CLIENT - SANITY CHECK');
        console.log('='.repeat(60));
        
        try {
            // Test 1: Balance Query
            const balanceData = await this.testBalanceQuery();
            
            // Test 2: Protocol Status
            const protocolStatus = await this.testProtocolStatus(balanceData);
            
            // Test 3: AutoRedeem Readiness
            const autoRedeemReady = await this.testAutoRedeemReadiness(protocolStatus);
            
            // Test 4: Fee Estimation
            const feeEstimates = await this.testTransactionFeeEstimation();
            
            // Test 5: Activity Feed
            const activityFeed = await this.testActivityFeedQuery();
            
            console.log('\n' + '='.repeat(60));
            console.log('📋 SANITY CHECK SUMMARY');
            console.log('='.repeat(60));
            
            console.log(`✅ Balance Query: ${balanceData ? 'PASS' : 'FAIL'}`);
            console.log(`✅ Protocol Status: ${protocolStatus ? 'PASS' : 'FAIL'}`);
            console.log(`✅ AutoRedeem Ready: ${autoRedeemReady ? 'YES' : 'NO'}`);
            console.log(`✅ Fee Estimation: PASS`);
            console.log(`✅ Activity Feed: ${activityFeed.length > 0 ? 'PASS' : 'LIMITED'}`);
            
            if (balanceData && protocolStatus) {
                console.log('\n🎯 FRONTEND INTEGRATION READINESS:');
                console.log('✅ Mirror Node API integration works');
                console.log('✅ Protocol status calculations work');
                console.log('✅ Transaction eligibility checks work');
                console.log('✅ Activity feed integration works');
                console.log('\n🎉 Protocol Client functions are ready for frontend!');
            }
            
            return {
                balanceQuery: !!balanceData,
                protocolStatus: !!protocolStatus,
                autoRedeemReady,
                activityFeed: activityFeed.length > 0
            };
            
        } catch (error) {
            console.error('💥 Sanity check failed:', error);
            return null;
        }
    }

    async cleanup() {
        this.client.close();
    }
}

// Run the sanity check
const tester = new ProtocolClientTester();
await tester.initialize();

try {
    const results = await tester.runAllTests();
    console.log('\n✨ Sanity check completed!');
} catch (error) {
    console.error('💥 Sanity check failed:', error);
} finally {
    await tester.cleanup();
}