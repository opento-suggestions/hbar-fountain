import { useProtocolStore } from '../../stores/protocolStore';

const DonationCard: React.FC = () => {
  const { protocolStatus } = useProtocolStore();

  const handleDonate = () => {
    // TODO: Implement donation transaction
    console.log('Donate clicked');
  };

  const getRecognitionStatus = () => {
    if (!protocolStatus || !protocolStatus.donation.isRecognized) {
      return {
        indicator: 'bg-gray-400',
        text: 'No Recognition',
        description: 'Make a donation to receive 💧 DROP token and earn bonus ✨ WISH'
      };
    }

    return {
      indicator: 'bg-blue-500',
      text: 'Recognized Donor',
      description: 'Thank you for supporting the protocol!'
    };
  };

  const recognitionStatus = getRecognitionStatus();

  return (
    <div className="fountain-card p-6">
      <h3 className="text-xl font-semibold mb-4 flex items-center space-x-2">
        <span>💧 Donation Recognition</span>
      </h3>

      <div className="space-y-4">
        {/* Recognition Status */}
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${recognitionStatus.indicator}`}></div>
          <div>
            <div className="font-medium text-slate-900">{recognitionStatus.text}</div>
            <div className="text-sm text-slate-600">{recognitionStatus.description}</div>
          </div>
        </div>

        {/* Recognition Details */}
        {protocolStatus && (
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600">💧 DROP Tokens:</span>
              <span className="font-medium">
                {protocolStatus.donation.dropBalance}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">✨ WISH Bonus:</span>
              <span className={`font-medium ${protocolStatus.donation.wishBonus > 0 ? 'text-green-600' : 'text-slate-500'}`}>
                +{protocolStatus.donation.wishBonus} per day
              </span>
            </div>
          </div>
        )}

        {/* Benefits of Recognition */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-blue-800 font-medium mb-2">💧 DROP Benefits</div>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• +25 ✨ WISH bonus per day</li>
            <li>• Unique 💧 DROP NFT recognition</li>
            <li>• Faster path to AutoRedeem (15 vs 20 days)</li>
            <li>• Support protocol sustainability</li>
          </ul>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          {!protocolStatus?.donation.isRecognized ? (
            <button 
              onClick={handleDonate}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium px-6 py-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Donate for Recognition
            </button>
          ) : (
            <div className="text-center">
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-lg">
                <span>🎉</span>
                <span className="font-medium">Thank you for your support!</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DonationCard;