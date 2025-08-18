import { Client, AccountBalanceQuery, PrivateKey } from "@hashgraph/sdk";
import dotenv from "dotenv";
dotenv.config();

async function comprehensiveBalanceCheck() {
    console.log("=== COMPREHENSIVE BALANCE CHECK FOR ALL WALLETS ===\n");
    console.log("💰 Checking HBAR, $WISH, $DRIP, and $DROP balances");
    console.log("🕐 Post-UTC snapshot state\n");
    
    const client = Client.forTestnet();
    
    // Set operator
    const controllerAccountId = process.env.CONTROLLER_ACCOUNT_ID;
    const controllerPrivateKey = PrivateKey.fromString(process.env.CONTROLLER_PRIVATE_KEY);
    client.setOperator(controllerAccountId, controllerPrivateKey);
    
    // Protocol token IDs
    const tokens = {
        WISH: process.env.WISH_TOKEN_ID,
        DRIP: process.env.DRIP_TOKEN_ID,
        DROP: process.env.DROP_TOKEN_ID
    };
    
    // All accounts to check
    const accounts = [
        { name: "CONTROLLER", id: process.env.CONTROLLER_ACCOUNT_ID, type: "Treasury/Controller" },
        { name: "TREASURY", id: process.env.TREASURY_ACCOUNT_ID, type: "Protocol Treasury" },
        { name: "OPERATOR", id: process.env.OPERATOR_ACCOUNT_ID, type: "Protocol Operator" },
        { name: "TEST_USER_1", id: process.env.TEST_USER_1_ACCOUNT_ID, type: "Test Account" },
        { name: "TEST_USER_2", id: process.env.TEST_USER_2_ACCOUNT_ID, type: "Test Account" },
        { name: "TEST_USER_3", id: process.env.TEST_USER_3_ACCOUNT_ID, type: "Test Account" },
        { name: "TEST_USER_4", id: process.env.TEST_USER_4_ACCOUNT_ID, type: "Test Account" },
        { name: "TEST_USER_5", id: process.env.TEST_USER_5_ACCOUNT_ID, type: "Test Account" }
    ];
    
    try {
        console.log("=== INDIVIDUAL WALLET BALANCES ===\n");
        
        const balanceResults = [];
        let totalHbar = 0;
        let totalWish = 0;
        let totalDrip = 0;
        let totalDrop = 0;
        
        for (const account of accounts) {
            console.log(`${account.name} (${account.type})`);
            console.log(`Account ID: ${account.id}`);
            
            try {
                const balance = await new AccountBalanceQuery()
                    .setAccountId(account.id)
                    .execute(client);
                
                // HBAR balance
                const hbarBalance = balance.hbars.toString();
                console.log(`  💎 HBAR: ${hbarBalance}`);
                
                // Protocol token balances
                const wishBalance = balance.tokens.get(tokens.WISH);
                const dripBalance = balance.tokens.get(tokens.DRIP);
                const dropBalance = balance.tokens.get(tokens.DROP);
                
                const wishAmount = wishBalance ? parseInt(wishBalance.toString()) : 0;
                const dripAmount = dripBalance ? parseInt(dripBalance.toString()) : 0;
                const dropAmount = dropBalance ? parseInt(dropBalance.toString()) : 0;
                
                console.log(`  🪙 $WISH: ${wishAmount} tokens`);
                console.log(`  🔹 $DRIP: ${dripAmount} tokens`);
                console.log(`  💧 $DROP: ${dropAmount} tokens`);
                
                // Account status analysis
                const hasMembership = dripAmount >= 1;
                const hasBonus = dropAmount >= 1;
                const hasRewards = wishAmount > 0;
                
                let status = [];
                if (hasMembership) status.push("Member");
                if (hasBonus) status.push("Donor");
                if (hasRewards) status.push("Rewards");
                if (status.length === 0) status.push("Inactive");
                
                console.log(`  📊 Status: ${status.join(" + ")}`);
                
                // Protocol participation level
                if (hasMembership && hasBonus && hasRewards) {
                    console.log(`  🌟 FULL PARTICIPANT: Member + Donor + Rewards`);
                } else if (hasMembership && hasRewards) {
                    console.log(`  ✅ ACTIVE MEMBER: Has membership and rewards`);
                } else if (hasMembership) {
                    console.log(`  📝 NEW MEMBER: Recently joined`);
                } else {
                    console.log(`  ⚪ NON-PARTICIPANT: No protocol involvement`);
                }
                
                balanceResults.push({
                    name: account.name,
                    type: account.type,
                    accountId: account.id,
                    hbar: hbarBalance,
                    wish: wishAmount,
                    drip: dripAmount,
                    drop: dropAmount,
                    status: status.join(" + "),
                    hasMembership,
                    hasBonus,
                    hasRewards
                });
                
                // Add to totals (excluding HBAR for simplicity)
                totalWish += wishAmount;
                totalDrip += dripAmount;
                totalDrop += dropAmount;
                
            } catch (error) {
                console.log(`  ❌ ERROR: ${error.message}`);
                balanceResults.push({
                    name: account.name,
                    type: account.type,
                    accountId: account.id,
                    error: error.message
                });
            }
            
            console.log("─".repeat(60));
        }
        
        console.log("\n=== PROTOCOL DISTRIBUTION SUMMARY ===\n");
        
        // Token distribution analysis
        console.log("📊 TOKEN DISTRIBUTION:");
        console.log(`  Total $WISH in circulation: ${totalWish} tokens`);
        console.log(`  Total $DRIP memberships: ${totalDrip} tokens`);
        console.log(`  Total $DROP recognition: ${totalDrop} tokens`);
        
        // Account categorization
        const members = balanceResults.filter(r => r.hasMembership);
        const donors = balanceResults.filter(r => r.hasBonus);
        const rewardHolders = balanceResults.filter(r => r.hasRewards);
        const inactive = balanceResults.filter(r => !r.hasMembership && !r.hasRewards);
        
        console.log("\n👥 ACCOUNT CATEGORIES:");
        console.log(`  Active Members: ${members.length}/${accounts.length}`);
        console.log(`  Donors ($DROP holders): ${donors.length}/${accounts.length}`);
        console.log(`  Reward Recipients: ${rewardHolders.length}/${accounts.length}`);
        console.log(`  Inactive Accounts: ${inactive.length}/${accounts.length}`);
        
        console.log("\n=== DETAILED BREAKDOWN BY CATEGORY ===\n");
        
        // Full participants (Member + Donor + Rewards)
        const fullParticipants = balanceResults.filter(r => r.hasMembership && r.hasBonus && r.hasRewards);
        if (fullParticipants.length > 0) {
            console.log("🌟 FULL PARTICIPANTS (Member + Donor + Rewards):");
            fullParticipants.forEach(participant => {
                console.log(`   • ${participant.name}: ${participant.drip} $DRIP, ${participant.wish} $WISH, ${participant.drop} $DROP`);
            });
            console.log();
        }
        
        // Active members (Member + Rewards, no donation)
        const activeMembers = balanceResults.filter(r => r.hasMembership && !r.hasBonus && r.hasRewards);
        if (activeMembers.length > 0) {
            console.log("✅ ACTIVE MEMBERS (Member + Rewards):");
            activeMembers.forEach(member => {
                console.log(`   • ${member.name}: ${member.drip} $DRIP, ${member.wish} $WISH`);
            });
            console.log();
        }
        
        // New members (Member only)
        const newMembers = balanceResults.filter(r => r.hasMembership && !r.hasRewards);
        if (newMembers.length > 0) {
            console.log("📝 NEW MEMBERS (Recently joined):");
            newMembers.forEach(member => {
                console.log(`   • ${member.name}: ${member.drip} $DRIP (no rewards yet)`);
            });
            console.log();
        }
        
        // Protocol accounts
        const protocolAccounts = balanceResults.filter(r => r.type.includes("Protocol") || r.type.includes("Treasury"));
        if (protocolAccounts.length > 0) {
            console.log("🏛️ PROTOCOL ACCOUNTS:");
            protocolAccounts.forEach(account => {
                console.log(`   • ${account.name} (${account.type}):`);
                console.log(`     HBAR: ${account.hbar}, $WISH: ${account.wish}, $DRIP: ${account.drip}, $DROP: ${account.drop}`);
            });
            console.log();
        }
        
        console.log("=== PROTOCOL HEALTH METRICS ===\n");
        
        const participationRate = (members.length / accounts.length * 100).toFixed(1);
        const donorConversionRate = members.length > 0 ? (donors.length / members.length * 100).toFixed(1) : 0;
        
        console.log(`📈 ENGAGEMENT METRICS:`);
        console.log(`   Member Participation Rate: ${participationRate}% (${members.length}/${accounts.length})`);
        console.log(`   Donor Conversion Rate: ${donorConversionRate}% (${donors.length}/${members.length} members donated)`);
        console.log(`   Average $WISH per member: ${members.length > 0 ? Math.round(totalWish / members.length) : 0} tokens`);
        
        console.log(`\n💎 TOKEN ECONOMICS:`);
        console.log(`   $DRIP supply utilization: ${totalDrip} memberships active`);
        console.log(`   $WISH distribution efficiency: ${totalWish} tokens distributed`);
        console.log(`   $DROP recognition coverage: ${totalDrop} donors recognized`);
        
        console.log(`\n🎯 PROTOCOL STATUS:`);
        if (members.length >= 5 && donors.length >= 1) {
            console.log(`   ✅ FULLY OPERATIONAL: Multi-user testing ready`);
            console.log(`   ✅ Enhanced snapshots: Base + bonus distribution working`);
            console.log(`   ✅ Donation incentives: $DROP bonus system active`);
        } else {
            console.log(`   ⚠️  Limited operation: Need more participants for full testing`);
        }
        
        console.log("\n🎉 COMPREHENSIVE BALANCE CHECK COMPLETE!");
        
    } catch (error) {
        console.error("❌ Balance check failed:", error.message);
    } finally {
        client.close();
    }
}

comprehensiveBalanceCheck();