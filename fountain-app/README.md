# ⛲ Fountain Protocol - React Application

Modern React interface for the Fountain Protocol - a sustainable DeFi protocol on Hedera Hashgraph.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 🏗️ Architecture

### Technology Stack
- **React 19** with TypeScript
- **Vite** for fast development and builds  
- **Tailwind CSS** for styling
- **Zustand** for state management
- **@hashgraph/sdk** for Hedera integration

### Key Features
- **Real-time Protocol Dashboard** with member status tracking
- **Investment Calculator** showing profit potential (80% ROI)
- **Multi-wallet Support** (HashPack, Blade, Test Mode)
- **Live Activity Feed** connected to HCS events
- **Responsive Design** optimized for desktop and mobile

## 🌊 Protocol Integration

### Investment Mechanics
- **Investment**: 1 ℏ HBAR  
- **Return**: 1.8 ℏ HBAR (0.8 ℏ profit + 1000 ✨ WISH tokens)
- **ROI**: 80% profit in 13-20 days
- **Bonus**: 💧 DROP recognition provides +25 ✨ WISH/day

### Live Protocol Data
- **Mirror Node API** for real-time balance queries
- **HCS Event Monitoring** for protocol activity
- **Smart Contract Integration** for transactions  
- **Test Mode** with realistic mock data from testnet accounts

## 📱 User Experience

### Wallet Connection Flow
1. **Welcome Screen**: Protocol overview with investment opportunity
2. **Wallet Selection**: HashPack, Blade Wallet, or Test Mode  
3. **Dashboard**: Complete protocol status and controls
4. **Real-time Updates**: Live data refresh and activity monitoring

### Component Structure
```
src/components/
├── Header/              # App header with wallet connection
├── Welcome/             # Landing page for non-connected users
└── Dashboard/           # Main protocol dashboard
    ├── MembershipCard   # 💦 DRIP membership status
    ├── WishTokensCard   # ✨ WISH token progress  
    ├── DonationCard     # 💧 DROP recognition
    ├── ActivityCard     # Recent protocol activity
    └── InvestmentCalculator # AutoRedeem calculator
```

## 🔧 Development

### Available Scripts
- `npm run dev` - Start development server (http://localhost:5173)
- `npm run build` - Build for production
- `npm run lint` - Run ESLint

### Environment
The app connects to Hedera Testnet with live protocol tokens:
- 💦 DRIP: `0.0.6591211` (membership)  
- ✨ WISH: `0.0.6590974` (utility)
- 💧 DROP: `0.0.6590982` (recognition NFT)
- Contract: `0.0.6600522`
- HCS Topic: `0.0.6591043`

---

**Live Protocol**: https://peaceful-profiterole-7d59be.netlify.app/fountain-ui.html
```
