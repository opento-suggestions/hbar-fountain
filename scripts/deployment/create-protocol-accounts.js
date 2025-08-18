/**
 * Create Treasury and Operator Accounts for Fountain Protocol
 * Based on create-account-example.js
 */

import {
  Client,
  PrivateKey,
  AccountCreateTransaction,
  Hbar
} from "@hashgraph/sdk";
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function createProtocolAccounts() {
  console.log('🏗️  Creating Fountain Protocol Treasury and Operator Accounts');
  console.log('═'.repeat(80));
  
  // Check for existing operator credentials
  const existingOperatorId = process.env.OPERATOR_ACCOUNT_ID;
  const existingOperatorKey = process.env.OPERATOR_PRIVATE_KEY;
  
  if (!existingOperatorId || !existingOperatorKey) {
    console.error('❌ Missing initial operator credentials in .env file');
    console.log('Please set OPERATOR_ACCOUNT_ID and OPERATOR_PRIVATE_KEY to create new accounts');
    process.exit(1);
  }
  
  // Initialize client with existing operator
  const client = Client.forTestnet()
    .setOperator(existingOperatorId, existingOperatorKey);
  
  console.log(`📡 Connected to Hedera Testnet`);
  console.log(`👤 Using existing operator: ${existingOperatorId}`);
  console.log('');
  
  const accounts = {};
  
  try {
    // 1. Create Treasury Account
    console.log('🏦 Creating Treasury Account...');
    const treasuryResult = await createAccount(client, 'Treasury', 50); // 50 HBAR for treasury operations
    accounts.treasury = treasuryResult;
    
    console.log('');
    
    // 2. Create Operator Account  
    console.log('⚙️  Creating Operator Account...');
    const operatorResult = await createAccount(client, 'Operator', 30); // 30 HBAR for operator operations
    accounts.operator = operatorResult;
    
    console.log('');
    console.log('✅ All accounts created successfully!');
    console.log('═'.repeat(80));
    
    // 3. Generate .env file
    await generateEnvFile(accounts);
    
    // 4. Display summary
    displayAccountSummary(accounts);
    
    // 5. Wait for Mirror Node to populate
    console.log('⏳ Waiting for Mirror Node to update...');
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    // 6. Verify accounts via Mirror Node
    await verifyAccountsViaMirrorNode(accounts);
    
  } catch (error) {
    console.error('❌ Account creation failed:', error.message);
    throw error;
  } finally {
    client.close();
  }
  
  return accounts;
}

/**
 * Create a single account with specified funding
 */
async function createAccount(client, accountType, initialBalance) {
  console.log(`   📝 Generating ${accountType} key pair...`);
  
  // Generate new key pair
  const privateKey = PrivateKey.generateECDSA();
  const publicKey = privateKey.publicKey;
  
  console.log(`   💰 Creating account with ${initialBalance} HBAR...`);
  
  // Create account transaction
  const transaction = new AccountCreateTransaction()
    .setECDSAKeyWithAlias(publicKey)
    .setInitialBalance(new Hbar(initialBalance));
  
  const txResponse = await transaction.execute(client);
  const receipt = await txResponse.getReceipt(client);
  const accountId = receipt.accountId;
  
  console.log(`   ✅ ${accountType} account created: ${accountId}`);
  console.log(`   🔑 Private key: ${privateKey.toString()}`);
  console.log(`   🏠 EVM Address: 0x${publicKey.toEvmAddress()}`);
  
  return {
    type: accountType,
    accountId: accountId.toString(),
    privateKey: privateKey.toString(),
    publicKey: publicKey.toString(),
    evmAddress: `0x${publicKey.toEvmAddress()}`,
    initialBalance: initialBalance,
    transactionId: txResponse.transactionId.toString()
  };
}

/**
 * Generate .env file with new account credentials
 */
