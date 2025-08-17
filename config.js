/**
 * Fountain Protocol Configuration
 * Centralized configuration for native HTS/HCS implementation
 */

// Environment-specific configuration
const ENVIRONMENT = process.env.NODE_ENV || 'testnet';

const CONFIG = {
  // Network Configuration
  network: {
    testnet: {
      name: 'testnet',
      client: 'testnet',
      mirrorNode: 'https://testnet.mirrornode.hedera.com',
      explorer: 'https://hashscan.io/testnet'
    },
    mainnet: {
      name: 'mainnet', 
      client: 'mainnet',
      mirrorNode: 'https://mainnet.mirrornode.hedera.com',
      explorer: 'https://hashscan.io/mainnet'
    }
  },

  // Protocol Accounts (from paste.txt working implementation)
  accounts: {
    treasury: process.env.TREASURY_ACCOUNT_ID || '0.0.6552092',
    treasuryKey: process.env.TREASURY_PRIVATE_KEY,
    operator: process.env.OPERATOR_ACCOUNT_ID || '0.0.6552092',
    operatorKey: process.env.OPERATOR_PRIVATE_KEY
  },

  // HTS Token Configuration (from paste.txt)
  tokens: {
    DRIP: {
      id: process.env.DRIP_TOKEN_ID || '0.0.6591211',
      name: 'Fountain DRIP',
      symbol: 'DRIP',
      decimals: 0,
      purpose: 'Membership token - non-transferable',
      maxSupply: 1000000,
      defaultFreeze: true
    },
    WISH: {
      id: process.env.WISH_TOKEN_ID || '0.0.6590974', 
      name: 'Fountain WISH',
      symbol: 'WISH',
      decimals: 0,
      purpose: 'Utility/reward token - redeemable',
      maxSupply: 100000000,
      defaultFreeze: false
    },
    DROP: {
      id: process.env.DROP_TOKEN_ID || '0.0.6590982',
      name: 'Fountain DROP', 
      symbol: 'DROP',
      decimals: 8,
      purpose: 'Donor recognition badge',
      maxSupply: 1000000000000000,
      defaultFreeze: false
    }
  },

  // Infrastructure (from paste.txt)
  infrastructure: {
    hcsTopic: process.env.HCS_TOPIC_ID || '0.0.6591043',
    database: {
      type: process.env.DB_TYPE || 'sqlite',
      url: process.env.DATABASE_URL || './fountain-protocol.db',
      options: {
        logging: process.env.NODE_ENV === 'development'
      }
    }
  },

  // Protocol Parameters (exact from project_knowledge.json)
  parameters: {
    // Core Economics
    membershipDeposit: 100000000,     // 1 HBAR in tinybars
    baseDailyWish: 50,                // Base daily entitlement
    maxWishPerDrip: 1000,             // Lifetime quota per DRIP
    wishToHbarRate: 0.001,            // 1 WISH = 0.001 HBAR
    
    // AutoRelease Split (from project_knowledge.json)
    treasuryFee: 0.2,                 // 0.2 HBAR fee on lifecycle end
    memberRefund: 0.8,                // 0.8 HBAR refund to member
    
    // Donation Parameters
    minDonationThreshold: 1000000,    // 0.01 HBAR minimum for DROP
    donationRebateThreshold: 100000000, // 1 HBAR for rebate eligibility
    donationRebateRate: 10,           // ~1% rebate (10 WISH per HBAR)
    
    // Daily Mechanics (from project_knowledge.json formulas)
    booster: {
      formula: 'min(floor(50 * ((Dt/Nt) - 1)), 25)',
      maxBooster: 25,
      multiplier: 50
    },
    growth: {
      formula: 'min(1 + C, 1.5)',
      threshold: 0.02,              // 2% growth threshold
      increment: 0.1,               // C += 0.1 on qualifying growth
      decayRate: 0.05,              // Optional: C -= 0.05 on quiet days
      maxMultiplier: 1.5
    },
    
    // Operational
    snapshotTime: '00:00',            // UTC 00:00 daily snapshots
    maxClaimDays: 90,                 // Gas optimization equivalent
    maxRedemptionAmount: 1000         // 1-1000 WISH per redemption
  },

  // Security Configuration
  security: {
    // Validation Requirements
    requireDripForClaim: true,
    requireDripForRedemption: true,
    enforceLifetimeCaps: true,
    validateMembershipUniqueness: true,
    
    // Transaction Limits
    maxTransactionRetries: 3,
    transactionTimeout: 30000,        // 30 seconds
    
    // Database Security
    encryptSensitiveData: true,
    auditTrail: true,
    backupInterval: 86400000,         // 24 hours
    
    // Rate Limiting
    claimCooldown: 3600000,           // 1 hour between claims
    redemptionCooldown: 300000        // 5 minutes between redemptions
  },

  // Monitoring & Alerting
  monitoring: {
    logLevel: process.env.LOG_LEVEL || 'info',
    enableMetrics: true,
    healthCheckInterval: 300000,      // 5 minutes
    
    alerts: {
      treasuryLowBalance: 1000000000, // Alert when treasury < 10 HBAR
      dailySnapshotMissed: 7200000,   // Alert if snapshot > 2h late
      redemptionFailures: 5,          // Alert after 5 consecutive failures
      databaseErrors: 3               // Alert after 3 DB errors
    },
    
    metrics: [
      'total_drip_holders',
      'total_wish_supply', 
      'daily_redemptions',
      'treasury_balance',
      'lifetime_caps_reached',
      'average_claim_size',
      'burn_rate'
    ]
  },

  // Mathematical Constants (from project_knowledge.json)
  constants: {
    HBAR_TO_TINYBAR: 100000000,
    WISH_PEG_TINYBAR: 100000,         // 0.001 HBAR
    SECONDS_PER_DAY: 86400,
    MAX_UINT16: 65535,
    MAX_DAILY_ENTITLEMENT: 112        // (50 + 25) * 1.5 theoretical max
  },

  // Feature Flags
  features: {
    enableDonations: process.env.ENABLE_DONATIONS !== 'false',
    enableAutoRelease: process.env.ENABLE_AUTO_RELEASE !== 'false',
    enableGrowthMultiplier: process.env.ENABLE_GROWTH_MULTIPLIER !== 'false',
    enableDonorBooster: process.env.ENABLE_DONOR_BOOSTER !== 'false',
    enableDecay: process.env.ENABLE_DECAY === 'true', // Optional decay off by default
    
    // Development Features
    enableTestMode: process.env.NODE_ENV === 'development',
    skipSignatureValidation: process.env.SKIP_SIG_VALIDATION === 'true',
    allowManualSnapshots: process.env.ALLOW_MANUAL_SNAPSHOTS === 'true'
  }
};

