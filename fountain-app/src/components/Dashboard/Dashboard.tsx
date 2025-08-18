import { useProtocolStore } from '../../stores/protocolStore';
import { useWalletStore } from '../../stores/walletStore';
import MembershipCard from './MembershipCard';
import WishTokensCard from './WishTokensCard';
import DonationCard from './DonationCard';
import ActivityCard from './ActivityCard';
import InvestmentCalculator from './InvestmentCalculator';
import { formatAccountId, formatHbarWithSymbol } from '../../utils/formatters';

const Dashboard: React.FC = () => {
  const { accountId } = useWalletStore();
  const { userBalance, isLoading, isRefreshing } = useProtocolStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-600">Loading your protocol dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Dashboard Header */}
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold fountain-gradient-text">
          Your Protocol Dashboard
        </h2>
        <div className="flex items-center justify-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <span className="text-slate-600">Account:</span>
            <span className="font-mono bg-slate-100 px-2 py-1 rounded">
              {formatAccountId(accountId || '')}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-slate-600">HBAR Balance:</span>
            <span className="font-semibold text-green-600">
              {userBalance ? formatHbarWithSymbol(userBalance.hbar) : 'Loading...'}
            </span>
          </div>
          {isRefreshing && (
            <div className="flex items-center space-x-2 text-blue-600">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Refreshing...</span>
            </div>
          )}
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <MembershipCard />
          <WishTokensCard />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <DonationCard />
          <ActivityCard />
        </div>
      </div>

      {/* Investment Calculator */}
      <InvestmentCalculator />
    </div>
  );
};

export default Dashboard;