require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-waffle");
require("dotenv").config();

/**
 * Hardhat Configuration for Hedera Testnet Deployment
 * Following official Hedera documentation
 */

// Hedera Testnet configuration
const HEDERA_TESTNET_RPC_URL = "https://testnet.hashio.io/api";
const HEDERA_TESTNET_CHAIN_ID = 296;

// Extract the actual private key from Hedera DER format
const HEDERA_PRIVATE_KEY = process.env.OPERATOR_PRIVATE_KEY;

if (!HEDERA_PRIVATE_KEY) {
  throw new Error("Please set OPERATOR_PRIVATE_KEY in your .env file");
}

// Extract the 32-byte private key from the DER-encoded format
// Hedera keys are DER-encoded, we need the last 32 bytes
function extractPrivateKey(derEncodedKey) {
  if (derEncodedKey.length === 96) {
    // Extract last 32 bytes (64 hex characters) from DER format
    const rawKey = derEncodedKey.slice(-64);
    return "0x" + rawKey;
  } else if (derEncodedKey.startsWith("0x")) {
    return derEncodedKey;
  } else {
    // Assume it's already the raw key
    return "0x" + derEncodedKey;
  }
}

const PRIVATE_KEY = extractPrivateKey(HEDERA_PRIVATE_KEY);

console.log("🔑 Private key extracted for Ethereum compatibility");
console.log(`   Original length: ${HEDERA_PRIVATE_KEY.length} characters`);
console.log(`   Extracted length: ${PRIVATE_KEY.length} characters`);

module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      // Local development network
    },
    testnet: {
      url: HEDERA_TESTNET_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: HEDERA_TESTNET_CHAIN_ID,
      gas: 3000000,
      gasPrice: 234000000000, // 234 Gwei
      timeout: 60000
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 60000
  }
};