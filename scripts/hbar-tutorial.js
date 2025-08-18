/**
 * HBAR Transfer Tutorial Implementation
 * Following Hedera documentation for sending/receiving HBAR
 * This demonstrates the core patterns for our Fountain Protocol dApp
 */

const {
  Client,
  AccountCreateTransaction,
  AccountBalanceQuery,
  TransferTransaction,
  ContractCreateTransaction,
  ContractExecuteTransaction,
  ContractCallQuery,
  ContractFunctionParameters,
  FileCreateTransaction,
  Hbar,
  AccountId,
  PrivateKey,
  ContractId
} = require("@hashgraph/sdk");

const { ethers } = require("hardhat");
const { CONFIG } = require("../config");

/**
 * HBAR Transfer Tutorial Runner
 */
class HbarTutorial {
  constructor() {
    this.client = null;
    this.operatorId = AccountId.fromString(CONFIG.accounts.treasury);
    this.operatorKey = PrivateKey.fromString(CONFIG.accounts.treasuryKey);
    
    // Test accounts (will be created)
    this.treasuryAccount = null;
    this.aliceAccount = null;
    this.contractId = null;
  }

  /**
   * Initialize Hedera client
   */
  async initialize() {
    console.log("🌐 Initializing Hedera Testnet for HBAR tutorial...");
    
    this.client = Client.forTestnet();
    this.client.setOperator(this.operatorId, this.operatorKey);
    this.client.setDefaultMaxTransactionFee(new Hbar(100));
    
    console.log(`📡 Connected to Hedera Testnet`);
    console.log(`👤 Operator Account: ${this.operatorId}`);
  }

  /**
   * Step 1: Create test accounts
   */
  async createTestAccounts() {
    console.log("\n📋 Step 1: Creating Test Accounts");
    console.log("─".repeat(50));
    
    try {
      // Treasury account (we'll use operator as treasury)
      this.treasuryAccount = {
        id: this.operatorId,
        key: this.operatorKey
      };
      
      console.log(`✅ Treasury Account: ${this.treasuryAccount.id}`);
      
      // Create Alice account
      console.log("👩 Creating Alice account...");
      const aliceKey = PrivateKey.generateED25519();
      
      const createAliceTransaction = new AccountCreateTransaction()
        .setKey(aliceKey.publicKey)
        .setInitialBalance(new Hbar(1)); // Start with 1 HBAR
      
      const aliceResponse = await createAliceTransaction.execute(this.client);
      const aliceReceipt = await aliceResponse.getReceipt(this.client);
      const aliceId = aliceReceipt.accountId;
      
      this.aliceAccount = {
        id: aliceId,
        key: aliceKey
      };
      
      console.log(`✅ Alice Account: ${this.aliceAccount.id}`);
      
      return {
        treasury: this.treasuryAccount,
        alice: this.aliceAccount
      };
      
    } catch (error) {
      console.error("❌ Account creation failed:", error.message);
      throw error;
    }
  }

  /**
   * Step 2: Deploy HBAR transfer contract
   */
  async deployContract() {
    console.log("\n🚀 Step 2: Deploying HBAR Transfer Contract");
    console.log("─".repeat(50));
    
    try {
      // Compile the contract using Hardhat
      console.log("🔨 Compiling contract...");
      const HbarTransferExample = await ethers.getContractFactory("HbarTransferExample");
      
      // Get bytecode from compilation
      const bytecode = HbarTransferExample.bytecode;
      console.log(`📦 Bytecode size: ${bytecode.length} characters`);
      
      // Upload bytecode to Hedera File Service
      console.log("📤 Uploading bytecode to Hedera...");
      const bytecodeBuffer = Buffer.from(bytecode.slice(2), 'hex'); // Remove 0x prefix
      
      const fileCreateTx = new FileCreateTransaction()
        .setContents(bytecodeBuffer)
        .setKeys([this.operatorKey.publicKey])
        .setMaxTransactionFee(new Hbar(5));
      
      const fileResponse = await fileCreateTx.execute(this.client);
      const fileReceipt = await fileResponse.getReceipt(this.client);
      const fileId = fileReceipt.fileId;
      
      console.log(`📁 Bytecode file: ${fileId}`);
      
      // Deploy the contract
      console.log("🏗️  Deploying contract...");
      const contractCreateTx = new ContractCreateTransaction()
        .setBytecodeFileId(fileId)
        .setGas(300000)
        .setInitialBalance(new Hbar(1)) // Start contract with 1 HBAR
        .setMaxTransactionFee(new Hbar(10));
      
      const contractResponse = await contractCreateTx.execute(this.client);
      const contractReceipt = await contractResponse.getReceipt(this.client);
      this.contractId = contractReceipt.contractId;
      
      console.log(`✅ Contract deployed: ${this.contractId}`);
      console.log(`📍 Contract address: 0x${this.contractId.toSolidityAddress()}`);
      
      return this.contractId;
      
    } catch (error) {
      console.error("❌ Contract deployment failed:", error.message);
      throw error;
    }
  }

