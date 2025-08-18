import { useProtocolStore } from '../../stores/protocolStore';
import { formatNumber, calculateQuotaPercentage } from '../../utils/formatters';

const WishTokensCard: React.FC = () => {
  const { protocolStatus } = useProtocolStore();

  const handleClaimWish = () => {
    // TODO: Implement WISH claiming transaction
    console.log('Claim WISH clicked');
  };

  if (!protocolStatus) {
    return (
      <div className="fountain-card p-6">
        <h3 className="text-xl font-semibold mb-4">✨ WISH Tokens</h3>
        <div className="text-center text-slate-500 py-8">
          Connect your wallet to view WISH token status
        </div>
      </div>
    );
  }

  const quotaPercentage = calculateQuotaPercentage(protocolStatus.wish.balance);
  const isClaimingAvailable = protocolStatus.membership.isActive && protocolStatus.wish.balance < protocolStatus.wish.quota;

  return (
    <div className="fountain-card p-6">
      <h3 className="text-xl font-semibold mb-4 flex items-center space-x-2">
        <span>✨ WISH Tokens</span>
      </h3>

      <div className="space-y-4">
        {/* Balance Display */}
        <div className="text-center">
          <div className="text-3xl font-bold text-slate-900 mb-1">
            {formatNumber(protocolStatus.wish.balance)}
          </div>
          <div className="text-slate-600">✨ WISH Tokens</div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="bg-slate-200 rounded-full h-3 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500 ease-out"
              style={{ width: `${quotaPercentage}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-sm text-slate-600">
            <span>{protocolStatus.wish.balance}/1000 quota used</span>
            <span>{quotaPercentage.toFixed(1)}%</span>
          </div>
        </div>

        {/* Details */}
        <div className="bg-slate-50 rounded-lg p-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-slate-600">Remaining Quota:</span>
            <span className="font-medium">
              {formatNumber(protocolStatus.wish.quotaRemaining)} ✨ WISH
            </span>
          </div>
          
          {protocolStatus.membership.isActive && (
            <div className="flex justify-between">
              <span className="text-slate-600">Daily Rate:</span>
              <span className="font-medium text-green-600">
                +{protocolStatus.membership.dailyWishRate} per day
              </span>
            </div>
          )}

          {protocolStatus.wish.daysUntilAutoRedeem > 0 && protocolStatus.wish.daysUntilAutoRedeem !== Infinity && (
            <div className="flex justify-between">
              <span className="text-slate-600">Days to AutoRedeem:</span>
              <span className="font-medium text-blue-600">
                {protocolStatus.wish.daysUntilAutoRedeem} days
              </span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-2">
          {protocolStatus.wish.canAutoRedeem ? (
            <div className="text-center">
              <div className="bg-gradient-to-r from-green-100 to-blue-100 border border-green-200 rounded-lg p-4 mb-4">
                <div className="text-green-800 font-semibold mb-1">🎉 AutoRedeem Ready!</div>
                <div className="text-sm text-green-700">
                  You've reached 1000 ✨ WISH tokens and can claim your 1.8 ℏ HBAR profit
                </div>
              </div>
            </div>
          ) : isClaimingAvailable ? (
            <button 
              onClick={handleClaimWish}
              className="w-full fountain-button-primary"
            >
              Claim ✨ WISH Tokens
            </button>
          ) : (
            <div className="text-center text-sm text-slate-500">
              {!protocolStatus.membership.isActive ? 
                'Join the protocol to start earning ✨ WISH tokens' : 
                'WISH quota reached - AutoRedeem available!'
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WishTokensCard;