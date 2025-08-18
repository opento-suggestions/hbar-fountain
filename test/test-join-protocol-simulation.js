/**
 * Test Join Protocol Functionality
 * Simulate a new user joining the protocol using TEST_USER_2
 * (TEST_USER_2 has DRIP but we'll simulate the join process)
 */

import { 
    Client, 
    TokenMintTransaction,
    TokenUnfreezeTransaction,
    TransferTransaction,
    AccountBalanceQuery,
    PrivateKey,
    AccountId,
    Hbar
} from '@hashgraph/sdk';
import dotenv from 'dotenv';

dotenv.config();

class JoinProtocolTester {
    constructor() {
        this.client = Client.forTestnet();
        this.controllerId = AccountId.fromString(process.env.CONTROLLER_ACCOUNT_ID);
        this.controllerKey = PrivateKey.fromString(process.env.CONTROLLER_PRIVATE_KEY);
        
        // Use OPERATOR account as a "new user" since it has no DRIP
        this.newUserId = AccountId.fromString(process.env.OPERATOR_ACCOUNT_ID);
        this.newUserKey = PrivateKey.fromString(process.env.OPERATOR_PRIVATE_KEY);
        
        this.tokenIds = {
            DRIP: process.env.DRIP_TOKEN_ID,
            WISH: process.env.WISH_TOKEN_ID,
            DROP: process.env.DROP_TOKEN_ID
        };
    }

    async initialize() {
        console.log('🎪 Initializing Join Protocol Tester...');
        this.client.setOperator(this.controllerId, this.controllerKey);
        console.log(`✅ Testing with OPERATOR account (new user): ${this.newUserId}`);
    }

    async checkNewUserStatus() {
        console.log('\n📊 Checking new user current status...');
        
        const balance = await new AccountBalanceQuery()
            .setAccountId(this.newUserId)
            .execute(this.client);
        
        const dripBalance = parseInt(balance.tokens.get(this.tokenIds.DRIP) || 0);
        const wishBalance = parseInt(balance.tokens.get(this.tokenIds.WISH) || 0);
        const hbarBalance = balance.hbars.toTinybars();
        
        console.log(`   HBAR: ${balance.hbars.toString()}`);
        console.log(`   DRIP: ${dripBalance} (Member: ${dripBalance >= 1 ? 'Yes' : 'No'})`);
        console.log(`   WISH: ${wishBalance}`);
        
        const canJoin = hbarBalance >= 100000000; // Need 1 HBAR for membership
        const alreadyMember = dripBalance >= 1;
        
        console.log(`\n🎯 Join Protocol Status:`);
        console.log(`   Already Member: ${alreadyMember ? '✅ YES' : '❌ NO'}`);
        console.log(`   Has HBAR for Membership (≥1): ${canJoin ? '✅' : '❌'}`);
        console.log(`   Can Join Protocol: ${canJoin && !alreadyMember ? '✅ YES' : '❌ NO'}`);
        
        return {
            balances: {
                hbar: hbarBalance,
                drip: dripBalance,
                wish: wishBalance
            },
            canJoin: canJoin && !alreadyMember,
            alreadyMember
        };
    }

