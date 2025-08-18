/**
 * Check Account Balance Script
 * Verify account has sufficient HBAR for deployment
 */

const { ethers } = require("hardhat");

async function checkBalance() {
  console.log("💰 CHECKING ACCOUNT BALANCE");
  console.log("═".repeat(50));
  
  try {
    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();
    const deployerBalance = await deployer.getBalance();
    
    console.log("📋 Account Information:");
    console.log(`   📍 Address: ${deployerAddress}`);
    console.log(`   💰 Balance: ${ethers.utils.formatEther(deployerBalance)} HBAR`);
    console.log(`   🏦 Balance Wei: ${deployerBalance.toString()}`);
    
    // Check network information
    const network = await ethers.provider.getNetwork();
    console.log(`   🌐 Network: ${network.name} (Chain ID: ${network.chainId})`);
    
    // Check if balance is sufficient for deployment
    const minimumRequired = ethers.utils.parseEther("0.1"); // 0.1 HBAR minimum
    const hasBalance = deployerBalance.gte(minimumRequired);
    
    console.log(`   🎯 Minimum Required: ${ethers.utils.formatEther(minimumRequired)} HBAR`);
    console.log(`   ✅ Has Sufficient Balance: ${hasBalance}`);
    
    if (!hasBalance) {
      console.log("\n⚠️  INSUFFICIENT BALANCE FOR DEPLOYMENT");
      console.log("   💡 Solution: Add HBAR to account or use account with funds");
      console.log("   💡 For testnet: Use Hedera Portal faucet to get test HBAR");
    } else {
      console.log("\n✅ READY FOR DEPLOYMENT");
    }
    
    return {
      address: deployerAddress,
      balance: deployerBalance,
      sufficient: hasBalance
    };
    
  } catch (error) {
    console.error("❌ Balance check failed:", error.message);
    throw error;
  }
}

// Run balance check
if (require.main === module) {
  checkBalance()
    .then((result) => {
      if (result.sufficient) {
        console.log("\n🎯 Account ready for deployment");
      } else {
        console.log("\n⚠️  Please add HBAR to account before deployment");
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Balance check failed:", error.message);
      process.exit(1);
    });
}

module.exports = { checkBalance };