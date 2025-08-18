import { useProtocolStore } from '../../stores/protocolStore';
// Removed unused import

const MembershipCard: React.FC = () => {
  const { protocolStatus, memberLifecycleState } = useProtocolStore();

  const getStatusDisplay = () => {
    if (!protocolStatus || !protocolStatus.membership.isActive) {
      return {
        indicator: 'bg-red-500',
        text: 'Not a Member',
        description: 'Join the protocol to start earning ✨ WISH tokens'
      };
    }

    switch (memberLifecycleState) {
      case 'ACTIVE_CLAIMING':
        return {
          indicator: 'bg-green-500',
          text: 'Active Member',
          description: 'Claiming ✨ WISH tokens daily'
        };
      case 'CAP_REACHED_REDEEMABLE':
        return {
          indicator: 'bg-blue-500 animate-pulse',
          text: 'AutoRedeem Ready!',
          description: 'Claim your 1.8 ℏ HBAR profit now!'
        };
      default:
        return {
          indicator: 'bg-yellow-500',
          text: 'Member Status Unknown',
          description: 'Refreshing status...'
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  const handleJoinProtocol = () => {
    // TODO: Implement join protocol transaction
    console.log('Join Protocol clicked');
  };

  const handleAutoRedeem = () => {
    // TODO: Implement AutoRedeem transaction
    console.log('AutoRedeem clicked');
  };

  return (
    <div className="fountain-card p-6">
      <h3 className="text-xl font-semibold mb-4 flex items-center space-x-2">
        <span>💦 Membership Status</span>
      </h3>

      <div className="space-y-4">
        {/* Status Indicator */}
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${statusDisplay.indicator}`}></div>
          <div>
            <div className="font-medium text-slate-900">{statusDisplay.text}</div>
            <div className="text-sm text-slate-600">{statusDisplay.description}</div>
          </div>
        </div>

        {/* Membership Details */}
        {protocolStatus && (
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600">💦 DRIP Tokens:</span>
              <span className="font-medium">
                {protocolStatus.membership.dripBalance}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Daily ✨ WISH Rate:</span>
              <span className="font-medium">
                {protocolStatus.membership.dailyWishRate} per day
                {protocolStatus.donation.isRecognized && (
                  <span className="text-green-600 text-xs ml-1">(+💧 bonus)</span>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2">
          {!protocolStatus?.membership.isActive ? (
            <button 
              onClick={handleJoinProtocol}
              className="w-full fountain-button-primary"
            >
              Join Protocol (1 ℏ [HBAR])
            </button>
          ) : memberLifecycleState === 'CAP_REACHED_REDEEMABLE' ? (
            <button 
              onClick={handleAutoRedeem}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium px-6 py-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg animate-pulse"
            >
              🎉 AutoRedeem Available - Claim 1.8 ℏ HBAR!
            </button>
          ) : (
            <div className="text-center text-sm text-slate-500">
              Continue earning ✨ WISH tokens to reach AutoRedeem
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MembershipCard;