// Fountain Protocol Configuration
export const FOUNTAIN_CONFIG = {
  // Network Configuration
  NETWORK: 'testnet' as const,
  
  // Token IDs (from production deployment)
  TOKENS: {
    DRIP: '0.0.6591211',
    WISH: '0.0.6590974', 
    DROP: '0.0.6590982'
  },
  
  // Smart Contract ID
  CONTRACT_ID: '0.0.6600522',
  
  // Treasury Account
  TREASURY_ACCOUNT: '0.0.6552092',
  
  // HCS Topic for protocol events
  HCS_TOPIC: '0.0.6591043',
  
  // Protocol Economics
  ECONOMICS: {
    MEMBERSHIP_COST: 100000000, // 1 HBAR in tinybars
    AUTOREDEEM_PAYOUT: 180000000, // 1.8 HBAR in tinybars
    PROFIT_AMOUNT: 80000000, // 0.8 HBAR profit in tinybars
    WISH_BURN_AMOUNT: 1000,
    DAILY_WISH_BASE: 50,
    DAILY_WISH_BONUS: 25, // Additional for DROP holders
    WISH_QUOTA: 1000,
    DROP_RECOGNITION_THRESHOLD: 1 // 1 DROP token
  },
  
  // Mirror Node API
  MIRROR_NODE: {
    BASE_URL: 'https://testnet.mirrornode.hedera.com/api/v1',
    ENDPOINTS: {
      ACCOUNT_BALANCE: '/accounts/{accountId}/tokens',
      ACCOUNT_INFO: '/accounts/{accountId}',
      TOPIC_MESSAGES: '/topics/{topicId}/messages',
      TRANSACTIONS: '/transactions',
      TOKEN_BALANCES: '/tokens/{tokenId}/balances'
    }
  },
  
  // Wallet Configuration
  WALLETS: {
    HASHPACK: {
      name: 'HashPack',
      icon: '📱',
      enabled: true
    },
    BLADE: {
      name: 'Blade Wallet', 
      icon: '⚔️',
      enabled: true
    },
    TEST: {
      name: 'Test Mode',
      icon: '🧪',
      enabled: true
    }
  },
  
  // Test Accounts for Test Mode
  TEST_ACCOUNTS: [
    '0.0.6599179', // TEST_USER_1
    '0.0.6599180', // TEST_USER_2
    '0.0.6599181', // TEST_USER_3
    '0.0.6599182', // TEST_USER_4
    '0.0.6599183', // TEST_USER_5
    '0.0.6599772'  // TEST_USER_6
  ],
  
  // UI Configuration
  UI: {
    UPDATE_INTERVAL: 30000, // 30 seconds
    TRANSACTION_TIMEOUT: 300000, // 5 minutes
    ANIMATION_DURATION: 300,
    MAX_ACTIVITY_ITEMS: 10,
    POLLING_INTERVAL: 5000 // 5 seconds for real-time updates
  }
} as const;

// Protocol Messages
export const MESSAGES = {
  WELCOME: 'Welcome to Fountain Protocol!',
  WALLET_CONNECTING: 'Connecting to wallet...',
  WALLET_CONNECTED: 'Wallet connected successfully',
  WALLET_DISCONNECTED: 'Wallet disconnected',
  TRANSACTION_PENDING: 'Transaction submitted to Hedera network',
  TRANSACTION_SUCCESS: 'Transaction completed successfully',
  TRANSACTION_FAILED: 'Transaction failed',
  INSUFFICIENT_BALANCE: 'Insufficient HBAR balance',
  INSUFFICIENT_WISH: 'Need 1000 WISH tokens for AutoRedeem',
  NOT_MEMBER: 'Must be a protocol member to perform this action',
  LOADING: 'Loading...',
  INVESTMENT_OPPORTUNITY: 'Invest 1 ℏ HBAR → Earn 1.8 ℏ HBAR (0.8 ℏ profit)',
  AUTOREDEEM_READY: 'AutoRedeem available - claim your 1.8 ℏ HBAR!'
} as const;

// Error Messages
export const ERRORS = {
  WALLET_NOT_FOUND: 'Wallet not found. Please install the wallet extension.',
  WALLET_LOCKED: 'Wallet is locked. Please unlock it.',
  NETWORK_MISMATCH: 'Please switch to Hedera Testnet',
  TRANSACTION_REJECTED: 'Transaction was rejected by user',
  INSUFFICIENT_FUNDS: 'Insufficient funds for transaction',
  UNKNOWN_ERROR: 'An unknown error occurred',
  PROTOCOL_UNAVAILABLE: 'Protocol services temporarily unavailable'
} as const;

// Member Lifecycle States
export const MEMBER_STATES = {
  NOT_MEMBER: 'NOT_MEMBER',
  ACTIVE_CLAIMING: 'ACTIVE_CLAIMING', 
  CAP_REACHED_REDEEMABLE: 'CAP_REACHED_REDEEMABLE',
  LIFECYCLE_COMPLETED: 'LIFECYCLE_COMPLETED'
} as const;

export type MemberState = keyof typeof MEMBER_STATES;