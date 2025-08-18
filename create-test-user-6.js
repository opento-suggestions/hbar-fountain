/**
 * Create TEST_USER_6 Account
 * Creates new account, associates with all protocol tokens, funds with 3 HBAR from treasury
 */

import { 
    Client, 
    AccountCreateTransaction, 
    TokenAssociateTransaction,
    TransferTransaction,
    AccountBalanceQuery,
    PrivateKey,
    AccountId,
    Hbar
} from '@hashgraph/sdk';
import dotenv from 'dotenv';

dotenv.config();

async function createTestUser6() {
    console.log('🆕 Creating TEST_USER_6 account...');
    
    const client = Client.forTestnet();
    
    // Treasury setup for funding
    const treasuryId = AccountId.fromString(process.env.CONTROLLER_ACCOUNT_ID);
    const treasuryKey = PrivateKey.fromString(process.env.CONTROLLER_PRIVATE_KEY);
    
    client.setOperator(treasuryId, treasuryKey);
    
    try {
        console.log('=== STEP 1: CREATE NEW ACCOUNT ===');
        
        // Generate new key pair for TEST_USER_6
        const newAccountPrivateKey = PrivateKey.generateED25519();
        const newAccountPublicKey = newAccountPrivateKey.publicKey;
        
        console.log(`Private Key: ${newAccountPrivateKey.toString()}`);
        console.log(`Public Key: ${newAccountPublicKey.toString()}`);
        
        // Create account with 1 HBAR initial balance
        const newAccountTransaction = new AccountCreateTransaction()
            .setKey(newAccountPublicKey)
            .setInitialBalance(Hbar.fromTinybars(100000000)); // 1 HBAR
        
        const newAccountResponse = await newAccountTransaction.execute(client);
        const newAccountReceipt = await newAccountResponse.getReceipt(client);
        const newAccountId = newAccountReceipt.accountId;
        
        console.log(`✅ Account Created: ${newAccountId}`);
        console.log(`Transaction ID: ${newAccountResponse.transactionId}`);
        
        console.log('\n=== STEP 2: ASSOCIATE WITH PROTOCOL TOKENS ===');
        
        // Set operator to new account for associations
        client.setOperator(newAccountId, newAccountPrivateKey);
        
        const tokenIds = [
            process.env.DRIP_TOKEN_ID,
            process.env.WISH_TOKEN_ID,
            process.env.DROP_TOKEN_ID
        ];
        
        console.log(`Associating with tokens: ${tokenIds.join(', ')}`);
        
        const associateTransaction = new TokenAssociateTransaction()
            .setAccountId(newAccountId)
            .setTokenIds(tokenIds);
        
        const associateResponse = await associateTransaction.execute(client);
        const associateReceipt = await associateResponse.getReceipt(client);
        
        console.log(`✅ Token Associations: ${associateResponse.transactionId}`);
        
        console.log('\n=== STEP 3: FUND WITH 3 HBAR FROM TREASURY ===');
        
        // Switch back to treasury for funding
        client.setOperator(treasuryId, treasuryKey);
        
        const fundingAmount = Hbar.fromTinybars(300000000); // 3 HBAR
        
        const fundingTransaction = new TransferTransaction()
            .addHbarTransfer(treasuryId, fundingAmount.negated())
            .addHbarTransfer(newAccountId, fundingAmount);
        
        const fundingResponse = await fundingTransaction.execute(client);
        const fundingReceipt = await fundingResponse.getReceipt(client);
        
        console.log(`✅ Funding Transfer: ${fundingResponse.transactionId}`);
        console.log(`💰 Transferred ${fundingAmount.toString()} to TEST_USER_6`);
        
        console.log('\n=== STEP 4: VERIFY FINAL BALANCE ===');
        
        const finalBalance = await new AccountBalanceQuery()
            .setAccountId(newAccountId)
            .execute(client);
        
        console.log(`TEST_USER_6 Final Balance:`);
        console.log(`   HBAR: ${finalBalance.hbars.toString()}`);
        console.log(`   DRIP: ${finalBalance.tokens.get(process.env.DRIP_TOKEN_ID) || 0}`);
        console.log(`   WISH: ${finalBalance.tokens.get(process.env.WISH_TOKEN_ID) || 0}`);
        console.log(`   DROP: ${finalBalance.tokens.get(process.env.DROP_TOKEN_ID) || 0}`);
        
        console.log('\n=== STEP 5: TREASURY BALANCE CHECK ===');
        
        const treasuryBalance = await new AccountBalanceQuery()
            .setAccountId(treasuryId)
            .execute(client);
        
        console.log(`Treasury Balance After Funding:`);
        console.log(`   HBAR: ${treasuryBalance.hbars.toString()}`);
        
        console.log('\n🎉 TEST_USER_6 CREATION COMPLETE!');
        console.log('\n📋 ACCOUNT DETAILS FOR .env:');
        console.log(`TEST_USER_6_ACCOUNT_ID=${newAccountId}`);
        console.log(`TEST_USER_6_PRIVATE_KEY=${newAccountPrivateKey.toString()}`);
        
        console.log('\n✅ READY FOR PROTOCOL TESTING');
        console.log('   - Account created and funded');
        console.log('   - Associated with all protocol tokens');
        console.log('   - Ready for deposits, claims, and donations');
        
        return {
            accountId: newAccountId.toString(),
            privateKey: newAccountPrivateKey.toString(),
            publicKey: newAccountPublicKey.toString(),
            hbarBalance: finalBalance.hbars.toString(),
            tokenAssociations: {
                DRIP: process.env.DRIP_TOKEN_ID,
                WISH: process.env.WISH_TOKEN_ID,
                DROP: process.env.DROP_TOKEN_ID
            }
        };
        
    } catch (error) {
        console.error('❌ Account creation failed:', error.message);
        throw error;
    } finally {
        client.close();
    }
}

// Run the account creation
createTestUser6()
    .then(result => {
        console.log('\n🚀 Account creation completed successfully!');
    })
    .catch(error => {
        console.error('\n💥 Account creation failed:', error);
        process.exit(1);
    });