async function generateEnvFile(accounts) {
  console.log('📄 Generating .env file...');
  
  const envContent = `# Fountain Protocol Account Configuration
# Generated on ${new Date().toISOString()}

# Treasury Account (holds protocol funds, token supplies)
TREASURY_ACCOUNT_ID=${accounts.treasury.accountId}
TREASURY_PRIVATE_KEY=${accounts.treasury.privateKey}

# Operator Account (executes transactions, manages operations)
OPERATOR_ACCOUNT_ID=${accounts.operator.accountId}
OPERATOR_PRIVATE_KEY=${accounts.operator.privateKey}

# Network Configuration
NODE_ENV=testnet
HEDERA_NETWORK=testnet

# Token IDs (from existing deployment)
DRIP_TOKEN_ID=0.0.6591211
WISH_TOKEN_ID=0.0.6590974
DROP_TOKEN_ID=0.0.6590982
HCS_TOPIC_ID=0.0.6591043

# Database
DATABASE_URL=./fountain-protocol.db
DB_TYPE=sqlite

# Features
ENABLE_DONATIONS=true
ENABLE_AUTO_RELEASE=true
ENABLE_GROWTH_MULTIPLIER=true
ENABLE_DONOR_BOOSTER=true
ALLOW_MANUAL_SNAPSHOTS=true

# Development
LOG_LEVEL=info
`;
  
  // Write to .env file
  fs.writeFileSync('.env', envContent);
  console.log('   ✅ .env file created successfully');
  
  // Also create a backup
  const backupName = `.env.backup.${Date.now()}`;
  fs.writeFileSync(backupName, envContent);
  console.log(`   📋 Backup saved as ${backupName}`);
}

/**
 * Display account summary
 */
function displayAccountSummary(accounts) {
  console.log('📋 ACCOUNT SUMMARY');
  console.log('─'.repeat(60));
  
  Object.values(accounts).forEach(account => {
    console.log(`${account.type.toUpperCase()} ACCOUNT:`);
    console.log(`   Account ID: ${account.accountId}`);
    console.log(`   EVM Address: ${account.evmAddress}`);
    console.log(`   Initial Balance: ${account.initialBalance} HBAR`);
    console.log(`   Transaction ID: ${account.transactionId}`);
    console.log('');
  });
  
  console.log('🔐 SECURITY NOTES:');
  console.log('   • Private keys are saved in .env file');
  console.log('   • Backup file created with timestamp');
  console.log('   • Never share private keys publicly');
  console.log('   • Treasury holds protocol funds and token supplies');
  console.log('   • Operator executes daily operations and transactions');
}

/**
 * Verify accounts via Mirror Node
 */
async function verifyAccountsViaMirrorNode(accounts) {
  console.log('🔍 Verifying accounts via Mirror Node...');
  console.log('─'.repeat(60));
  
  for (const account of Object.values(accounts)) {
    try {
      const mirrorUrl = `https://testnet.mirrornode.hedera.com/api/v1/balances?account.id=${account.accountId}`;
      
      const response = await fetch(mirrorUrl);
      const data = await response.json();
      
      if (data.balances && data.balances.length > 0) {
        const balanceInTinybars = data.balances[0].balance;
        const balanceInHbar = balanceInTinybars / 100000000;
        
        console.log(`✅ ${account.type}: ${balanceInHbar} ℏ (${account.accountId})`);
      } else {
        console.log(`⏳ ${account.type}: Balance not yet available (${account.accountId})`);
      }
      
    } catch (error) {
      console.log(`❌ ${account.type}: Mirror Node query failed - ${error.message}`);
    }
  }
  
  console.log('');
  console.log('🎉 Account creation and verification complete!');
  console.log('💡 Accounts are ready for Fountain Protocol deployment');
  console.log('');
  console.log('NEXT STEPS:');
  console.log('1. ✅ Accounts created and funded');
  console.log('2. 🔄 Update config.js to use new account IDs');
  console.log('3. 🚀 Deploy protocol smart contract');
  console.log('4. 🪙 Configure token operations');
  console.log('5. 📸 Test daily snapshot functionality');
}

/**
 * Main execution
 */
async function main() {
  try {
    const accounts = await createProtocolAccounts();
    
    console.log('');
    console.log('🎯 READY FOR PROTOCOL DEPLOYMENT!');
    console.log('All accounts created and configured for testnet operation.');
    
  } catch (error) {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { createProtocolAccounts, createAccount };