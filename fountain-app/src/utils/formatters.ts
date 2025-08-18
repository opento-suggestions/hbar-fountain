import { FOUNTAIN_CONFIG } from '../config/constants';

// Format HBAR amounts from tinybars
export const formatHbar = (tinybars: number | string): string => {
  const amount = typeof tinybars === 'string' ? parseInt(tinybars) : tinybars;
  const hbar = amount / 100000000;
  return hbar.toFixed(hbar < 1 ? 8 : 2);
};

// Format HBAR with symbol
export const formatHbarWithSymbol = (tinybars: number | string): string => {
  return `${formatHbar(tinybars)} ℏ [HBAR]`;
};

// Format token amounts
export const formatTokens = (amount: number, decimals = 0): string => {
  if (decimals === 0) return amount.toString();
  return (amount / Math.pow(10, decimals)).toFixed(decimals);
};

// Format token amounts with emoji symbols
export const formatDripTokens = (amount: number): string => {
  return `${amount} 💦 DRIP`;
};

export const formatWishTokens = (amount: number): string => {
  return `${amount} ✨ WISH`;
};

export const formatDropTokens = (amount: number): string => {
  return `${amount} 💧 DROP`;
};

// Calculate days until AutoRedeem
export const calculateDaysUntilAutoRedeem = (currentWish: number, dailyRate: number): number => {
  if (currentWish >= FOUNTAIN_CONFIG.ECONOMICS.WISH_QUOTA) return 0;
  if (dailyRate <= 0) return Infinity;
  return Math.ceil((FOUNTAIN_CONFIG.ECONOMICS.WISH_QUOTA - currentWish) / dailyRate);
};

// Calculate WISH quota percentage
export const calculateQuotaPercentage = (currentWish: number, quota = FOUNTAIN_CONFIG.ECONOMICS.WISH_QUOTA): number => {
  return Math.min((currentWish / quota) * 100, 100);
};

// Format account ID for display
export const formatAccountId = (accountId: string): string => {
  if (!accountId) return '';
  return accountId.length > 12 ? 
    `${accountId.substr(0, 8)}...${accountId.substr(-4)}` : 
    accountId;
};

// Format timestamp to readable date
export const formatTimestamp = (timestamp: number | string): string => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

// Format time ago (relative time)
export const formatTimeAgo = (timestamp: number | string): string => {
  const now = Date.now();
  const time = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;
  const diff = now - time;
  
  const minute = 60 * 1000;
  const hour = minute * 60;
  const day = hour * 24;
  
  if (diff < minute) return 'just now';
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  return `${Math.floor(diff / day)}d ago`;
};

// Generate transaction explorer URL
export const getTransactionUrl = (transactionId: string): string => {
  return `https://hashscan.io/testnet/transaction/${transactionId}`;
};

// Generate account explorer URL
export const getAccountUrl = (accountId: string): string => {
  return `https://hashscan.io/testnet/account/${accountId}`;
};

// Format profit display
export const formatProfitDisplay = (): string => {
  const profit = formatHbarWithSymbol(FOUNTAIN_CONFIG.ECONOMICS.PROFIT_AMOUNT);
  return `${profit} profit per cycle`;
};

// Format investment ROI
export const formatROI = (): string => {
  const investment = FOUNTAIN_CONFIG.ECONOMICS.MEMBERSHIP_COST;
  const profit = FOUNTAIN_CONFIG.ECONOMICS.PROFIT_AMOUNT;
  const roi = (profit / investment) * 100;
  return `${roi}% ROI`;
};

// Format cycle duration estimate
export const formatCycleDuration = (dailyWishRate: number): string => {
  const days = calculateDaysUntilAutoRedeem(0, dailyWishRate);
  if (days === Infinity) return 'N/A';
  return `${days} days`;
};

// Format large numbers with commas
export const formatNumber = (num: number): string => {
  return num.toLocaleString();
};