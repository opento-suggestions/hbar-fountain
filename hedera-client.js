/**
 * Hedera Client Connection Management
 * Centralized SDK client with connection pooling and error handling
 */

const { 
  Client, 
  PrivateKey, 
  AccountId,
  Status
} = require('@hashgraph/sdk');

const { CONFIG, getNetworkConfig, isTestnet } = require('../config');

class HederaClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxRetries = 3;
    this.healthCheckInterval = null;
  }

  /**
   * Initialize Hedera client with proper network configuration
   */
  async initialize() {
    try {
      console.log('🔗 Initializing Hedera client...');
      
      const network = getNetworkConfig();
      console.log(`📡 Connecting to ${network.name} network`);
      
      // Create client for appropriate network
      this.client = isTestnet() ? Client.forTestnet() : Client.forMainnet();
      
      // Set operator account
      const operatorId = AccountId.fromString(CONFIG.accounts.operator);
      const operatorKey = PrivateKey.fromString(CONFIG.accounts.operatorKey);
      
      this.client.setOperator(operatorId, operatorKey);
      
      // Configure client timeouts and settings
      this.client.setRequestTimeout(30000); // 30 seconds
      this.client.setMaxTransactionFee(100_000_000); // 1 HBAR max fee
      this.client.setMaxQueryPayment(50_000_000); // 0.5 HBAR max query payment
      
      // Test connection
      await this.testConnection();
      
      this.isConnected = true;
      this.connectionAttempts = 0;
      
      // Start health monitoring
      this.startHealthCheck();
      
      console.log('✅ Hedera client connected successfully');
      console.log(`👤 Operator: ${CONFIG.accounts.operator}`);
      console.log(`🏦 Treasury: ${CONFIG.accounts.treasury}`);
      
      return this.client;
      
    } catch (error) {
      this.connectionAttempts++;
      console.error(`❌ Client initialization failed (attempt ${this.connectionAttempts}):`, error.message);
      
      if (this.connectionAttempts < this.maxRetries) {
        console.log(`🔄 Retrying connection in 5 seconds...`);
        await this.sleep(5000);
        return this.initialize();
      }
      
      throw new Error(`Failed to connect to Hedera after ${this.maxRetries} attempts: ${error.message}`);
    }
  }

  /**
   * Test connection by querying operator account balance
   */
  async testConnection() {
    const { AccountBalanceQuery } = require('@hashgraph/sdk');
    
    const operatorId = AccountId.fromString(CONFIG.accounts.operator);
    const balance = await new AccountBalanceQuery()
      .setAccountId(operatorId)
      .execute(this.client);
    
    console.log(`💰 Operator balance: ${balance.hbars.toString()}`);
    
    // Check treasury balance too
    const treasuryId = AccountId.fromString(CONFIG.accounts.treasury);
    const treasuryBalance = await new AccountBalanceQuery()
      .setAccountId(treasuryId)
      .execute(this.client);
    
    console.log(`🏦 Treasury balance: ${treasuryBalance.hbars.toString()}`);
    
    // Alert if treasury balance is low
    const treasuryHbars = treasuryBalance.hbars.toTinybars().toNumber();
    if (treasuryHbars < CONFIG.monitoring.alerts.treasuryLowBalance) {
      console.warn(`⚠️  Treasury balance is low: ${treasuryBalance.hbars.toString()}`);
    }
  }

  /**
   * Get connected client instance
   */
  getClient() {
    if (!this.isConnected || !this.client) {
      throw new Error('Hedera client not connected. Call initialize() first.');
    }
    return this.client;
  }

  /**
   * Start periodic health checks
   */
  startHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.testConnection();
      } catch (error) {
        console.error('❌ Health check failed:', error.message);
        this.isConnected = false;
        
        // Attempt reconnection
        try {
          await this.initialize();
        } catch (reconnectError) {
          console.error('❌ Reconnection failed:', reconnectError.message);
        }
      }
    }, CONFIG.monitoring.healthCheckInterval);
  }

  /**
   * Stop health monitoring
   */
  stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Graceful shutdown
   */
  async close() {
    console.log('🔌 Closing Hedera client connection...');
    
    this.stopHealthCheck();
    
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
    
    this.isConnected = false;
    console.log('✅ Hedera client closed');
  }

  /**
   * Execute transaction with retry logic and error handling
   */
  async executeTransaction(transaction, description = 'Transaction') {
    const maxRetries = CONFIG.security.maxTransactionRetries;
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📤 Executing ${description} (attempt ${attempt}/${maxRetries})`);
        
        // Set transaction timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Transaction timeout')), CONFIG.security.transactionTimeout);
        });
        
        // Execute with timeout
        const receipt = await Promise.race([
          transaction.execute(this.client).then(txResponse => txResponse.getReceipt(this.client)),
          timeoutPromise
        ]);
        
        if (receipt.status === Status.Success) {
          console.log(`✅ ${description} successful`);
          console.log(`📋 Transaction ID: ${receipt.transactionId}`);
          return receipt;
        } else {
          throw new Error(`Transaction failed with status: ${receipt.status}`);
        }
        
      } catch (error) {
        lastError = error;
        console.error(`❌ ${description} failed (attempt ${attempt}):`, error.message);
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`⏳ Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }
    
    throw new Error(`${description} failed after ${maxRetries} attempts: ${lastError.message}`);
  }

  /**
   * Execute query with retry logic
   */
  async executeQuery(query, description = 'Query') {
    const maxRetries = CONFIG.security.maxTransactionRetries;
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📥 Executing ${description} (attempt ${attempt}/${maxRetries})`);
        
        const result = await query.execute(this.client);
        console.log(`✅ ${description} successful`);
        return result;
        
      } catch (error) {
        lastError = error;
        console.error(`❌ ${description} failed (attempt ${attempt}):`, error.message);
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`⏳ Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }
    
    throw new Error(`${description} failed after ${maxRetries} attempts: ${lastError.message}`);
  }

  /**
   * Get current network status and node information
   */
  async getNetworkStatus() {
    try {
      const { NetworkVersionInfoQuery } = require('@hashgraph/sdk');
      
      const networkVersion = await this.executeQuery(
        new NetworkVersionInfoQuery(),
        'Network version query'
      );
      
      return {
        isConnected: this.isConnected,
        network: getNetworkConfig().name,
        operator: CONFIG.accounts.operator,
        treasury: CONFIG.accounts.treasury,
        networkVersion: {
          hapi: networkVersion.hapiVersion.toString(),
          hedera: networkVersion.hederaServicesVersion.toString()
        }
      };
      
    } catch (error) {
      console.error('❌ Failed to get network status:', error.message);
      return {
        isConnected: this.isConnected,
        network: getNetworkConfig().name,
        error: error.message
      };
    }
  }

  /**
   * Utility function for delays
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if client is healthy and connected
   */
  isHealthy() {
    return this.isConnected && this.client !== null;
  }
}

// Singleton instance
let hederaClientInstance = null;

/**
 * Get or create singleton Hedera client instance
 */
async function getHederaClient() {
  if (!hederaClientInstance) {
    hederaClientInstance = new HederaClient();
    await hederaClientInstance.initialize();
  }
  
  if (!hederaClientInstance.isHealthy()) {
    console.log('🔄 Reinitializing unhealthy client...');
    await hederaClientInstance.initialize();
  }
  
  return hederaClientInstance;
}

/**
 * Close singleton client connection
 */
async function closeHederaClient() {
  if (hederaClientInstance) {
    await hederaClientInstance.close();
    hederaClientInstance = null;
  }
}

module.exports = {
  HederaClient,
  getHederaClient,
  closeHederaClient
};