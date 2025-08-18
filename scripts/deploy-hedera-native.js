/**
 * Deploy Smart Contract Using Hedera SDK
 * Direct deployment to Hedera using native Hedera tools
 */

const {
  Client,
  ContractCreateTransaction,
  ContractCallQuery,
  ContractExecuteTransaction,
  FileCreateTransaction,
  FileAppendTransaction,
  Hbar,
  AccountId,
  PrivateKey,
  ContractId
} = require("@hashgraph/sdk");

const fs = require("fs");
const path = require("path");
const { CONFIG } = require("../config");

/**
 * Hedera Native Smart Contract Deployer
 */
class HederaNativeDeployer {
  constructor() {
    this.client = null;
    this.operatorId = AccountId.fromString(CONFIG.accounts.treasury);
    this.operatorKey = PrivateKey.fromString(CONFIG.accounts.treasuryKey);
    this.contractId = null;
    this.fileId = null;
  }

  /**
   * Initialize Hedera client
   */
  async initialize() {
    console.log("🌐 Initializing Hedera Testnet client...");
    
    this.client = Client.forTestnet();
    this.client.setOperator(this.operatorId, this.operatorKey);
    this.client.setDefaultMaxTransactionFee(new Hbar(100));
    this.client.setDefaultMaxQueryPayment(new Hbar(50));
    
    console.log(`📡 Connected to Hedera Testnet`);
    console.log(`👤 Operator Account: ${this.operatorId}`);
    console.log(`📍 Ethereum Address: 0x${this.operatorId.toSolidityAddress()}`);
  }

  /**
   * Get compiled contract bytecode from Hardhat artifacts
   */
  getCompiledBytecode() {
    console.log("📁 Reading compiled contract bytecode...");
    
    const artifactPath = path.join(__dirname, "../artifacts/contracts/FountainProtocol.sol/FountainProtocol.json");
    
    if (!fs.existsSync(artifactPath)) {
      throw new Error("Contract not compiled. Run 'npx hardhat compile' first.");
    }
    
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const bytecode = artifact.bytecode;
    
    if (!bytecode || bytecode === "0x") {
      throw new Error("No bytecode found in compiled artifact");
    }
    
    console.log(`   ✅ Bytecode loaded: ${bytecode.length} characters`);
    console.log(`   🔧 Contract: ${artifact.contractName}`);
    console.log(`   📝 Solidity: ${artifact.metadata ? JSON.parse(artifact.metadata).compiler.version : 'Unknown'}`);
    
    return {
      bytecode: bytecode.startsWith('0x') ? bytecode.slice(2) : bytecode,
      abi: artifact.abi,
      metadata: artifact.metadata
    };
  }

  /**
   * Upload contract bytecode to Hedera File Service
   */
  async uploadBytecode(bytecode) {
    console.log("📤 Uploading bytecode to Hedera File Service...");
    
    const bytecodeBuffer = Buffer.from(bytecode, 'hex');
    console.log(`   📦 Bytecode size: ${bytecodeBuffer.length} bytes`);
    
    // Create file with first chunk (max ~4KB)
    const maxChunkSize = 4096;
    const firstChunk = bytecodeBuffer.slice(0, maxChunkSize);
    
    const fileCreateTx = new FileCreateTransaction()
      .setContents(firstChunk)
      .setKeys([this.operatorKey.publicKey])
      .setMaxTransactionFee(new Hbar(5));
    
    const fileCreateSubmit = await fileCreateTx.execute(this.client);
    const fileCreateReceipt = await fileCreateSubmit.getReceipt(this.client);
    const fileId = fileCreateReceipt.fileId;
    
    console.log(`   📁 File created: ${fileId}`);
    
    // Append remaining chunks if needed
    if (bytecodeBuffer.length > maxChunkSize) {
      console.log("   📤 Appending remaining bytecode chunks...");
      
      let offset = maxChunkSize;
      while (offset < bytecodeBuffer.length) {
        const chunk = bytecodeBuffer.slice(offset, offset + maxChunkSize);
        
        const fileAppendTx = new FileAppendTransaction()
          .setFileId(fileId)
          .setContents(chunk)
          .setMaxTransactionFee(new Hbar(5));
        
        await fileAppendTx.execute(this.client);
        offset += maxChunkSize;
        
        console.log(`   📦 Appended chunk: ${chunk.length} bytes`);
      }
      
      console.log("   ✅ All bytecode chunks uploaded");
    }
    
    this.fileId = fileId;
    return fileId;
  }