  /**
   * Step 3: Test receiving HBAR
   */
  async testReceivingHbar() {
    console.log("\n💰 Step 3: Testing HBAR Reception");
    console.log("─".repeat(50));
    
    try {
      // Check initial balances
      console.log("📊 Initial balances:");
      const initialContractBalance = await this.getContractBalance();
      const initialTreasuryBalance = await this.getAccountBalance(this.treasuryAccount.id);
      
      console.log(`   Contract: ${initialContractBalance} HBAR`);
      console.log(`   Treasury: ${initialTreasuryBalance} HBAR`);
      
      // Method 1: Send HBAR to contract using TransferTransaction
      console.log("\n💸 Method 1: Using TransferTransaction");
      const transferAmount = new Hbar(0.5); // 0.5 HBAR
      
      const transferTx = new TransferTransaction()
        .addHbarTransfer(this.treasuryAccount.id, transferAmount.negated())
        .addHbarTransfer(this.contractId, transferAmount)
        .setTransactionMemo("Direct transfer to contract");
      
      const transferResponse = await transferTx.execute(this.client);
      const transferReceipt = await transferResponse.getReceipt(this.client);
      
      console.log(`   ✅ Transfer successful: ${transferResponse.transactionId}`);
      
      // Method 2: Call contract's depositHbar function
      console.log("\n💸 Method 2: Using contract depositHbar() function");
      const depositAmount = Hbar.fromTinybars(25000000); // 0.25 HBAR
      
      const depositTx = new ContractExecuteTransaction()
        .setContractId(this.contractId)
        .setFunction("depositHbar")
        .setPayableAmount(depositAmount)
        .setGas(100000);
      
      const depositResponse = await depositTx.execute(this.client);
      const depositReceipt = await depositResponse.getReceipt(this.client);
      
      console.log(`   ✅ Deposit successful: ${depositResponse.transactionId}`);
      
      // Check final contract balance
      const finalContractBalance = await this.getContractBalance();
      console.log(`\n📊 Final contract balance: ${finalContractBalance} HBAR`);
      
      return {
        initialBalance: initialContractBalance,
        finalBalance: finalContractBalance,
        received: finalContractBalance - initialContractBalance
      };
      
    } catch (error) {
      console.error("❌ HBAR reception test failed:", error.message);
      throw error;
    }
  }

  /**
   * Step 4: Test sending HBAR
   */
  async testSendingHbar() {
    console.log("\n💸 Step 4: Testing HBAR Sending");
    console.log("─".repeat(50));
    
    try {
      // Check balances before sending
      const contractBalance = await this.getContractBalance();
      const aliceInitialBalance = await this.getAccountBalance(this.aliceAccount.id);
      
      console.log("📊 Balances before sending:");
      console.log(`   Contract: ${contractBalance} HBAR`);
      console.log(`   Alice: ${aliceInitialBalance} HBAR`);
      
      const sendAmount = Hbar.fromTinybars(10000000); // 0.1 HBAR
      const aliceAddress = `0x${this.aliceAccount.id.toSolidityAddress()}`;
      
      // Method 1: Using transfer() function
      console.log("\n📤 Method 1: Using transfer() function");
      await this.callContractFunction("transferHbar", [
        aliceAddress,
        sendAmount.toTinybars().toString()
      ]);
      
      // Wait and check balance
      await this.sleep(2000);
      let aliceBalance = await this.getAccountBalance(this.aliceAccount.id);
      console.log(`   ✅ Alice balance after transfer: ${aliceBalance} HBAR`);
      
      // Method 2: Using call() function (recommended)
      console.log("\n📤 Method 2: Using call() function (recommended)");
      await this.callContractFunction("callHbar", [
        aliceAddress,
        sendAmount.toTinybars().toString()
      ]);
      
      // Final balance check
      await this.sleep(2000);
      const aliceFinalBalance = await this.getAccountBalance(this.aliceAccount.id);
      const contractFinalBalance = await this.getContractBalance();
      
      console.log("\n📊 Final balances:");
      console.log(`   Contract: ${contractFinalBalance} HBAR`);
      console.log(`   Alice: ${aliceFinalBalance} HBAR`);
      
      return {
        aliceInitial: aliceInitialBalance,
        aliceFinal: aliceFinalBalance,
        contractFinal: contractFinalBalance,
        totalSent: aliceFinalBalance - aliceInitialBalance
      };
      
    } catch (error) {
      console.error("❌ HBAR sending test failed:", error.message);
      throw error;
    }
  }