// Environment-specific overrides
const currentNetwork = CONFIG.network[ENVIRONMENT];
if (!currentNetwork) {
  throw new Error(`Unknown environment: ${ENVIRONMENT}`);
}

// Validation
function validateConfig() {
  const required = [
    'accounts.treasury',
    'accounts.treasuryKey', 
    'tokens.DRIP.id',
    'tokens.WISH.id',
    'tokens.DROP.id',
    'infrastructure.hcsTopic'
  ];
  
  for (const path of required) {
    const value = path.split('.').reduce((obj, key) => obj?.[key], CONFIG);
    if (!value) {
      throw new Error(`Missing required configuration: ${path}`);
    }
  }
  
  // Validate mathematical consistency
  if (CONFIG.parameters.treasuryFee + CONFIG.parameters.memberRefund !== 1.0) {
    throw new Error('Treasury fee + member refund must equal 1.0');
  }
  
  if (CONFIG.parameters.maxWishPerDrip <= 0) {
    throw new Error('Max WISH per DRIP must be positive');
  }
  
  console.log(`✅ Configuration validated for ${ENVIRONMENT} environment`);
}

// Helper functions
const getNetworkConfig = () => currentNetwork;
const isTestnet = () => ENVIRONMENT === 'testnet';
const isMainnet = () => ENVIRONMENT === 'mainnet';
const isDevelopment = () => process.env.NODE_ENV === 'development';

// Export configuration
module.exports = {
  CONFIG,
  validateConfig,
  getNetworkConfig,
  isTestnet,
  isMainnet,
  isDevelopment,
  ENVIRONMENT
};

// Auto-validate on import
validateConfig();