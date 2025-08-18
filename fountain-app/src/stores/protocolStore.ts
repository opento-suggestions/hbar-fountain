import { create } from 'zustand';
import type { 
  ProtocolStatus, 
  ProtocolStats, 
  ActivityItem, 
  MemberLifecycleState,
  InvestmentCalculation,
  UserBalance 
} from '../types/protocol';
import { FOUNTAIN_CONFIG } from '../config/constants';

interface ProtocolState {
  // User protocol status
  protocolStatus: ProtocolStatus | null;
  userBalance: UserBalance | null;
  memberLifecycleState: MemberLifecycleState;
  investmentCalculation: InvestmentCalculation | null;
  
  // Protocol statistics
  protocolStats: ProtocolStats | null;
  
  // Activity feed
  activities: ActivityItem[];
  
  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  
  // Error handling
  error: string | null;
  
  // Actions
  setProtocolStatus: (status: ProtocolStatus | null) => void;
  setUserBalance: (balance: UserBalance | null) => void;
  setProtocolStats: (stats: ProtocolStats | null) => void;
  setActivities: (activities: ActivityItem[]) => void;
  addActivity: (activity: ActivityItem) => void;
  setLoading: (loading: boolean) => void;
  setRefreshing: (refreshing: boolean) => void;
  setError: (error: string | null) => void;
  
  // Data fetching
  refreshUserData: (accountId: string) => Promise<void>;
  refreshProtocolStats: () => Promise<void>;
  refreshAll: (accountId?: string) => Promise<void>;
  
  // Calculations
  updateInvestmentCalculation: () => void;
  updateMemberLifecycleState: () => void;
  
  // Reset
  reset: () => void;
}

const initialState = {
  protocolStatus: null,
  userBalance: null,
  memberLifecycleState: 'NOT_MEMBER' as MemberLifecycleState,
  investmentCalculation: null,
  protocolStats: null,
  activities: [],
  isLoading: false,
  isRefreshing: false,
  error: null,
};