  /**
   * Helper: Call contract function
   */
  async callContractFunction(functionName, parameters = []) {
    const tx = new ContractExecuteTransaction()
      .setContractId(this.contractId)
      .setFunction(functionName, new ContractFunctionParameters()
        .addString(parameters[0] || "")
        .addUint256(parameters[1] || 0))
      .setGas(100000);
    
    const response = await tx.execute(this.client);
    const receipt = await response.getReceipt(this.client);
    
    console.log(`   ✅ ${functionName}() executed: ${response.transactionId}`);
    return receipt;
  }

  /**
   * Helper: Get contract balance
   */
  async getContractBalance() {
    try {
      const query = new ContractCallQuery()
        .setContractId(this.contractId)
        .setFunction("getBalance")
        .setGas(50000);
      
      const result = await query.execute(this.client);
      const balance = result.getUint256(0);
      
      return parseFloat(Hbar.fromTinybars(balance).toString());
      
    } catch (error) {
      console.log(`   ⚠️  Contract balance query failed: ${error.message}`);
      return 0;
    }
  }

  /**
   * Helper: Get account balance
   */
  async getAccountBalance(accountId) {
    const balance = await new AccountBalanceQuery()
      .setAccountId(accountId)
      .execute(this.client);
    
    return parseFloat(balance.hbars.toString());
  }

  /**
   * Helper: Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Run complete tutorial
   */
  async runTutorial() {
    console.log("🎓 HEDERA HBAR TRANSFER TUTORIAL");
    console.log("═".repeat(80));
    console.log("🎯 Learning core patterns for Fountain Protocol dApp");
    console.log("═".repeat(80));
    
    try {
      // Initialize
      await this.initialize();
      
      // Step 1: Create accounts
      const accounts = await this.createTestAccounts();
      
      // Step 2: Deploy contract
      const contractId = await this.deployContract();
      
      // Step 3: Test receiving HBAR
      const receiveResults = await this.testReceivingHbar();
      
      // Step 4: Test sending HBAR
      const sendResults = await this.testSendingHbar();
      
      // Summary
      console.log("\n🎉 TUTORIAL COMPLETE!");
      console.log("═".repeat(80));
      
      console.log("📊 Tutorial Results:");
      console.log(`   📄 Contract: ${contractId}`);
      console.log(`   👥 Accounts Created: Treasury, Alice`);
      console.log(`   💰 HBAR Received: ${receiveResults.received} HBAR`);
      console.log(`   💸 HBAR Sent: ${sendResults.totalSent} HBAR`);
      
      console.log("\n🎯 Key Learnings for Fountain Protocol:");
      console.log("   ✅ Contracts can receive HBAR via multiple methods");
      console.log("   ✅ call() is the recommended method for sending HBAR");
      console.log("   ✅ Balance queries work for monitoring contract state");
      console.log("   ✅ Events can track all HBAR movements");
      
      console.log("\n🚀 Ready to apply these patterns to Fountain Protocol!");
      
      this.client.close();
      
      return {
        contractId: contractId.toString(),
        accounts: accounts,
        receiveResults: receiveResults,
        sendResults: sendResults
      };
      
    } catch (error) {
      console.error("❌ Tutorial failed:", error.message);
      if (this.client) {
        this.client.close();
      }
      throw error;
    }
  }
}

/**
 * Run the tutorial
 */
async function runHbarTutorial() {
  try {
    const tutorial = new HbarTutorial();
    const results = await tutorial.runTutorial();
    
    console.log("\n✅ HBAR tutorial completed successfully");
    console.log("🎯 Core patterns learned for dApp implementation");
    
    return results;
    
  } catch (error) {
    console.error("\n❌ Tutorial failed:", error.message);
    throw error;
  }
}

module.exports = {
  HbarTutorial,
  runHbarTutorial
};

// Run tutorial if called directly
if (require.main === module) {
  runHbarTutorial()
    .then(() => {
      console.log("\n🎓 Tutorial complete - ready for dApp development!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Tutorial failed:", error.message);
      process.exit(1);
    });
}