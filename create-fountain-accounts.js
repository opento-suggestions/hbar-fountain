import {
  Client,
  PrivateKey,
  AccountCreateTransaction,
  Hbar
} from "@hashgraph/sdk";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function createFountainAccounts() {
  console.log('🏗️  Creating Fountain Protocol Treasury and Operator Accounts');
  console.log('═'.repeat(80));
  
  // Load existing operator credentials
  const operatorId = process.env.OPERATOR_ACCOUNT_ID;
  const operatorKey = process.env.OPERATOR_PRIVATE_KEY;

  if (!operatorId || !operatorKey) {
    console.error('❌ Missing operator credentials in .env file');
    return;
  }

  // Initialize the client for testnet
  const client = Client.forTestnet()
    .setOperator(operatorId, operatorKey);

  console.log(`📡 Connected to Hedera Testnet`);
  console.log(`👤 Using operator: ${operatorId}`);
  console.log('');

  try {
    // Create Treasury Account
    console.log('🏦 Creating Treasury Account...');
    const treasuryKey = PrivateKey.generateECDSA();
    const treasuryPublicKey = treasuryKey.publicKey;

    const treasuryTransaction = new AccountCreateTransaction()
      .setECDSAKeyWithAlias(treasuryPublicKey)
      .setInitialBalance(new Hbar(50)); // 50 HBAR for treasury

    const treasuryResponse = await treasuryTransaction.execute(client);
    const treasuryReceipt = await treasuryResponse.getReceipt(client);
    const treasuryAccountId = treasuryReceipt.accountId;

    console.log(`✅ Treasury account created: ${treasuryAccountId}`);
    console.log(`🔑 Treasury private key: ${treasuryKey.toString()}`);
    console.log(`🏠 Treasury EVM address: 0x${treasuryPublicKey.toEvmAddress()}`);
    console.log('');

    // Create Operator Account
    console.log('⚙️  Creating Protocol Operator Account...');
    const newOperatorKey = PrivateKey.generateECDSA();
    const newOperatorPublicKey = newOperatorKey.publicKey;

    const operatorTransaction = new AccountCreateTransaction()
      .setECDSAKeyWithAlias(newOperatorPublicKey)
      .setInitialBalance(new Hbar(30)); // 30 HBAR for operations

    const operatorResponse = await operatorTransaction.execute(client);
    const operatorReceipt = await operatorResponse.getReceipt(client);
    const newOperatorAccountId = operatorReceipt.accountId;

    console.log(`✅ Protocol operator created: ${newOperatorAccountId}`);
    console.log(`🔑 Operator private key: ${newOperatorKey.toString()}`);
    console.log(`🏠 Operator EVM address: 0x${newOperatorPublicKey.toEvmAddress()}`);
    console.log('');

    // Display summary
    console.log('📋 ACCOUNT SUMMARY');
    console.log('─'.repeat(60));
    console.log('TREASURY ACCOUNT:');
    console.log(`   Account ID: ${treasuryAccountId}`);
    console.log(`   Private Key: ${treasuryKey.toString()}`);
    console.log(`   EVM Address: 0x${treasuryPublicKey.toEvmAddress()}`);
    console.log(`   Initial Balance: 50 HBAR`);
    console.log('');
    console.log('PROTOCOL OPERATOR ACCOUNT:');
    console.log(`   Account ID: ${newOperatorAccountId}`);
    console.log(`   Private Key: ${newOperatorKey.toString()}`);
    console.log(`   EVM Address: 0x${newOperatorPublicKey.toEvmAddress()}`);
    console.log(`   Initial Balance: 30 HBAR`);
    console.log('');

    // Wait for Mirror Node to update
    console.log("⏳ Waiting for Mirror Node to update...");
    await new Promise(resolve => setTimeout(resolve, 6000));

    // Verify treasury account
    const treasuryUrl = `https://testnet.mirrornode.hedera.com/api/v1/balances?account.id=${treasuryAccountId}`;
    try {
      const treasuryResponse = await fetch(treasuryUrl);
      const treasuryData = await treasuryResponse.json();
      
      if (treasuryData.balances && treasuryData.balances.length > 0) {
        const treasuryBalance = treasuryData.balances[0].balance / 100000000;
        console.log(`✅ Treasury balance verified: ${treasuryBalance} ℏ`);
      }
    } catch (error) {
      console.log('⏳ Treasury balance not yet available in Mirror Node');
    }

    // Verify operator account
    const operatorUrl = `https://testnet.mirrornode.hedera.com/api/v1/balances?account.id=${newOperatorAccountId}`;
    try {
      const operatorResponse = await fetch(operatorUrl);
      const operatorData = await operatorResponse.json();
      
      if (operatorData.balances && operatorData.balances.length > 0) {
        const operatorBalance = operatorData.balances[0].balance / 100000000;
        console.log(`✅ Operator balance verified: ${operatorBalance} ℏ`);
      }
    } catch (error) {
      console.log('⏳ Operator balance not yet available in Mirror Node');
    }

    console.log('');
    console.log('🎉 ACCOUNTS CREATED SUCCESSFULLY!');
    console.log('');
    console.log('📝 UPDATE YOUR .env FILE:');
    console.log('─'.repeat(60));
    console.log(`TREASURY_ACCOUNT_ID=${treasuryAccountId}`);
    console.log(`TREASURY_PRIVATE_KEY=${treasuryKey.toString()}`);
    console.log(`OPERATOR_ACCOUNT_ID=${newOperatorAccountId}`);
    console.log(`OPERATOR_PRIVATE_KEY=${newOperatorKey.toString()}`);
    console.log('');
    console.log('🔐 SECURITY REMINDER:');
    console.log('   • Save these private keys securely');
    console.log('   • Never share private keys publicly');
    console.log('   • Update your .env file with the new credentials');

    client.close();

  } catch (error) {
    console.error('❌ Account creation failed:', error.message);
    client.close();
  }
}

createFountainAccounts().catch(console.error);