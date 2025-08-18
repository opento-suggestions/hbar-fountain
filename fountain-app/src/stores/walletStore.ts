import { create } from 'zustand';
import type { WalletInfo, WalletType, TransactionResult } from '../types/protocol';

interface WalletState extends WalletInfo {
  // Actions
  setConnected: (connected: boolean) => void;
  setWallet: (wallet: string | null) => void;
  setAccountId: (accountId: string | null) => void;
  setPublicKey: (publicKey: string | null) => void;
  reset: () => void;
  
  // Wallet operations
  connectWallet: (walletType: WalletType) => Promise<TransactionResult>;
  disconnectWallet: () => Promise<TransactionResult>;
  
  // Connection state
  isConnecting: boolean;
  setConnecting: (connecting: boolean) => void;
  
  // Error handling
  error: string | null;
  setError: (error: string | null) => void;
}

const initialState = {
  connected: false,
  wallet: null,
  accountId: null,
  publicKey: null,
  isConnecting: false,
  error: null,
};

export const useWalletStore = create<WalletState>((set, get) => ({
  ...initialState,
  
  // Basic setters
  setConnected: (connected) => set({ connected }),
  setWallet: (wallet) => set({ wallet }),
  setAccountId: (accountId) => set({ accountId }),
  setPublicKey: (publicKey) => set({ publicKey }),
  setConnecting: (isConnecting) => set({ isConnecting }),
  setError: (error) => set({ error }),
  
  reset: () => set(initialState),
  
  // Wallet connection logic
  connectWallet: async (walletType: WalletType): Promise<TransactionResult> => {
    const state = get();
    state.setConnecting(true);
    state.setError(null);
    
    try {
      // This will be implemented with actual wallet connectors
      // For now, we'll implement a basic structure
      
      switch (walletType) {
        case 'hashpack':
          return await connectHashPack(state);
        case 'blade':
          return await connectBlade(state);
        case 'test':
          return await connectTestMode(state);
        default:
          throw new Error('Unknown wallet type');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      state.setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      state.setConnecting(false);
    }
  },
  
  disconnectWallet: async (): Promise<TransactionResult> => {
    const state = get();
    try {
      // Perform wallet-specific disconnect logic here
      state.reset();
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Disconnect failed';
      state.setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  },
}));

// Wallet connection implementations
async function connectHashPack(state: WalletState): Promise<TransactionResult> {
  // Check if HashPack is available
  if (!(window as any).hashpack) {
    throw new Error('HashPack extension not found');
  }
  
  try {
    // This would use actual HashConnect integration
    // For now, return a mock success
    state.setConnected(true);
    state.setWallet('hashpack');
    state.setAccountId('0.0.123456'); // Mock account
    
    return { success: true };
  } catch (error) {
    throw new Error('Failed to connect to HashPack');
  }
}

async function connectBlade(state: WalletState): Promise<TransactionResult> {
  // Check if Blade is available
  if (!(window as any).bladeWallet) {
    throw new Error('Blade Wallet extension not found');
  }
  
  try {
    // This would use actual Blade Wallet integration
    state.setConnected(true);
    state.setWallet('blade');
    state.setAccountId('0.0.654321'); // Mock account
    
    return { success: true };
  } catch (error) {
    throw new Error('Failed to connect to Blade Wallet');
  }
}

async function connectTestMode(state: WalletState): Promise<TransactionResult> {
  const testAccounts = [
    '0.0.6599179', // TEST_USER_1
    '0.0.6599180', // TEST_USER_2
    '0.0.6599181', // TEST_USER_3
    '0.0.6599182', // TEST_USER_4
    '0.0.6599183', // TEST_USER_5
    '0.0.6599772'  // TEST_USER_6
  ];
  
  // Simulate connection delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const selectedAccount = testAccounts[Math.floor(Math.random() * testAccounts.length)];
  
  state.setConnected(true);
  state.setWallet('test');
  state.setAccountId(selectedAccount);
  
  return { 
    success: true, 
    receipt: { accountId: selectedAccount, mode: 'test' }
  };
}