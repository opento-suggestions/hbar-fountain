/**
 * Check Hedera Account Balance Directly
 * Use Hedera SDK to check the actual account balance
 */

const { Client, AccountBalanceQuery, AccountId, PrivateKey } = require("@hashgraph/sdk");
const { CONFIG } = require("../config");

async function checkHederaBalance() {
  console.log("💰 CHECKING HEDERA ACCOUNT BALANCE DIRECTLY");
  console.log("═".repeat(60));
  
  try {
    // Initialize Hedera client
    const client = Client.forTestnet();
    const accountId = AccountId.fromString(CONFIG.accounts.treasury);
    const privateKey = PrivateKey.fromString(CONFIG.accounts.treasuryKey);
    
    client.setOperator(accountId, privateKey);
    
    console.log("📋 Account Information:");
    console.log(`   🆔 Hedera Account ID: ${accountId}`);
    console.log(`   📍 Ethereum Address: ${accountId.toSolidityAddress()}`);
    
    // Query account balance using Hedera SDK
    const balance = await new AccountBalanceQuery()
      .setAccountId(accountId)
      .execute(client);
    
    const hbarBalance = balance.hbars;
    const tinybars = hbarBalance.toTinybars();
    
    console.log(`   💰 HBAR Balance: ${hbarBalance.toString()}`);
    console.log(`   🔢 Tinybars: ${tinybars.toString()}`);
    
    // Check if sufficient for deployment
    const minimumRequired = 5; // 5 HBAR for deployment
    const sufficient = hbarBalance.toTinybars().toNumber() >= (minimumRequired * 100000000);
    
    console.log(`   🎯 Minimum Required: ${minimumRequired} HBAR`);
    console.log(`   ✅ Sufficient for Deployment: ${sufficient}`);
    
    if (sufficient) {
      console.log("\n🎉 ACCOUNT HAS SUFFICIENT BALANCE!");
      console.log("   💡 The issue might be with Ethereum address derivation");
      console.log("   💡 Hedera accounts work differently than Ethereum accounts");
    } else {
      console.log("\n⚠️  INSUFFICIENT BALANCE FOR DEPLOYMENT");
      console.log("   💡 Need to add more HBAR to this account");
    }
    
    // Show token balances too
    console.log("\n🪙 Token Balances:");
    const tokens = balance.tokens;
    if (tokens && tokens.size > 0) {
      tokens.forEach((amount, tokenId) => {
        console.log(`   ${tokenId}: ${amount.toString()}`);
      });
    } else {
      console.log("   No token balances found");
    }
    
    client.close();
    
    return {
      hederaAccountId: accountId.toString(),
      ethereumAddress: accountId.toSolidityAddress(),
      hbarBalance: hbarBalance.toString(),
      sufficient: sufficient
    };
    
  } catch (error) {
    console.error("❌ Hedera balance check failed:", error.message);
    throw error;
  }
}

// Run balance check
if (require.main === module) {
  checkHederaBalance()
    .then((result) => {
      console.log("\n📊 BALANCE CHECK COMPLETE");
      console.log(`   🆔 Account: ${result.hederaAccountId}`);
      console.log(`   💰 Balance: ${result.hbarBalance}`);
      console.log(`   ✅ Ready: ${result.sufficient}`);
      
      if (result.sufficient) {
        console.log("\n🚀 Ready to proceed with deployment!");
      } else {
        console.log("\n💡 Add HBAR to account before deployment");
      }
      
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Balance check failed:", error.message);
      process.exit(1);
    });
}

module.exports = { checkHederaBalance };