    async processJoinProtocol() {
        console.log('\n🎪 Processing Join Protocol...');
        
        try {
            // Step 1: Collect 1 HBAR membership deposit
            console.log('1️⃣ Collecting 1 HBAR membership deposit...');
            
            const depositAmount = Hbar.fromTinybars(100000000); // 1 HBAR
            const depositTx = new TransferTransaction()
                .addHbarTransfer(this.newUserId, depositAmount.negated())
                .addHbarTransfer(this.controllerId, depositAmount)
                .freezeWith(this.client);
            
            const signedDepositTx = await depositTx.sign(this.newUserKey);
            const depositResponse = await signedDepositTx.execute(this.client);
            const depositReceipt = await depositResponse.getReceipt(this.client);
            
            console.log(`   ✅ Membership deposit: ${depositResponse.transactionId}`);
            console.log(`   Status: ${depositReceipt.status}`);
            
            // Step 2: Mint DRIP membership token
            console.log('2️⃣ Minting DRIP membership token...');
            
            const dripMintTx = new TokenMintTransaction()
                .setTokenId(this.tokenIds.DRIP)
                .setAmount(1);
            
            const dripMintResponse = await dripMintTx.execute(this.client);
            const dripMintReceipt = await dripMintResponse.getReceipt(this.client);
            
            console.log(`   ✅ DRIP mint: ${dripMintResponse.transactionId}`);
            console.log(`   Status: ${dripMintReceipt.status}`);
            
            // Step 3: Unfreeze user account for DRIP (if needed)
            console.log('3️⃣ Ensuring account is unfrozen for DRIP...');
            
            try {
                const unfreezeTx = new TokenUnfreezeTransaction()
                    .setTokenId(this.tokenIds.DRIP)
                    .setAccountId(this.newUserId);
                
                const unfreezeResponse = await unfreezeTx.execute(this.client);
                console.log(`   ✅ Unfreeze: ${unfreezeResponse.transactionId}`);
            } catch (unfreezeError) {
                console.log('   ℹ️ Account already unfrozen or unfreeze not needed');
            }
            
            // Step 4: Transfer DRIP to new user
            console.log('4️⃣ Transferring DRIP membership token to user...');
            
            const dripTransferTx = new TransferTransaction()
                .addTokenTransfer(this.tokenIds.DRIP, this.controllerId, -1)
                .addTokenTransfer(this.tokenIds.DRIP, this.newUserId, 1);
            
            const dripTransferResponse = await dripTransferTx.execute(this.client);
            const dripTransferReceipt = await dripTransferResponse.getReceipt(this.client);
            
            console.log(`   ✅ DRIP transfer: ${dripTransferResponse.transactionId}`);
            console.log(`   Status: ${dripTransferReceipt.status}`);
            
            return {
                success: true,
                transactions: {
                    membershipDeposit: depositResponse.transactionId.toString(),
                    dripMint: dripMintResponse.transactionId.toString(),
                    dripTransfer: dripTransferResponse.transactionId.toString()
                }
            };
            
        } catch (error) {
            console.error('❌ Join Protocol failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async verifyMembership() {
        console.log('\n🔍 Verifying new membership...');
        
        // Wait for transactions to settle
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const finalBalance = await new AccountBalanceQuery()
            .setAccountId(this.newUserId)
            .execute(this.client);
        
        const finalDrip = parseInt(finalBalance.tokens.get(this.tokenIds.DRIP) || 0);
        const finalHbar = finalBalance.hbars.toTinybars();
        
        console.log(`📊 Post-Join Balance:`);
        console.log(`   HBAR: ${finalBalance.hbars.toString()}`);
        console.log(`   DRIP: ${finalDrip}`);
        
        // Calculate membership benefits
        const isNowMember = finalDrip >= 1;
        const dailyWishRate = isNowMember ? 50 : 0;
        
        console.log(`\n✅ Membership Verification:`);
        console.log(`   Is Now Member: ${isNowMember ? '✅ YES' : '❌ NO'}`);
        console.log(`   Daily WISH Rate: ${dailyWishRate} per day`);
        console.log(`   WISH Quota: ${isNowMember ? '1000 tokens' : 'N/A'}`);
        console.log(`   Can Earn WISH: ${isNowMember ? '✅ YES' : '❌ NO'}`);
        console.log(`   Can AutoRedeem (when quota full): ${isNowMember ? '✅ YES' : '❌ NO'}`);
        
        return {
            success: isNowMember,
            balances: {
                hbar: finalHbar,
                drip: finalDrip
            },
            membershipActive: isNowMember,
            dailyWishRate
        };
    }

    async testProtocolBenefits() {
        console.log('\n💰 Testing Protocol Benefits (WISH Issuance)...');
        
        // Issue some WISH to demonstrate the benefit
        const wishAmount = 100; // 2 days worth at 50/day
        
        try {
            // Mint WISH
            const mintTx = new TokenMintTransaction()
                .setTokenId(this.tokenIds.WISH)
                .setAmount(wishAmount);
            
            const mintResponse = await mintTx.execute(this.client);
            console.log(`   ✅ Minted ${wishAmount} WISH: ${mintResponse.transactionId}`);
            
            // Unfreeze for WISH if needed
            try {
                const unfreezeTx = new TokenUnfreezeTransaction()
                    .setTokenId(this.tokenIds.WISH)
                    .setAccountId(this.newUserId);
                
                await unfreezeTx.execute(this.client);
            } catch (unfreezeError) {
                // Account likely already unfrozen
            }
            
            // Transfer WISH to new member
            const transferTx = new TransferTransaction()
                .addTokenTransfer(this.tokenIds.WISH, this.controllerId, -wishAmount)
                .addTokenTransfer(this.tokenIds.WISH, this.newUserId, wishAmount);
            
            const transferResponse = await transferTx.execute(this.client);
            console.log(`   ✅ Transferred ${wishAmount} WISH: ${transferResponse.transactionId}`);
            
            // Verify the transfer
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const updatedBalance = await new AccountBalanceQuery()
                .setAccountId(this.newUserId)
                .execute(this.client);
            
            const receivedWish = parseInt(updatedBalance.tokens.get(this.tokenIds.WISH) || 0);
            
            console.log(`\n🎯 Protocol Benefits Demonstrated:`);
            console.log(`   WISH Tokens Received: ${receivedWish}`);
            console.log(`   Represents: ~${receivedWish / 50} days of membership rewards`);
            console.log(`   Progress toward AutoRedeem: ${receivedWish}/1000 (${(receivedWish/10).toFixed(1)}%)`);
            
            return receivedWish === wishAmount;
            
        } catch (error) {
            console.error('❌ Failed to demonstrate protocol benefits:', error);
            return false;
        }
    }

    async run() {
        try {
            await this.initialize();
            
            // Step 1: Check new user status
            const initialStatus = await this.checkNewUserStatus();
            
            if (initialStatus.alreadyMember) {
                console.log('\n⚠️ User is already a member. Simulating join process anyway for testing...');
            }
            
            if (!initialStatus.canJoin && !initialStatus.alreadyMember) {
                console.log('❌ User cannot join protocol (insufficient HBAR)');
                return false;
            }
            
            console.log('\n🎯 PROCEEDING WITH JOIN PROTOCOL TEST');
            
            // Step 2: Process join protocol
            const joinResult = await this.processJoinProtocol();
            
            if (!joinResult.success) {
                console.log('❌ Join Protocol transaction failed');
                return false;
            }
            
            // Step 3: Verify membership
            const verification = await this.verifyMembership();
            
            // Step 4: Test protocol benefits
            const benefitsTest = await this.testProtocolBenefits();
            
            console.log('\n' + '='.repeat(60));
            console.log('🎪 JOIN PROTOCOL TEST COMPLETE');
            console.log('='.repeat(60));
            
            if (verification.success && benefitsTest) {
                console.log('🎉 SUCCESS: Join Protocol working correctly!');
                console.log('✅ Membership deposit processed');
                console.log('✅ DRIP membership token minted and transferred');
                console.log('✅ User now has active membership');
                console.log('✅ Protocol benefits (WISH earning) verified');
                console.log('✅ Ready for frontend integration!');
            } else {
                console.log('❌ FAILURE: Join Protocol has issues');
                if (!verification.success) {
                    console.log('   Issue: Membership not properly activated');
                }
                if (!benefitsTest) {
                    console.log('   Issue: Protocol benefits not working');
                }
            }
            
            return verification.success && benefitsTest;
            
        } catch (error) {
            console.error('💥 Join Protocol test failed:', error);
            return false;
        } finally {
            this.client.close();
        }
    }
}

// Run the Join Protocol test
const tester = new JoinProtocolTester();
tester.run();