# ⛲ Fountain Protocol

Sustainable DeFi protocol on Hedera Hashgraph with membership tokens (💦 DRIP), utility tokens (✨ WISH), and donation recognition (💧 DROP).

**Live Protocol:** https://peaceful-profiterole-7d59be.netlify.app/fountain-ui.html

## Token Architecture (HTS)
- **💦 DRIP**: Non-transferable membership token (freeze mechanics)
- **✨ WISH**: ERC-20 compatible utility token (mint/burn/transfer)
- **💧 DROP**: NFT recognition token (unique per donor)

## Protocol Economics
- Membership: 1 HBAR → 1 💦 DRIP
- Daily rewards: 50 ✨ WISH/day (75 with 💧 DROP bonus) 
- AutoRedeem: 1000 ✨ WISH → 1.8 HBAR (0.8 HBAR profit)

## Hedera Integration
- **HCS Topic**: 0.0.6591043 (daily snapshots)
- **Mirror Node**: Real-time balance queries
- **Network**: Testnet deployment

## Quick Start
```bash
cd docs/
python -m http.server 8000
# Open http://localhost:8000/fountain-ui.html
```

Use Test Mode for full protocol experience with real testnet data.

The protocol is built with sustainability and transparency as core values. All operations are recorded on HCS Topic 0.0.6591043 for full auditability.

Built with ❤️ on Hedera Hashgraph