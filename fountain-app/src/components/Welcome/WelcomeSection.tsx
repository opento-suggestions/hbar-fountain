import { useProtocolStore } from '../../stores/protocolStore';
import { formatNumber } from '../../utils/formatters';

interface WelcomeSectionProps {
  onConnectWallet: () => void;
}

const WelcomeSection: React.FC<WelcomeSectionProps> = ({ onConnectWallet }) => {
  const { protocolStats } = useProtocolStore();

  return (
    <div className="max-w-4xl mx-auto text-center space-y-12">
      {/* Hero Section */}
      <div className="space-y-6">
        <h2 className="text-4xl font-bold text-slate-900">
          Welcome to ⛲ Fountain Protocol
        </h2>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          A sustainable DeFi protocol built on Hedera Hashgraph featuring membership tokens (💦 $DRIP), 
          utility tokens (✨ $WISH), and donor recognition tokens (💧 $DROP).
        </p>

        {/* Investment Highlight */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-xl max-w-lg mx-auto">
          <div className="text-lg font-semibold mb-2">💰 Investment Opportunity</div>
          <div className="text-2xl font-bold">1 ℏ HBAR → 1.8 ℏ HBAR</div>
          <div className="text-blue-100 mt-1">0.8 ℏ HBAR profit per cycle (80% ROI)</div>
        </div>

        <button 
          onClick={onConnectWallet}
          className="fountain-button-primary text-lg px-8 py-4"
        >
          Connect Wallet to Start
        </button>
      </div>

      {/* Protocol Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="fountain-card p-6">
          <div className="text-3xl font-bold text-slate-900">
            {protocolStats?.totalMembers || 6}
          </div>
          <div className="text-slate-600 mt-1">Active Members</div>
        </div>
        
        <div className="fountain-card p-6">
          <div className="text-3xl font-bold text-slate-900">
            {protocolStats?.totalHbar || 952.64}
          </div>
          <div className="text-slate-600 mt-1">ℏ [HBAR] in Treasury</div>
        </div>
        
        <div className="fountain-card p-6">
          <div className="text-3xl font-bold text-slate-900">
            {formatNumber(protocolStats?.totalWish || 0)}
          </div>
          <div className="text-slate-600 mt-1">✨ WISH Tokens</div>
        </div>
      </div>

      {/* How It Works */}
      <div className="space-y-8">
        <h3 className="text-2xl font-bold text-slate-900">How It Works</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="fountain-card p-6 text-center">
            <div className="text-3xl mb-4">1</div>
            <h4 className="font-semibold text-lg mb-2">Join Protocol</h4>
            <p className="text-slate-600">
              Deposit 1 ℏ [HBAR] to receive 💦 DRIP membership token
            </p>
          </div>
          
          <div className="fountain-card p-6 text-center">
            <div className="text-3xl mb-4">2</div>
            <h4 className="font-semibold text-lg mb-2">Earn ✨ WISH</h4>
            <p className="text-slate-600">
              Receive 50 ✨ WISH tokens daily (75 with 💧 DROP bonus)
            </p>
          </div>
          
          <div className="fountain-card p-6 text-center">
            <div className="text-3xl mb-4">3</div>
            <h4 className="font-semibold text-lg mb-2">AutoRedeem</h4>
            <p className="text-slate-600">
              Burn 1000 ✨ WISH → Get 1.8 ℏ [HBAR] + new membership (0.8 ℏ [HBAR] profit)
            </p>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="bg-slate-50 rounded-xl p-8">
        <h3 className="text-xl font-semibold mb-6 text-slate-900">Protocol Features</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">🔒</div>
              <div>
                <div className="font-medium">Secure & Transparent</div>
                <div className="text-sm text-slate-600">All operations recorded on HCS Topic 0.0.6591043</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="text-2xl">💎</div>
              <div>
                <div className="font-medium">Real Profit Mechanics</div>
                <div className="text-sm text-slate-600">Guaranteed 80% ROI through treasury bonuses</div>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">⚡</div>
              <div>
                <div className="font-medium">Fast & Efficient</div>
                <div className="text-sm text-slate-600">Built on Hedera Hashgraph for speed and low costs</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="text-2xl">🧪</div>
              <div>
                <div className="font-medium">Test Mode Available</div>
                <div className="text-sm text-slate-600">Try the full protocol experience without wallet complexity</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeSection;