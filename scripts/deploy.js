/**
 * Deployment Script for Fountain Protocol Smart Contract
 * Deploys to Hedera Testnet using Hardhat
 */

const { ethers } = require("hardhat");
const { CONFIG } = require("../config");

async function main() {
  console.log("🚀 DEPLOYING FOUNTAIN PROTOCOL TO HEDERA TESTNET");
  console.log("═".repeat(80));
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const deployerBalance = await deployer.getBalance();
  
  console.log("📋 Deployment Information:");
  console.log(`   👤 Deployer Account: ${deployerAddress}`);
  console.log(`   💰 Deployer Balance: ${ethers.utils.formatEther(deployerBalance)} HBAR`);
  console.log(`   🏦 Treasury Account: ${CONFIG.accounts.treasury}`);
  console.log(`   🌐 Network: Hedera Testnet`);
  
  if (deployerBalance.lt(ethers.utils.parseEther("5"))) {
    throw new Error("Insufficient balance for deployment (need at least 5 HBAR)");
  }
  
  console.log("\n🔨 Compiling Contract...");
  
  // Get the contract factory
  const FountainProtocol = await ethers.getContractFactory("FountainProtocol");
  
  console.log("   ✅ Contract compiled successfully");
  
  console.log("\n🚀 Deploying Contract...");
  console.log(`   📞 Constructor Parameter: ${CONFIG.accounts.treasury}`);
  
  // Deploy the contract
  const fountainProtocol = await FountainProtocol.deploy(
    CONFIG.accounts.treasury, // Treasury address as constructor parameter
    {
      gasLimit: 3000000, // 3M gas limit
      gasPrice: ethers.utils.parseUnits("234", "gwei") // 234 Gwei gas price
    }
  );
  
  console.log("   📤 Deployment transaction submitted...");
  console.log(`   🧾 Transaction Hash: ${fountainProtocol.deployTransaction.hash}`);
  
  // Wait for deployment to complete
  console.log("   ⏳ Waiting for confirmation...");
  await fountainProtocol.deployed();
  
  console.log("   ✅ Contract deployed successfully!");
  
  // Get deployment details
  const deploymentReceipt = await fountainProtocol.deployTransaction.wait();
  const contractAddress = fountainProtocol.address;
  const deploymentBlockNumber = deploymentReceipt.blockNumber;
  const gasUsed = deploymentReceipt.gasUsed;
  const gasPrice = deploymentReceipt.effectiveGasPrice;
  const deploymentCost = gasUsed.mul(gasPrice);
  
  console.log("\n🎉 DEPLOYMENT SUCCESSFUL!");
  console.log("═".repeat(80));
  
  console.log("📄 Contract Information:");
  console.log(`   📍 Contract Address: ${contractAddress}`);
  console.log(`   🧱 Block Number: ${deploymentBlockNumber}`);
  console.log(`   ⛽ Gas Used: ${gasUsed.toLocaleString()}`);
  console.log(`   💸 Deployment Cost: ${ethers.utils.formatEther(deploymentCost)} HBAR`);
  
  console.log("\n🔍 Contract Verification:");
  console.log(`   🌐 HashScan: https://hashscan.io/testnet/contract/${contractAddress}`);
  console.log(`   📊 Explorer: https://testnet.hashio.io/address/${contractAddress}`);
  
  console.log("\n🎮 User Interaction:");
  console.log("   Users can now interact directly with the contract:");
  console.log(`   • createMembership() + 1 HBAR → ${contractAddress}`);
  console.log(`   • claimWish(amount) → Claim WISH rewards`);
  console.log(`   • redeemDrip() → Get 0.8 HBAR refund`);
  
  // Test basic contract functionality
  console.log("\n🧪 Testing Contract Functions...");
  
  try {
    // Test view functions
    const canCreate = await fountainProtocol.canCreateMembership(deployerAddress);
    const contractStats = await fountainProtocol.getContractStats();
    
    console.log(`   ✅ canCreateMembership(): ${canCreate}`);
    console.log(`   ✅ getContractStats(): ${contractStats[0].toString()} total members`);
    console.log("   ✅ Contract functions are working correctly");
    
  } catch (error) {
    console.log(`   ⚠️  Function test warning: ${error.message}`);
  }
  
  // Final deployment summary
  const finalBalance = await deployer.getBalance();
  const totalCost = deployerBalance.sub(finalBalance);
  
  console.log("\n📊 DEPLOYMENT SUMMARY:");
  console.log(`   💰 Total Cost: ${ethers.utils.formatEther(totalCost)} HBAR`);
  console.log(`   💳 Remaining Balance: ${ethers.utils.formatEther(finalBalance)} HBAR`);
  console.log(`   🎯 Contract Ready: Users can now send 1 HBAR to create membership`);
  
  console.log("\n🌊 FOUNTAIN PROTOCOL IS LIVE ON HEDERA TESTNET!");
  console.log("═".repeat(80));
  
  // Save deployment information
  const deploymentInfo = {
    contractAddress: contractAddress,
    deployerAddress: deployerAddress,
    treasuryAddress: CONFIG.accounts.treasury,
    deploymentHash: fountainProtocol.deployTransaction.hash,
    blockNumber: deploymentBlockNumber,
    gasUsed: gasUsed.toString(),
    deploymentCost: ethers.utils.formatEther(deploymentCost),
    timestamp: new Date().toISOString(),
    network: "Hedera Testnet"
  };
  
  console.log("\n📋 Deployment Info for Records:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  
  return {
    contract: fountainProtocol,
    address: contractAddress,
    deploymentInfo: deploymentInfo
  };
}

// Execute deployment
if (require.main === module) {
  main()
    .then((result) => {
      console.log("\n✅ Deployment script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Deployment failed:", error.message);
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main };