  /**
   * Deploy the smart contract
   */
  async deployContract(fileId) {
    console.log("🚀 Deploying smart contract...");
    console.log(`   📁 Bytecode File: ${fileId}`);
    console.log(`   🏦 Treasury Parameter: ${this.operatorId}`);
    
    // Create contract deployment transaction
    const contractCreateTx = new ContractCreateTransaction()
      .setBytecodeFileId(fileId)
      .setGas(3000000) // 3M gas
      .setConstructorParameters(
        // Treasury address as constructor parameter
        Buffer.from(this.operatorId.toSolidityAddress(), 'hex')
      )
      .setInitialBalance(new Hbar(1)) // Give contract 1 HBAR initial balance
      .setMaxTransactionFee(new Hbar(20));
    
    console.log("   📤 Submitting deployment transaction...");
    
    const contractCreateSubmit = await contractCreateTx.execute(this.client);
    const contractCreateReceipt = await contractCreateSubmit.getReceipt(this.client);
    
    this.contractId = contractCreateReceipt.contractId;
    
    console.log(`   ✅ Contract deployed successfully!`);
    console.log(`   📄 Contract ID: ${this.contractId}`);
    console.log(`   📍 Contract Address: 0x${this.contractId.toSolidityAddress()}`);
    console.log(`   🧾 Deploy Transaction: ${contractCreateSubmit.transactionId}`);
    
    return {
      contractId: this.contractId,
      contractAddress: this.contractId.toSolidityAddress(),
      transactionId: contractCreateSubmit.transactionId.toString()
    };
  }

  /**
   * Test contract functionality
   */
  async testContract() {
    console.log("🧪 Testing contract functionality...");
    
    try {
      // Test a simple view function
      const query = new ContractCallQuery()
        .setContractId(this.contractId)
        .setFunction("getContractStats")
        .setGas(100000);
      
      const queryResult = await query.execute(this.client);
      console.log(`   ✅ Contract query successful`);
      console.log(`   📊 Query result: ${queryResult.bytes.length} bytes returned`);
      
      return { success: true };
      
    } catch (error) {
      console.log(`   ⚠️  Contract test warning: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Run complete deployment process
   */
  async deploy() {
    console.log("🚀 HEDERA NATIVE SMART CONTRACT DEPLOYMENT");
    console.log("═".repeat(80));
    console.log("🎯 Deploying Fountain Protocol using Hedera SDK");
    console.log("═".repeat(80));
    
    try {
      // Step 1: Initialize
      await this.initialize();
      
      // Step 2: Get compiled bytecode
      const compiled = this.getCompiledBytecode();
      
      // Step 3: Upload bytecode
      const fileId = await this.uploadBytecode(compiled.bytecode);
      
      // Step 4: Deploy contract
      const deployment = await this.deployContract(fileId);
      
      // Step 5: Test contract
      const testResult = await this.testContract();
      
      console.log("\n🎉 DEPLOYMENT SUCCESSFUL!");
      console.log("═".repeat(80));
      
      const deploymentInfo = {
        contractId: deployment.contractId.toString(),
        contractAddress: `0x${deployment.contractAddress}`,
        ethereumAddress: `0x${this.contractId.toSolidityAddress()}`,
        fileId: fileId.toString(),
        deployTransaction: deployment.transactionId,
        network: "Hedera Testnet",
        timestamp: new Date().toISOString(),
        operator: this.operatorId.toString(),
        testResult: testResult
      };
      
      console.log("📋 Deployment Information:");
      console.log(`   📄 Contract ID: ${deploymentInfo.contractId}`);
      console.log(`   📍 Contract Address: ${deploymentInfo.contractAddress}`);
      console.log(`   📁 Bytecode File: ${deploymentInfo.fileId}`);
      console.log(`   🧾 Transaction: ${deploymentInfo.deployTransaction}`);
      console.log(`   🧪 Test Result: ${testResult.success ? 'Passed' : 'Warning'}`);
      
      console.log("\n🎮 User Interaction:");
      console.log("   Users can now interact directly with the contract:");
      console.log(`   • Send 1 HBAR to createMembership() at ${deploymentInfo.contractAddress}`);
      console.log(`   • Call claimWish(amount) to claim WISH rewards`);
      console.log(`   • Call redeemDrip() for HBAR refund`);
      
      console.log("\n🔗 Verification:");
      console.log(`   📊 HashScan: https://hashscan.io/testnet/contract/${deploymentInfo.contractAddress}`);
      console.log(`   🌐 Mirror Node: https://testnet.mirrornode.hedera.com/api/v1/contracts/${deploymentInfo.contractId}`);
      
      console.log("\n🌊 FOUNTAIN PROTOCOL IS LIVE!");
      console.log("No web app or server infrastructure required!");
      console.log("═".repeat(80));
      
      this.client.close();
      
      return deploymentInfo;
      
    } catch (error) {
      console.error("❌ Deployment failed:", error.message);
      if (this.client) {
        this.client.close();
      }
      throw error;
    }
  }
}

/**
 * Deploy using Hedera native tools
 */
async function deployWithHedera() {
  try {
    const deployer = new HederaNativeDeployer();
    const result = await deployer.deploy();
    
    console.log("\n✅ Hedera native deployment completed successfully");
    return result;
    
  } catch (error) {
    console.error("\n❌ Hedera native deployment failed:", error.message);
    throw error;
  }
}

module.exports = {
  HederaNativeDeployer,
  deployWithHedera
};

// Run deployment if called directly
if (require.main === module) {
  deployWithHedera()
    .then((result) => {
      console.log("\n🎯 Deployment complete!");
      console.log(`📄 Contract ID: ${result.contractId}`);
      console.log(`📍 Address: ${result.contractAddress}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Deployment failed:", error.message);
      process.exit(1);
    });
}