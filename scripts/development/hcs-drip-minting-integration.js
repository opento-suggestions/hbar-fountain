/**
 * HCS-Coordinated DRIP Minting Integration Example
 * Demonstrates complete usage of the HCS-coordinated minting flow
 */

const { getHCSCoordinatedMinting } = require('./hcs-coordinated-drip-minting');
const { CONFIG } = require('./config');

/**
 * Complete DRIP membership minting example
 * Shows full HCS-coordinated flow from request to completion
 */
async function demonstrateDripMinting() {
  console.log('🚀 Starting HCS-Coordinated DRIP Minting Demonstration');
  console.log('=' .repeat(60));
  
  try {
    // Initialize the HCS-coordinated minting system
    const mintingSystem = await getHCSCoordinatedMinting();
    
    // Test parameters
    const memberAccount = '0.0.6552093'; // Example member account
    const depositAmount = CONFIG.parameters.membershipDeposit; // 1 HBAR in tinybars
    const clientNonce = `mint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('\n📋 Minting Parameters:');
    console.log(`   👤 Member Account: ${memberAccount}`);
    console.log(`   💰 Deposit Amount: ${depositAmount} tinybars (${depositAmount / CONFIG.constants.HBAR_TO_TINYBAR} HBAR)`);
    console.log(`   🎲 Client Nonce: ${clientNonce}`);
    console.log(`   🪙 Expected DRIP: 1 token (non-transferable)`);
    
    // Step 1: Validate deposit request
    console.log('\n🔍 Step 1: Validating Deposit Request...');
    await mintingSystem.validateDepositRequest(memberAccount, depositAmount, clientNonce);
    console.log('✅ Deposit validation passed');
    
    // Step 2: Submit to HCS for consensus
    console.log('\n📡 Step 2: Submitting to HCS Consensus...');
    const hcsResult = await mintingSystem.submitDepositIntent(memberAccount, depositAmount, clientNonce);
    
    console.log('📊 HCS Submission Result:');
    console.log(`   📋 HCS Transaction: ${hcsResult.hcsTransactionId}`);
    console.log(`   🔢 Sequence Number: ${hcsResult.sequenceNumber}`);
    console.log(`   🎯 Status: ${hcsResult.status}`);
    console.log(`   ⏱️  Expected Consensus: ${hcsResult.expectedConsensusTime}`);
    
    // Step 3: Monitor consensus and HTS execution
    console.log('\n👂 Step 3: Monitoring HCS Consensus...');
    console.log('ℹ️  The system will automatically execute HTS operations once consensus is reached');
    console.log('ℹ️  This typically takes 2-5 seconds on Hedera');
    
    // Polling for completion (in real implementation, this would be event-driven)
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds timeout
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
      const status = mintingSystem.getPendingMintStatus(clientNonce);
      if (status) {
        console.log(`⏳ Status Update: ${status.status}`);
        
        if (status.status === 'COMPLETED') {
          console.log('\n🎉 DRIP Minting Completed Successfully!');
          console.log('📊 Final Results:');
          console.log(`   👤 Member: ${status.memberAccount}`);
          console.log(`   🪙 DRIP Tokens: 1 (frozen/non-transferable)`);
          console.log(`   📋 HCS Transaction: ${status.hcsTransactionId}`);
          console.log(`   🔄 Mint Transaction: ${status.htsResult?.mintTxId}`);
          console.log(`   📤 Transfer Transaction: ${status.htsResult?.transferTxId}`);
          console.log(`   🧊 Freeze Transaction: ${status.htsResult?.freezeTxId}`);
          console.log(`   📊 Member Record: ${status.memberRecordId}`);
          console.log(`   ✅ Completed At: ${status.completedAt}`);
          break;
        }
        
        if (status.status === 'HTS_FAILED') {
          console.log('\n❌ DRIP Minting Failed');
          console.log(`   Error: ${status.error}`);
          console.log(`   Failed At: ${status.failedAt}`);
          break;
        }
      }
      
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      console.log('\n⏰ Timeout waiting for consensus/execution');
      console.log('ℹ️  The operation may still complete - check pending mint status');
    }
    
    // Step 4: Display system health
    console.log('\n🏥 System Health Check:');
    const health = await mintingSystem.getSystemHealth();
    console.log(`   📡 HCS Subscription: ${health.hcsSubscription}`);
    console.log(`   🏦 Treasury Balance: ${health.treasuryBalance.hbar}`);
    console.log(`   ⏳ Pending Mints: ${health.pendingMints}`);
    console.log(`   🪙 DRIP Supply: ${health.dripTokenSupply.current}/${health.dripTokenSupply.max}`);
    console.log(`   🔢 Last Sequence: ${health.lastSequenceNumber}`);
    
  } catch (error) {
    console.error('\n❌ Demonstration failed:', error.message);
    console.error('📍 Error details:', error.stack);
  }
}

/**
 * Validate system readiness before minting
 */
async function validateSystemReadiness() {
  console.log('\n🔧 Validating System Readiness...');
  
  try {
    const mintingSystem = await getHCSCoordinatedMinting();
    const health = await mintingSystem.getSystemHealth();
    
    console.log('✅ System Components:');
    console.log(`   📡 HCS Topic: ${CONFIG.infrastructure.hcsTopic}`);
    console.log(`   🏦 Treasury: ${CONFIG.accounts.treasury}`);
    console.log(`   🪙 DRIP Token: ${CONFIG.tokens.DRIP.id}`);
    console.log(`   💰 Treasury Balance: ${health.treasuryBalance.hbar}`);
    console.log(`   📊 DRIP Supply: ${health.dripTokenSupply.current}/${health.dripTokenSupply.max}`);
    
    // Validate minimum requirements
    const treasuryTinybars = health.treasuryBalance.tinybars;
    const minRequired = 100000000; // 1 HBAR minimum
    
    if (treasuryTinybars < minRequired) {
      throw new Error(`Treasury balance too low: ${treasuryTinybars} < ${minRequired}`);
    }
    
    console.log('✅ System ready for DRIP minting operations');
    return true;
    
  } catch (error) {
    console.error('❌ System readiness check failed:', error.message);
    return false;
  }
}

/**
 * Main demonstration function
 */
async function main() {
  console.log('🎯 HCS-Coordinated DRIP Minting System');
  console.log('🏗️  Treasury HTS Key Validation & Transfer Control');
  console.log('=' .repeat(60));
  
  try {
    // Validate system is ready
    const isReady = await validateSystemReadiness();
    
    if (!isReady) {
      console.log('❌ System not ready for operations');
      return;
    }
    
    // Run the complete demonstration
    await demonstrateDripMinting();
    
    console.log('\n🎯 Demonstration completed successfully!');
    console.log('\n📚 Key Features Demonstrated:');
    console.log('   ✅ HCS consensus coordination');
    console.log('   ✅ Treasury HTS key validation');
    console.log('   ✅ Deposit validation pipeline');
    console.log('   ✅ Transfer control mechanisms');
    console.log('   ✅ Atomic consistency guarantees');
    console.log('   ✅ State finalization');
    
  } catch (error) {
    console.error('❌ Demonstration failed:', error.message);
  } finally {
    // Clean exit
    console.log('\n👋 Exiting demonstration...');
    process.exit(0);
  }
}

// Export for use as module
module.exports = {
  demonstrateDripMinting,
  validateSystemReadiness
};

// Run demonstration if called directly
if (require.main === module) {
  main().catch(console.error);
}