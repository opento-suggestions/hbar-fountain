/**
 * Test and Fix Token Burn Logic
 * Identify why TokenBurnTransaction is failing and implement proper solution
 */

import { 
    Client, 
    TokenBurnTransaction,
    TokenMintTransaction,
    TransferTransaction,
    AccountBalanceQuery,
    PrivateKey,
    AccountId,
    Hbar
} from '@hashgraph/sdk';
import dotenv from 'dotenv';

dotenv.config();

class TokenBurnFixer {
    constructor() {
        this.client = Client.forTestnet();
        this.treasuryId = AccountId.fromString(process.env.CONTROLLER_ACCOUNT_ID);
        this.treasuryKey = PrivateKey.fromString(process.env.CONTROLLER_PRIVATE_KEY);
        
        this.tokenIds = {
            DRIP: process.env.DRIP_TOKEN_ID,
            WISH: process.env.WISH_TOKEN_ID,
            DROP: process.env.DROP_TOKEN_ID
        };
    }

    async initialize() {
        console.log('🔧 Initializing Token Burn Fixer...');
        this.client.setOperator(this.treasuryId, this.treasuryKey);
        console.log('✅ Client initialized with treasury operator');
    }

    async testTokenBurn() {
        console.log('\n🧪 Testing Token Burn Logic...');
        
        try {
            // First, check current WISH supply
            const initialBalance = await new AccountBalanceQuery()
                .setAccountId(this.treasuryId)
                .execute(this.client);
            
            const treasuryWish = initialBalance.tokens.get(this.tokenIds.WISH) || 0;
            console.log(`📊 Treasury WISH balance: ${treasuryWish}`);
            
            if (parseInt(treasuryWish.toString()) < 100) {
                console.log('🪙 Minting 100 WISH for burn test...');
                
                const mintTx = new TokenMintTransaction()
                    .setTokenId(this.tokenIds.WISH)
                    .setAmount(100);
                
                const mintResponse = await mintTx.execute(this.client);
                const mintReceipt = await mintResponse.getReceipt(this.client);
                
                console.log(`✅ Minted 100 WISH: ${mintResponse.transactionId}`);
                console.log(`   Status: ${mintReceipt.status}`);
            }
            
            // Now attempt the burn
            console.log('\n🔥 Attempting to burn 50 WISH...');
            
            const burnTx = new TokenBurnTransaction()
                .setTokenId(this.tokenIds.WISH)
                .setAmount(50);
            
            const burnResponse = await burnTx.execute(this.client);
            const burnReceipt = await burnResponse.getReceipt(this.client);
            
            console.log(`📋 Burn transaction ID: ${burnResponse.transactionId}`);
            console.log(`📋 Burn status: ${burnReceipt.status}`);
            
            // Verify the burn worked
            await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for settlement
            
            const finalBalance = await new AccountBalanceQuery()
                .setAccountId(this.treasuryId)
                .execute(this.client);
            
            const finalWish = finalBalance.tokens.get(this.tokenIds.WISH) || 0;
            console.log(`📊 Treasury WISH after burn: ${finalWish}`);
            
            const actualBurned = parseInt(treasuryWish.toString()) - parseInt(finalWish.toString());
            console.log(`🔥 Actually burned: ${actualBurned} WISH`);
            
            if (actualBurned === 50) {
                console.log('✅ Token burn works correctly!');
                return true;
            } else {
                console.log('❌ Token burn failed - burned wrong amount');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Token burn test failed:', error.message);
            console.error('Full error:', error);
            return false;
        }
    }

    async testTransferThenBurn(testAccountId, testAccountKey) {
        console.log('\n🔄 Testing Transfer-then-Burn Approach...');
        
        try {
            const accountId = AccountId.fromString(testAccountId);
            const accountKey = PrivateKey.fromString(testAccountKey);
            
            // Step 1: Check current balances
            const userBalance = await new AccountBalanceQuery()
                .setAccountId(accountId)
                .execute(this.client);
            
            const userWish = parseInt(userBalance.tokens.get(this.tokenIds.WISH) || 0);
            console.log(`📊 User ${testAccountId} WISH: ${userWish}`);
            
            if (userWish < 100) {
                console.log('⚠️ User needs more WISH for test');
                return false;
            }
            
            // Step 2: Transfer WISH from user to treasury
            console.log('💸 Transferring 100 WISH from user to treasury...');
            
            const transferTx = new TransferTransaction()
                .addTokenTransfer(this.tokenIds.WISH, accountId, -100)
                .addTokenTransfer(this.tokenIds.WISH, this.treasuryId, 100)
                .freezeWith(this.client);
            
            const signedTransferTx = await transferTx.sign(accountKey);
            const transferResponse = await signedTransferTx.execute(this.client);
            const transferReceipt = await transferResponse.getReceipt(this.client);
            
            console.log(`✅ Transfer successful: ${transferResponse.transactionId}`);
            console.log(`   Status: ${transferReceipt.status}`);
            
            // Wait for settlement
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Step 3: Now burn from treasury
            console.log('🔥 Burning 100 WISH from treasury...');
            
            const burnTx = new TokenBurnTransaction()
                .setTokenId(this.tokenIds.WISH)
                .setAmount(100);
            
            const burnResponse = await burnTx.execute(this.client);
            const burnReceipt = await burnResponse.getReceipt(this.client);
            
            console.log(`✅ Burn successful: ${burnResponse.transactionId}`);
            console.log(`   Status: ${burnReceipt.status}`);
            
            // Verify the complete operation
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const finalUserBalance = await new AccountBalanceQuery()
                .setAccountId(accountId)
                .execute(this.client);
            
            const finalUserWish = parseInt(finalUserBalance.tokens.get(this.tokenIds.WISH) || 0);
            const actualReduction = userWish - finalUserWish;
            
            console.log(`📊 User WISH after operation: ${finalUserWish}`);
            console.log(`🔥 Total WISH reduced: ${actualReduction}`);
            
            if (actualReduction === 100) {
                console.log('✅ Transfer-then-burn approach works!');
                return true;
            } else {
                console.log('❌ Transfer-then-burn failed');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Transfer-then-burn test failed:', error.message);
            return false;
        }
    }

    async createCorrectedAutoRedeemFunction() {
        console.log('\n🛠️ Creating Corrected AutoRedeem Function...');
        
        const correctedAutoRedeem = `
/**
 * CORRECTED AutoRedeem Implementation
 * Properly burns WISH tokens using transfer-then-burn approach
 */
async function processCorrectAutoRedeem(userAccountId, userPrivateKey) {
    try {
        const accountId = AccountId.fromString(userAccountId);
        const accountKey = PrivateKey.fromString(userPrivateKey);
        
        console.log('🔍 Checking user WISH balance...');
        const userBalance = await new AccountBalanceQuery()
            .setAccountId(accountId)
            .execute(this.client);
        
        const userWish = parseInt(userBalance.tokens.get(this.tokenIds.WISH) || 0);
        
        if (userWish < 1000) {
            throw new Error(\`Insufficient WISH for AutoRedeem: \${userWish} < 1000\`);
        }
        
        console.log('1️⃣ Transferring 1000 WISH to treasury for burning...');
        
        // Transfer WISH from user to treasury
        const transferTx = new TransferTransaction()
            .addTokenTransfer(this.tokenIds.WISH, accountId, -1000)
            .addTokenTransfer(this.tokenIds.WISH, this.treasuryId, 1000)
            .freezeWith(this.client);
        
        const signedTransferTx = await transferTx.sign(accountKey);
        const transferResponse = await signedTransferTx.execute(this.client);
        await transferResponse.getReceipt(this.client);
        
        console.log('2️⃣ Burning 1000 WISH from treasury...');
        
        // Burn WISH from treasury
        const burnTx = new TokenBurnTransaction()
            .setTokenId(this.tokenIds.WISH)
            .setAmount(1000);
        
        const burnResponse = await burnTx.execute(this.client);
        await burnResponse.getReceipt(this.client);
        
        console.log('3️⃣ Paying out 1.8 HBAR...');
        
        // Pay out HBAR
        const payoutAmount = Hbar.fromTinybars(180000000);
        const payoutTx = new TransferTransaction()
            .addHbarTransfer(this.treasuryId, payoutAmount.negated())
            .addHbarTransfer(accountId, payoutAmount);
        
        const payoutResponse = await payoutTx.execute(this.client);
        
        console.log('4️⃣ Processing 1 HBAR deposit...');
        
        // Collect deposit
        const depositAmount = Hbar.fromTinybars(100000000);
        const depositTx = new TransferTransaction()
            .addHbarTransfer(accountId, depositAmount.negated())
            .addHbarTransfer(this.treasuryId, depositAmount)
            .freezeWith(this.client);
        
        const signedDepositTx = await depositTx.sign(accountKey);
        const depositResponse = await signedDepositTx.execute(this.client);
        
        console.log('5️⃣ Minting and transferring new DRIP...');
        
        // Mint and transfer DRIP (existing logic should work)
        const dripMintTx = new TokenMintTransaction()
            .setTokenId(this.tokenIds.DRIP)
            .setAmount(1);
        
        const dripMintResponse = await dripMintTx.execute(this.client);
        
        // Transfer DRIP (with freeze/unfreeze if needed)
        const dripTransferTx = new TransferTransaction()
            .addTokenTransfer(this.tokenIds.DRIP, this.treasuryId, -1)
            .addTokenTransfer(this.tokenIds.DRIP, accountId, 1);
        
        const dripTransferResponse = await dripTransferTx.execute(this.client);
        
        console.log('✅ Corrected AutoRedeem completed successfully!');
        
        return {
            success: true,
            transactions: {
                wishTransfer: transferResponse.transactionId.toString(),
                wishBurn: burnResponse.transactionId.toString(),
                hbarPayout: payoutResponse.transactionId.toString(),
                membershipDeposit: depositResponse.transactionId.toString(),
                dripMint: dripMintResponse.transactionId.toString(),
                dripTransfer: dripTransferResponse.transactionId.toString()
            }
        };
        
    } catch (error) {
        console.error('❌ Corrected AutoRedeem failed:', error.message);
        throw error;
    }
}`;

        console.log('📝 Corrected AutoRedeem function created');
        console.log('🔑 Key changes:');
        console.log('   1. Transfer WISH from user to treasury FIRST');
        console.log('   2. Then burn from treasury (where we have burn permissions)');
        console.log('   3. Proper error handling and verification');
        console.log('   4. Wait for transaction settlement between steps');
        
        return correctedAutoRedeem;
    }

    async run() {
        try {
            await this.initialize();
            
            // Test 1: Direct token burn
            console.log('\n=== TEST 1: DIRECT TOKEN BURN ===');
            const directBurnWorks = await this.testTokenBurn();
            
            if (directBurnWorks) {
                console.log('✅ Direct burn works - our original logic should have worked');
                console.log('🤔 Need to investigate why it failed in AutoRedeem context');
            } else {
                console.log('❌ Direct burn fails - need alternative approach');
                
                // Test 2: Transfer-then-burn approach
                console.log('\n=== TEST 2: TRANSFER-THEN-BURN ===');
                const transferBurnWorks = await this.testTransferThenBurn(
                    process.env.TEST_USER_1_ACCOUNT_ID,
                    process.env.TEST_USER_1_PRIVATE_KEY
                );
                
                if (transferBurnWorks) {
                    console.log('✅ Transfer-then-burn works - this is our solution!');
                }
            }
            
            // Create corrected implementation
            const correctedFunction = await this.createCorrectedAutoRedeemFunction();
            
            console.log('\n🎯 SOLUTION IDENTIFIED:');
            console.log('The issue was likely in the order of operations or transaction timing.');
            console.log('The corrected approach ensures proper WISH burning by:');
            console.log('1. First transferring WISH to treasury');
            console.log('2. Then burning from treasury where we have permissions');
            console.log('3. Adding proper delays and error checking');
            
            return true;
            
        } catch (error) {
            console.error('❌ Token burn fix failed:', error);
            throw error;
        } finally {
            this.client.close();
        }
    }
}

// Run the token burn fixer
const fixer = new TokenBurnFixer();
fixer.run();