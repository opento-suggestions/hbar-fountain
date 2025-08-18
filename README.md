# 🌊 Fountain Protocol

A sustainable DeFi protocol built on Hedera Hashgraph featuring membership-based token economics with real profit mechanics.

## 🎪 Live Protocol

**Experience the protocol now:** https://peaceful-profiterole-7d59be.netlify.app/fountain-ui.html

- **Test Mode**: Full protocol simulation with real Hedera testnet data
- **HashPack Integration**: Coming soon (complex wallet integration)
- **Real Economics**: 1 HBAR → 1.8 HBAR cycles (0.8 HBAR profit per 13-20 days)

## 🏗️ Core Architecture

### Token Economy
- **DRIP**: Membership tokens (1 HBAR = 1 membership)
- **WISH**: Utility tokens (50-75 earned daily)  
- **DROP**: Donation recognition tokens

### AutoRedeem Cycle
1. **Join**: 1 HBAR → 1 DRIP membership + daily WISH earning
2. **Accumulate**: Earn 50 WISH/day (75 with DROP bonus)
3. **AutoRedeem**: Burn 1000 WISH → Get 1.8 HBAR payout
4. **Profit**: 1.8 HBAR received - 1.0 HBAR deposit = **0.8 HBAR profit**

### Hedera Integration
- **HCS Audit Trail**: Topic 0.0.6591043 for transparent operations
- **Mirror Node API**: Real-time balance and transaction queries
- **Smart Contract**: Production deployment ready

## 🚀 Quick Start

### Run the Protocol Interface
```bash
# Serve locally
cd docs/
python -m http.server 8000
# Open http://localhost:8000/fountain-ui.html

# Or visit live deployment
open https://peaceful-profiterole-7d59be.netlify.app/fountain-ui.html
```

### Test Mode Experience
1. Click "Connect Wallet" → "Test Mode"
2. Explore full protocol dashboard with real testnet data
3. See membership status, WISH balances, AutoRedeem calculations
4. Experience the complete user journey without wallet complexity

## 📊 Protocol Economics

- **Membership Cost**: 1 HBAR
- **Daily WISH Base**: 50 tokens
- **Donor Bonus**: +25 WISH/day (with DROP recognition)
- **AutoRedeem Threshold**: 1000 WISH tokens
- **AutoRedeem Payout**: 1.8 HBAR
- **Cycle Duration**: 13-20 days (depending on bonus)
- **Net Profit**: 0.8 HBAR per cycle

## 🛠️ Development Stack

- **Frontend**: Vanilla JS with modern Web APIs
- **Blockchain**: Hedera Hashgraph (Testnet)
- **Wallet Integration**: HashConnect/HashPack (in progress)
- **Data Source**: Hedera Mirror Node API
- **Deployment**: Netlify (CSP-free for wallet integration)

## 📁 Project Structure

```
docs/
├── fountain-ui.html          # Main protocol interface
├── css/fountain.css          # Protocol styling
└── js/
    ├── constants.js          # Protocol configuration
    ├── protocol-client.js    # Core protocol logic
    ├── wallet-connect.js     # Wallet management
    ├── hashconnect-proper.js # HashPack integration
    └── app.js               # Application orchestration
```

## 🎯 Current Status

✅ **Working**: Full protocol simulation via Test Mode  
✅ **Working**: Real Hedera testnet data integration  
✅ **Working**: Complete user dashboard and economics  
⚠️ **In Progress**: HashPack wallet integration (complex)  
🎯 **Ready**: Protocol experience available today  

## 🔮 Future Roadmap

- Complete HashPack wallet integration
- Mainnet deployment
- Mobile-optimized interface  
- Advanced analytics dashboard
- Multi-wallet support (Blade, etc.)

## 🤝 Contributing

The protocol is built with sustainability and transparency as core values. All operations are recorded on HCS Topic 0.0.6591043 for full auditability.

---

*Built with ❤️ on Hedera Hashgraph*
