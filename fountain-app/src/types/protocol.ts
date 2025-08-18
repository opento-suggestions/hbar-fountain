// Core Protocol Types

export interface TokenBalance {
  drip: number;
  wish: number;
  drop: number;
}

export interface UserBalance {
  accountId: string;
  hbar: number;
  tokens: TokenBalance;
  lastUpdated: number;
}

export interface MembershipStatus {
  isActive: boolean;
  dripBalance: number;
  dailyWishRate: number;
}

export interface DonationStatus {
  isRecognized: boolean;
  dropBalance: number;
  wishBonus: number;
}

export interface WishStatus {
  balance: number;
  quota: number;
  quotaUsed: number;
  quotaRemaining: number;
  canAutoRedeem: boolean;
  daysUntilAutoRedeem: number;
}

export interface ProtocolStatus {
  accountId: string;
  membership: MembershipStatus;
  donation: DonationStatus;
  wish: WishStatus;
  hbar: {
    balance: number;
    formatted: string;
  };
  lastUpdated: number;
}

export interface ProtocolStats {
  totalMembers: number;
  totalHbar: number;
  totalWish: number;
  lastSnapshot: string;
  lastUpdated: number;
}

export interface ActivityItem {
  icon: string;
  action: string;
  details: string;
  timestamp: number;
  accountId?: string;
  transactionId?: string;
}

export interface Transaction {
  type: 'JOIN_PROTOCOL' | 'AUTO_REDEEM' | 'DONATION' | 'CLAIM_WISH';
  amount?: number;
  wishBurn?: number;
  hbarPayout?: number;
  memo: string;
}

export interface TransactionResult {
  success: boolean;
  transactionId?: string;
  receipt?: any;
  error?: string;
}

export interface WalletInfo {
  connected: boolean;
  wallet: string | null;
  accountId: string | null;
  publicKey?: string | null;
}

// HCS Event Types
export interface HCSEvent {
  type: string;
  event: string;
  timestamp: string;
  details: string;
  consensusTimestamp: string;
  memberName?: string;
  accountId?: string;
}

// Member Lifecycle States
export type MemberLifecycleState = 
  | 'NOT_MEMBER' 
  | 'ACTIVE_CLAIMING' 
  | 'CAP_REACHED_REDEEMABLE' 
  | 'LIFECYCLE_COMPLETED';

export interface MemberLifecycle {
  state: MemberLifecycleState;
  joinedAt?: string;
  dripBalance: number;
  totalWishClaimed: number;
  autoRedeemAvailable: boolean;
  cycleCount: number;
}

// Investment Calculation Types
export interface InvestmentCalculation {
  investment: number; // HBAR invested
  currentValue: number; // Current WISH value
  projectedReturn: number; // 1.8 HBAR
  profit: number; // 0.8 HBAR
  roi: number; // 80%
  daysRemaining: number;
  dailyRate: number;
}

// Protocol Configuration Types
export interface ProtocolConfig {
  network: 'testnet' | 'mainnet';
  tokens: {
    DRIP: string;
    WISH: string;
    DROP: string;
  };
  contractId: string;
  treasuryAccount: string;
  hcsTopic: string;
  economics: {
    membershipCost: number;
    autoredeemPayout: number;
    profitAmount: number;
    wishBurnAmount: number;
    dailyWishBase: number;
    dailyWishBonus: number;
    wishQuota: number;
  };
}

// UI State Types
export interface UIState {
  isLoading: boolean;
  error: string | null;
  showWalletModal: boolean;
  showTransactionModal: boolean;
  transactionStatus: 'idle' | 'pending' | 'success' | 'error';
}

// Wallet Connection Types
export type WalletType = 'hashpack' | 'blade' | 'test';

export interface WalletConnector {
  connect(): Promise<TransactionResult>;
  disconnect(): Promise<TransactionResult>;
  executeTransaction(transaction: Transaction): Promise<TransactionResult>;
  getStatus(): WalletInfo;
}