export const useProtocolStore = create<ProtocolState>((set, get) => ({
  ...initialState,
  
  // Setters
  setProtocolStatus: (protocolStatus) => {
    set({ protocolStatus });
    get().updateInvestmentCalculation();
    get().updateMemberLifecycleState();
  },
  
  setUserBalance: (userBalance) => set({ userBalance }),
  setProtocolStats: (protocolStats) => set({ protocolStats }),
  setActivities: (activities) => set({ activities }),
  
  addActivity: (activity) => {
    const { activities } = get();
    const updatedActivities = [activity, ...activities].slice(0, FOUNTAIN_CONFIG.UI.MAX_ACTIVITY_ITEMS);
    set({ activities: updatedActivities });
  },
  
  setLoading: (isLoading) => set({ isLoading }),
  setRefreshing: (isRefreshing) => set({ isRefreshing }),
  setError: (error) => set({ error }),
  
  // Data fetching operations
  refreshUserData: async (accountId: string) => {
    const state = get();
    state.setRefreshing(true);
    state.setError(null);
    
    try {
      // This will be implemented with actual Mirror Node client
      // For now, we'll create mock data based on account
      const mockUserData = await fetchMockUserData(accountId);
      
      state.setUserBalance(mockUserData.balance);
      state.setProtocolStatus(mockUserData.status);
      
      // Add activity log
      state.addActivity({
        icon: '🔄',
        action: 'Data Refreshed',
        details: 'Updated user protocol status',
        timestamp: Date.now(),
        accountId
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh user data';
      state.setError(errorMessage);
    } finally {
      state.setRefreshing(false);
    }
  },
  
  refreshProtocolStats: async () => {
    const state = get();
    
    try {
      // Mock protocol stats - will be replaced with real Mirror Node queries
      const mockStats: ProtocolStats = {
        totalMembers: 6,
        totalHbar: 952.64,
        totalWish: 1250,
        lastSnapshot: new Date().toISOString(),
        lastUpdated: Date.now()
      };
      
      state.setProtocolStats(mockStats);
      
    } catch (error) {
      console.error('Failed to refresh protocol stats:', error);
    }
  },
  
  refreshAll: async (accountId?: string) => {
    const state = get();
    state.setLoading(true);
    
    try {
      await Promise.all([
        state.refreshProtocolStats(),
        accountId ? state.refreshUserData(accountId) : Promise.resolve()
      ]);
    } catch (error) {
      console.error('Failed to refresh all data:', error);
    } finally {
      state.setLoading(false);
    }
  },
  
  // Calculations
  updateInvestmentCalculation: () => {
    const { protocolStatus } = get();
    if (!protocolStatus) return;
    
    const calculation: InvestmentCalculation = {
      investment: FOUNTAIN_CONFIG.ECONOMICS.MEMBERSHIP_COST / 100000000, // Convert to HBAR
      currentValue: protocolStatus.wish.balance,
      projectedReturn: FOUNTAIN_CONFIG.ECONOMICS.AUTOREDEEM_PAYOUT / 100000000,
      profit: FOUNTAIN_CONFIG.ECONOMICS.PROFIT_AMOUNT / 100000000,
      roi: 80, // 80% ROI
      daysRemaining: protocolStatus.wish.daysUntilAutoRedeem,
      dailyRate: protocolStatus.membership.dailyWishRate
    };
    
    set({ investmentCalculation: calculation });
  },
  
  updateMemberLifecycleState: () => {
    const { protocolStatus } = get();
    if (!protocolStatus) {
      set({ memberLifecycleState: 'NOT_MEMBER' });
      return;
    }
    
    let state: MemberLifecycleState;
    
    if (!protocolStatus.membership.isActive) {
      state = 'NOT_MEMBER';
    } else if (protocolStatus.wish.canAutoRedeem) {
      state = 'CAP_REACHED_REDEEMABLE';
    } else {
      state = 'ACTIVE_CLAIMING';
    }
    
    set({ memberLifecycleState: state });
  },
  
  reset: () => set(initialState),
}));

// Mock data generation - will be replaced with real Mirror Node client
async function fetchMockUserData(accountId: string): Promise<{ balance: UserBalance; status: ProtocolStatus }> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Generate realistic test data based on account ID
  const accountNum = parseInt(accountId.split('.').pop() || '0');
  const isActiveMember = accountNum % 2 === 1; // Odd accounts are members
  const wishBalance = isActiveMember ? Math.floor(Math.random() * 1000) : 0;
  const dripBalance = isActiveMember ? 1 : 0;
  const dropBalance = accountNum % 3 === 0 ? 1 : 0; // Every 3rd account has DROP
  const hbarBalance = 500000000 + Math.floor(Math.random() * 1000000000); // 5-15 HBAR
  
  const dailyWishRate = FOUNTAIN_CONFIG.ECONOMICS.DAILY_WISH_BASE + 
    (dropBalance > 0 ? FOUNTAIN_CONFIG.ECONOMICS.DAILY_WISH_BONUS : 0);
  
  const balance: UserBalance = {
    accountId,
    hbar: hbarBalance,
    tokens: {
      drip: dripBalance,
      wish: wishBalance,
      drop: dropBalance
    },
    lastUpdated: Date.now()
  };
  
  const status: ProtocolStatus = {
    accountId,
    membership: {
      isActive: isActiveMember,
      dripBalance,
      dailyWishRate
    },
    donation: {
      isRecognized: dropBalance > 0,
      dropBalance,
      wishBonus: dropBalance > 0 ? FOUNTAIN_CONFIG.ECONOMICS.DAILY_WISH_BONUS : 0
    },
    wish: {
      balance: wishBalance,
      quota: FOUNTAIN_CONFIG.ECONOMICS.WISH_QUOTA,
      quotaUsed: Math.round((wishBalance / FOUNTAIN_CONFIG.ECONOMICS.WISH_QUOTA) * 100),
      quotaRemaining: Math.max(0, FOUNTAIN_CONFIG.ECONOMICS.WISH_QUOTA - wishBalance),
      canAutoRedeem: wishBalance >= FOUNTAIN_CONFIG.ECONOMICS.WISH_BURN_AMOUNT,
      daysUntilAutoRedeem: Math.ceil((FOUNTAIN_CONFIG.ECONOMICS.WISH_QUOTA - wishBalance) / dailyWishRate)
    },
    hbar: {
      balance: hbarBalance,
      formatted: (hbarBalance / 100000000).toFixed(2)
    },
    lastUpdated: Date.now()
  };
  
  return { balance, status };
}