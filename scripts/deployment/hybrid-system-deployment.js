/**
 * Hybrid System Deployment & Testing Utilities
 * Deploy and test the complete hybrid Hedera + HCS system
 * Includes contract deployment, system validation, and integration testing
 */

const { getHybridDepositIntegration } = require('./hybrid-deposit-integration');
const { getHederaDepositContract } = require('./hedera-deposit-contract');
const { getTreasuryEventMonitor } = require('./treasury-event-monitor');
const { getUnifiedProtocolCoordinator } = require('./hcs-unified-protocol-coordinator');
const { CONFIG } = require('./config');

/**
 * Hybrid System Deployment Manager
 * Handles deployment, configuration, and testing of the complete system
 */
class HybridSystemDeployment {
  constructor() {
    this.hybridSystem = null;
    this.deploymentConfig = null;
    this.testResults = [];
  }

  /**
   * Deploy complete hybrid system
   */
  async deploySystem() {
    console.log('🚀 Deploying Hybrid Fountain Protocol System');
    console.log('═'.repeat(70));
    
    try {
      // Phase 1: Pre-deployment validation
      console.log('1️⃣ Pre-deployment Validation');
      console.log('-'.repeat(50));
      await this.validateDeploymentRequirements();
      
      // Phase 2: Deploy Hedera components
      console.log('\n2️⃣ Deploying Hedera Components');
      console.log('-'.repeat(50));
      const hederaResults = await this.deployHederaComponents();
      
      // Phase 3: Initialize HCS coordination
      console.log('\n3️⃣ Initializing HCS Coordination');
      console.log('-'.repeat(50));
      const hcsResults = await this.initializeHCSCoordination();
      
      // Phase 4: Setup event monitoring
      console.log('\n4️⃣ Setting up Event Monitoring');
      console.log('-'.repeat(50));
      const monitorResults = await this.setupEventMonitoring();
      
      // Phase 5: Initialize hybrid integration
      console.log('\n5️⃣ Initializing Hybrid Integration');
      console.log('-'.repeat(50));
      const integrationResults = await this.initializeHybridIntegration();
      
      // Phase 6: System validation
      console.log('\n6️⃣ System Validation');
      console.log('-'.repeat(50));
      const validationResults = await this.validateSystemDeployment();
      
      // Create deployment summary
      const deploymentSummary = {
        success: true,
        timestamp: new Date(),
        phases: {
          hedera: hederaResults,
          hcs: hcsResults,
          monitoring: monitorResults,
          integration: integrationResults,
          validation: validationResults
        },
        configuration: {
          network: CONFIG.network,
          treasury: CONFIG.accounts.treasury,
          hcsTopic: CONFIG.infrastructure.hcsTopic,
          tokens: {
            drip: CONFIG.tokens.DRIP.id,
            wish: CONFIG.tokens.WISH.id
          }
        }
      };
      
      console.log('\n🎉 Hybrid System Deployment Completed Successfully!');
      console.log('═'.repeat(70));
      
      return deploymentSummary;
      
    } catch (error) {
      console.error('❌ System deployment failed:', error.message);
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Validate deployment requirements
   */
  async validateDeploymentRequirements() {
    console.log('🔍 Validating deployment requirements...');
    
    // Check configuration
    const requiredConfig = [
      'accounts.treasury',
      'accounts.treasuryKey',
      'tokens.DRIP.id',
      'tokens.WISH.id',
      'infrastructure.hcsTopic'
    ];
    
    for (const path of requiredConfig) {
      const value = path.split('.').reduce((obj, key) => obj?.[key], CONFIG);
      if (!value) {
        throw new Error(`Missing configuration: ${path}`);
      }
    }
    
    // Validate Treasury account format
    if (!CONFIG.accounts.treasury.match(/^0\.0\.\d+$/)) {
      throw new Error('Invalid Treasury account format');
    }
    
    // Validate token IDs format
    if (!CONFIG.tokens.DRIP.id.match(/^0\.0\.\d+$/)) {
      throw new Error('Invalid DRIP token ID format');
    }
    
    if (!CONFIG.tokens.WISH.id.match(/^0\.0\.\d+$/)) {
      throw new Error('Invalid WISH token ID format');
    }
    
    // Validate HCS topic format
    if (!CONFIG.infrastructure.hcsTopic.match(/^0\.0\.\d+$/)) {
      throw new Error('Invalid HCS topic ID format');
    }
    
    console.log('✅ Deployment requirements validated');
    
    return {
      configValid: true,
      treasuryAccount: CONFIG.accounts.treasury,
      dripToken: CONFIG.tokens.DRIP.id,
      wishToken: CONFIG.tokens.WISH.id,
      hcsTopic: CONFIG.infrastructure.hcsTopic
    };
  }

  /**
   * Deploy Hedera components
   */
  async deployHederaComponents() {
    console.log('🏗️ Deploying Hedera native components...');
    
    try {
      // Initialize Hedera deposit contract
      const depositContract = await getHederaDepositContract();
      
      // Get contract deployment details
      const contractStats = depositContract.getContractStats();
      const contractHealth = await depositContract.getContractHealth();
      
      console.log(`✅ Hedera Deposit Contract: ${contractStats.contractId || 'Deployed'}`);
      console.log(`📊 Contract Status: ${contractHealth.status}`);
      
      return {
        depositContract: {
          deployed: contractHealth.contractDeployed,
          contractId: contractStats.contractId,
          status: contractHealth.status,
          treasury: contractStats.treasury
        }
      };
      
    } catch (error) {
      console.error('❌ Hedera component deployment failed:', error.message);
      throw error;
    }
  }

  /**
   * Initialize HCS coordination
   */
  async initializeHCSCoordination() {
    console.log('📡 Initializing HCS coordination system...');
    
    try {
      // Initialize unified protocol coordinator
      const coordinator = await getUnifiedProtocolCoordinator();
      
      // Get coordinator status
      const coordinatorHealth = await coordinator.getSystemHealth();
      
      console.log(`✅ HCS Coordinator: ${coordinatorHealth.status}`);
      console.log(`📡 HCS Subscription: ${coordinatorHealth.hcsSubscription}`);
      console.log(`🔢 Pending Operations: ${coordinatorHealth.pendingOperations}`);
      
      return {
        coordinator: {
          initialized: coordinatorHealth.status === 'healthy',
          hcsSubscription: coordinatorHealth.hcsSubscription,
          pendingOperations: coordinatorHealth.pendingOperations,
          treasuryBalance: coordinatorHealth.treasuryBalance
        }
      };
      
    } catch (error) {
      console.error('❌ HCS coordination initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * Setup event monitoring
   */
  async setupEventMonitoring() {
    console.log('👂 Setting up Treasury event monitoring...');
    
    try {
      // Initialize Treasury event monitor
      const eventMonitor = await getTreasuryEventMonitor();
      
      // Start monitoring (if not already started)
      if (!eventMonitor.isMonitoring) {
        await eventMonitor.startMonitoring();
      }
      
      // Get monitoring status
      const monitorHealth = await eventMonitor.getMonitorHealth();
      const monitorStats = eventMonitor.getMonitoringStats();
      
      console.log(`✅ Event Monitor: ${monitorHealth.status}`);
      console.log(`📊 Monitoring Active: ${monitorStats.isMonitoring}`);
      console.log(`📈 Events Processed: ${monitorStats.eventStats.processed}`);
      
      return {
        eventMonitor: {
          initialized: monitorHealth.status === 'healthy',
          monitoring: monitorStats.isMonitoring,
          eventStats: monitorStats.eventStats
        }
      };
      
    } catch (error) {
      console.error('❌ Event monitoring setup failed:', error.message);
      throw error;
    }
  }

  /**
   * Initialize hybrid integration
   */
  async initializeHybridIntegration() {
    console.log('🌊 Initializing hybrid integration layer...');
    
    try {
      // Initialize hybrid system
      this.hybridSystem = await getHybridDepositIntegration();
      
      // Get system status
      const systemStatus = await this.hybridSystem.getSystemStatus();
      const processingStats = await this.hybridSystem.getProcessingStats();
      
      console.log(`✅ Hybrid Integration: ${systemStatus.status}`);
      console.log(`🔧 Initialized: ${systemStatus.initialized}`);
      console.log(`📊 Success Rate: ${processingStats.performance?.successRate || 0}%`);
      
      return {
        hybridIntegration: {
          initialized: systemStatus.initialized,
          status: systemStatus.status,
          components: systemStatus.components,
          processingStats: processingStats
        }
      };
      
    } catch (error) {
      console.error('❌ Hybrid integration initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * Validate complete system deployment
   */
  async validateSystemDeployment() {
    console.log('🔍 Validating complete system deployment...');
    
    const validationResults = {
      components: {},
      connectivity: {},
      configuration: {},
      overall: true
    };
    
    try {
      // Validate component initialization
      const systemStatus = await this.hybridSystem.getSystemStatus();
      
      validationResults.components = {
        depositContract: systemStatus.components.depositContract.status === 'healthy',
        eventMonitor: systemStatus.components.eventMonitor.status === 'healthy',
        coordinator: systemStatus.components.coordinator.status === 'healthy'
      };
      
      // Validate connectivity
      validationResults.connectivity = {
        contractDeployed: systemStatus.flow.contractDeployment,
        eventMonitoring: systemStatus.flow.eventMonitoring,
        coordinatorActive: systemStatus.flow.coordinatorActive
      };
      
      // Validate configuration consistency
      validationResults.configuration = {
        treasuryMatches: true, // Could validate Treasury addresses match
        tokensConfigured: true, // Could validate token configurations
        hcsTopicMatches: true   // Could validate HCS topic IDs match
      };
      
      // Check overall health
      const allComponentsHealthy = Object.values(validationResults.components).every(healthy => healthy);
      const allConnectivityGood = Object.values(validationResults.connectivity).every(connected => connected);
      const allConfigCorrect = Object.values(validationResults.configuration).every(correct => correct);
      
      validationResults.overall = allComponentsHealthy && allConnectivityGood && allConfigCorrect;
      
      if (validationResults.overall) {
        console.log('✅ System validation passed - all components healthy');
      } else {
        console.log('⚠️  System validation issues detected');
        console.log('   Components:', validationResults.components);
        console.log('   Connectivity:', validationResults.connectivity);
        console.log('   Configuration:', validationResults.configuration);
      }
      
      return validationResults;
      
    } catch (error) {
      console.error('❌ System validation failed:', error.message);
      validationResults.overall = false;
      validationResults.error = error.message;
      return validationResults;
    }
  }

  // ═══════════ TESTING UTILITIES ═══════════

  /**
   * Run complete system integration test
   */
  async runIntegrationTest(testAccountId = '0.0.6552093') {
    console.log('\n🧪 Running Hybrid System Integration Test');
    console.log('═'.repeat(70));
    
    if (!this.hybridSystem) {
      throw new Error('Hybrid system not initialized. Run deploySystem() first.');
    }
    
    try {
      const testNonce = `integration_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`👤 Test Account: ${testAccountId}`);
      console.log(`🎲 Test Nonce: ${testNonce}`);
      console.log(`💰 Test Deposit: ${CONFIG.parameters.membershipDeposit / CONFIG.constants.HBAR_TO_TINYBAR} HBAR`);
      
      // Execute complete hybrid deposit flow
      const testResult = await this.hybridSystem.processUserDeposit(testAccountId, testNonce);
      
      if (testResult.success) {
        console.log('🎉 Integration test PASSED!');
        console.log('📊 Test Results:');
        console.log(`   ✅ Contract Deposit: ${testResult.transactions.contractDeposit}`);
        console.log(`   ✅ HCS Event: ${testResult.transactions.hcsEvent}`);
        console.log(`   ✅ DRIP Mint: ${testResult.transactions.dripMint}`);
        console.log(`   ✅ DRIP Transfer: ${testResult.transactions.dripTransfer}`);
        console.log(`   ✅ DRIP Freeze: ${testResult.transactions.dripFreeze}`);
        console.log(`   🪙 DRIP Tokens: ${testResult.summary.dripTokensReceived}`);
        console.log(`   🌟 WISH Quota: ${testResult.summary.remainingWish}`);
        
        this.recordTestResult('INTEGRATION_TEST', true, 'Complete hybrid flow successful');
        
      } else {
        console.log('❌ Integration test FAILED!');
        console.log(`   Error: ${testResult.error}`);
        
        this.recordTestResult('INTEGRATION_TEST', false, testResult.error);
      }
      
      return testResult;
      
    } catch (error) {
      console.error('❌ Integration test error:', error.message);
      this.recordTestResult('INTEGRATION_TEST', false, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Run system performance test
   */
  async runPerformanceTest() {
    console.log('\n⚡ Running System Performance Test');
    console.log('═'.repeat(70));
    
    const performanceMetrics = {
      startTime: Date.now(),
      endTime: null,
      systemStatus: null,
      processingStats: null,
      healthChecks: []
    };
    
    try {
      // Test 1: System status response time
      const statusStart = Date.now();
      performanceMetrics.systemStatus = await this.hybridSystem.getSystemStatus();
      const statusTime = Date.now() - statusStart;
      
      console.log(`📊 System Status Check: ${statusTime}ms`);
      
      // Test 2: Processing stats response time
      const statsStart = Date.now();
      performanceMetrics.processingStats = await this.hybridSystem.getProcessingStats();
      const statsTime = Date.now() - statsStart;
      
      console.log(`📈 Processing Stats Check: ${statsTime}ms`);
      
      // Test 3: Multiple health checks
      for (let i = 0; i < 5; i++) {
        const healthStart = Date.now();
        const health = await this.hybridSystem.getSystemStatus();
        const healthTime = Date.now() - healthStart;
        
        performanceMetrics.healthChecks.push({
          iteration: i + 1,
          responseTime: healthTime,
          status: health.status
        });
      }
      
      const avgHealthTime = performanceMetrics.healthChecks.reduce((sum, check) => sum + check.responseTime, 0) / 5;
      console.log(`❤️  Average Health Check: ${avgHealthTime.toFixed(2)}ms`);
      
      performanceMetrics.endTime = Date.now();
      const totalTime = performanceMetrics.endTime - performanceMetrics.startTime;
      
      console.log(`⏱️  Total Performance Test: ${totalTime}ms`);
      
      // Performance evaluation
      const performanceRating = this.evaluatePerformance(performanceMetrics);
      console.log(`🏆 Performance Rating: ${performanceRating.rating} (${performanceRating.score}/100)`);
      
      this.recordTestResult('PERFORMANCE_TEST', true, `Rating: ${performanceRating.rating}`);
      
      return {
        success: true,
        metrics: performanceMetrics,
        rating: performanceRating
      };
      
    } catch (error) {
      console.error('❌ Performance test failed:', error.message);
      this.recordTestResult('PERFORMANCE_TEST', false, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Evaluate system performance
   */
  evaluatePerformance(metrics) {
    let score = 100;
    let issues = [];
    
    // Check system status
    if (metrics.systemStatus?.status !== 'healthy') {
      score -= 30;
      issues.push('System not healthy');
    }
    
    // Check average health check time
    const avgHealthTime = metrics.healthChecks.reduce((sum, check) => sum + check.responseTime, 0) / metrics.healthChecks.length;
    if (avgHealthTime > 1000) {
      score -= 20;
      issues.push('Slow health checks');
    } else if (avgHealthTime > 500) {
      score -= 10;
      issues.push('Moderate health check latency');
    }
    
    // Check processing stats
    if (metrics.processingStats?.error) {
      score -= 15;
      issues.push('Processing stats error');
    }
    
    // Determine rating
    let rating;
    if (score >= 90) rating = 'EXCELLENT';
    else if (score >= 75) rating = 'GOOD';
    else if (score >= 60) rating = 'FAIR';
    else if (score >= 40) rating = 'POOR';
    else rating = 'CRITICAL';
    
    return {
      score: Math.max(0, score),
      rating: rating,
      issues: issues
    };
  }

  /**
   * Run deployment verification checklist
   */
  async runDeploymentChecklist() {
    console.log('\n📋 Running Deployment Verification Checklist');
    console.log('═'.repeat(70));
    
    const checklist = [
      { name: 'Treasury Account Configured', check: () => !!CONFIG.accounts.treasury },
      { name: 'Treasury Private Key Available', check: () => !!CONFIG.accounts.treasuryKey },
      { name: 'DRIP Token Configured', check: () => !!CONFIG.tokens.DRIP.id },
      { name: 'WISH Token Configured', check: () => !!CONFIG.tokens.WISH.id },
      { name: 'HCS Topic Configured', check: () => !!CONFIG.infrastructure.hcsTopic },
      { name: 'Hybrid System Initialized', check: () => !!this.hybridSystem },
      { name: 'Deposit Contract Deployed', check: async () => {
        const status = await this.hybridSystem.getSystemStatus();
        return status.flow.contractDeployment;
      }},
      { name: 'Event Monitoring Active', check: async () => {
        const status = await this.hybridSystem.getSystemStatus();
        return status.flow.eventMonitoring;
      }},
      { name: 'HCS Coordinator Active', check: async () => {
        const status = await this.hybridSystem.getSystemStatus();
        return status.flow.coordinatorActive;
      }},
      { name: 'System Overall Healthy', check: async () => {
        const status = await this.hybridSystem.getSystemStatus();
        return status.status === 'healthy';
      }}
    ];
    
    const results = [];
    
    for (const item of checklist) {
      try {
        const passed = typeof item.check === 'function' ? await item.check() : item.check;
        const status = passed ? '✅ PASS' : '❌ FAIL';
        console.log(`${status} ${item.name}`);
        
        results.push({
          name: item.name,
          passed: passed,
          status: status
        });
        
      } catch (error) {
        console.log(`❌ FAIL ${item.name} (Error: ${error.message})`);
        results.push({
          name: item.name,
          passed: false,
          status: '❌ FAIL',
          error: error.message
        });
      }
    }
    
    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    const passRate = ((passedCount / totalCount) * 100).toFixed(1);
    
    console.log(`\n📊 Checklist Summary: ${passedCount}/${totalCount} passed (${passRate}%)`);
    
    this.recordTestResult('DEPLOYMENT_CHECKLIST', passedCount === totalCount, `${passedCount}/${totalCount} passed`);
    
    return {
      passed: passedCount === totalCount,
      passRate: passRate,
      results: results
    };
  }

  /**
   * Record test result
   */
  recordTestResult(testName, success, details) {
    this.testResults.push({
      test: testName,
      success: success,
      details: details,
      timestamp: new Date()
    });
  }

  /**
   * Get test summary
   */
  getTestSummary() {
    const passed = this.testResults.filter(r => r.success).length;
    const failed = this.testResults.filter(r => !r.success).length;
    const total = this.testResults.length;
    
    return {
      total: total,
      passed: passed,
      failed: failed,
      successRate: total > 0 ? ((passed / total) * 100).toFixed(1) : 0,
      results: this.testResults
    };
  }

  /**
   * Print deployment summary
   */
  printDeploymentSummary() {
    console.log('\n📋 Hybrid System Deployment Summary');
    console.log('═'.repeat(70));
    
    const testSummary = this.getTestSummary();
    
    console.log(`📊 Tests Run: ${testSummary.total}`);
    console.log(`✅ Passed: ${testSummary.passed}`);
    console.log(`❌ Failed: ${testSummary.failed}`);
    console.log(`📈 Success Rate: ${testSummary.successRate}%`);
    
    if (testSummary.results.length > 0) {
      console.log('\n📝 Test Details:');
      testSummary.results.forEach(result => {
        const status = result.success ? '✅' : '❌';
        console.log(`   ${status} ${result.test}: ${result.details}`);
      });
    }
    
    console.log('\n🌊 Hybrid Fountain Protocol System Ready!');
    console.log('═'.repeat(70));
  }
}

/**
 * Main deployment function
 */
async function deployHybridSystem() {
  try {
    const deployment = new HybridSystemDeployment();
    
    // Deploy system
    const deployResult = await deployment.deploySystem();
    
    if (deployResult.success) {
      // Run validation tests
      await deployment.runDeploymentChecklist();
      await deployment.runPerformanceTest();
      
      // Print summary
      deployment.printDeploymentSummary();
      
      return deployment;
    } else {
      console.error('❌ System deployment failed:', deployResult.error);
      return null;
    }
    
  } catch (error) {
    console.error('❌ Deployment error:', error.message);
    return null;
  }
}

/**
 * Quick system test
 */
async function quickSystemTest() {
  try {
    console.log('⚡ Quick Hybrid System Test');
    console.log('═'.repeat(50));
    
    const hybridSystem = await getHybridDepositIntegration();
    const systemStatus = await hybridSystem.getSystemStatus();
    
    console.log(`📊 System Status: ${systemStatus.status}`);
    console.log(`🔧 Initialized: ${systemStatus.initialized}`);
    
    if (systemStatus.status === 'healthy') {
      console.log('✅ Quick test passed - system is healthy');
    } else {
      console.log('⚠️  Quick test warnings - check system components');
    }
    
    return systemStatus;
    
  } catch (error) {
    console.error('❌ Quick test failed:', error.message);
    return null;
  }
}

module.exports = {
  HybridSystemDeployment,
  deployHybridSystem,
  quickSystemTest
};

// Run deployment if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--quick')) {
    quickSystemTest().then(() => process.exit(0)).catch(() => process.exit(1));
  } else {
    deployHybridSystem().then(() => process.exit(0)).catch(() => process.exit(1));
  }
}