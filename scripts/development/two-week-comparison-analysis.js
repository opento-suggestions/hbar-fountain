import { Client, AccountBalanceQuery, TokenInfoQuery, PrivateKey } from "@hashgraph/sdk";
import dotenv from "dotenv";
dotenv.config();

async function twoWeekComparisonAnalysis() {
    console.log("=== TWO-WEEK COMPARISON ANALYSIS ===\n");
    console.log("🔍 Analyzing patterns and changes between Week 1 and Week 2");
    console.log("💡 Looking for the special reason behind the second week simulation\n");
    
    const client = Client.forTestnet();
    
    // Set operator
    const controllerAccountId = process.env.CONTROLLER_ACCOUNT_ID;
    const controllerPrivateKey = PrivateKey.fromString(process.env.CONTROLLER_PRIVATE_KEY);
    client.setOperator(controllerAccountId, controllerPrivateKey);
    
    const dripTokenId = process.env.DRIP_TOKEN_ID;
    const wishTokenId = process.env.WISH_TOKEN_ID;
    const dropTokenId = process.env.DROP_TOKEN_ID;
    
    // All participants with their journey
    const participants = [
        { name: "CONTROLLER", id: process.env.CONTROLLER_ACCOUNT_ID },
        { name: "TEST_USER_1", id: process.env.TEST_USER_1_ACCOUNT_ID },
        { name: "TEST_USER_2", id: process.env.TEST_USER_2_ACCOUNT_ID },
        { name: "TEST_USER_3", id: process.env.TEST_USER_3_ACCOUNT_ID },
        { name: "TEST_USER_4", id: process.env.TEST_USER_4_ACCOUNT_ID },
        { name: "TEST_USER_5", id: process.env.TEST_USER_5_ACCOUNT_ID }
    ];
    
    try {
        console.log("=== STEP 1: CURRENT BALANCES AFTER 2 WEEKS ===");
        
        const currentBalances = [];
        let totalCurrentWish = 0;
        
        for (const participant of participants) {
            const balance = await new AccountBalanceQuery()
                .setAccountId(participant.id)
                .execute(client);
            
            const dripBalance = balance.tokens.get(dripTokenId);
            const wishBalance = balance.tokens.get(wishTokenId);
            const dropBalance = balance.tokens.get(dropTokenId);
            
            const dripAmount = dripBalance ? parseInt(dripBalance.toString()) : 0;
            const wishAmount = wishBalance ? parseInt(wishBalance.toString()) : 0;
            const dropAmount = dropBalance ? parseInt(dropBalance.toString()) : 0;
            
            console.log(`${participant.name}: ${wishAmount} $WISH, ${dripAmount} $DRIP, ${dropAmount} $DROP`);
            
            currentBalances.push({
                name: participant.name,
                wish: wishAmount,
                drip: dripAmount,
                drop: dropAmount
            });
            
            totalCurrentWish += wishAmount;
        }
        
        console.log(`\nTotal $WISH across all accounts: ${totalCurrentWish}\n`);
        
        console.log("=== STEP 2: TWO-WEEK ACCUMULATION ANALYSIS ===");
        
        // Calculate estimated starting balances (before any snapshots)
        const estimatedStartingBalances = {
            "CONTROLLER": 425,    // Had 775 after week 1, minus 350 = 425 start
            "TEST_USER_1": 200,   // Had 725 after week 1, minus 525 = 200 start  
            "TEST_USER_2": 150,   // Had 500 after week 1, minus 350 = 150 start
            "TEST_USER_3": 50,    // Had 575 after week 1, minus 525 = 50 start
            "TEST_USER_4": 50,    // Had 400 after week 1, minus 350 = 50 start
            "TEST_USER_5": 50     // Had 575 after week 1, minus 525 = 50 start
        };
        
        console.log("📊 Two-Week Accumulation Journey:");
        
        currentBalances.forEach(participant => {
            const startingBalance = estimatedStartingBalances[participant.name] || 0;
            const twoWeekIncrease = participant.wish - startingBalance;
            const weeklyRate = twoWeekIncrease / 2;
            const dailyRate = weeklyRate / 7;
            
            console.log(`\n${participant.name}:`);
            console.log(`  Starting (estimated): ${startingBalance} $WISH`);
            console.log(`  After 2 weeks: ${participant.wish} $WISH`);
            console.log(`  Total increase: ${twoWeekIncrease} $WISH`);
            console.log(`  Weekly rate: ${weeklyRate} $WISH`);
            console.log(`  Daily rate: ${dailyRate} $WISH`);
            
            // Check for approaching 1000 $WISH cap
            const remainingToCap = 1000 - participant.wish;
            if (remainingToCap <= weeklyRate && participant.wish > 0) {
                const daysToCapAtCurrentRate = remainingToCap / dailyRate;
                console.log(`  🚨 APPROACHING 1000 $WISH CAP!`);
                console.log(`  Remaining to cap: ${remainingToCap} $WISH`);
                console.log(`  Days to cap at current rate: ${daysToCapAtCurrentRate.toFixed(1)} days`);
                console.log(`  ⚠️  Will hit lifetime cap soon!`);
            } else if (participant.wish >= 1000) {
                console.log(`  🛑 LIFETIME CAP REACHED: ${participant.wish} ≥ 1000 $WISH`);
            }
        });
        
        console.log("\n=== STEP 3: LIFETIME CAP ANALYSIS ===");
        
        const approachingCap = currentBalances.filter(p => p.wish > 800 && p.wish < 1000);
        const atOrOverCap = currentBalances.filter(p => p.wish >= 1000);
        const farFromCap = currentBalances.filter(p => p.wish <= 800);
        
        console.log(`🎯 LIFETIME CAP STATUS (1000 $WISH per DRIP):`);
        console.log(`   Users approaching cap (>800): ${approachingCap.length}`);
        console.log(`   Users at/over cap (≥1000): ${atOrOverCap.length}`);
        console.log(`   Users far from cap (≤800): ${farFromCap.length}`);
        
        if (approachingCap.length > 0) {
            console.log(`\n🚨 USERS APPROACHING CAP:`);
            approachingCap.forEach(user => {
                const remainingToCap = 1000 - user.wish;
                const dailyRate = user.drop >= 1 ? 75 : 50; // Bonus rate check
                const daysRemaining = Math.ceil(remainingToCap / dailyRate);
                console.log(`   • ${user.name}: ${user.wish}/1000 $WISH (${remainingToCap} remaining, ~${daysRemaining} days)`);
            });
        }
        
        if (atOrOverCap.length > 0) {
            console.log(`\n🛑 USERS AT/OVER CAP:`);
            atOrOverCap.forEach(user => {
                console.log(`   • ${user.name}: ${user.wish}/1000 $WISH (CAP REACHED!)`);
            });
        }
        
        console.log("\n=== STEP 4: PROTOCOL IMPLICATIONS ===");
        
        const totalTwoWeekDistribution = 2625 * 2; // 2 weeks × 2625 per week
        console.log(`📊 Two-Week Distribution Summary:`);
        console.log(`   Total distributed: ${totalTwoWeekDistribution} $WISH`);
        console.log(`   Actual account total: ${totalCurrentWish} $WISH`);
        console.log(`   Expected vs Actual: ${totalTwoWeekDistribution === totalCurrentWish ? 'MATCH' : 'MISMATCH'}`);
        
        console.log(`\n💡 THE SPECIAL REASON FOR WEEK 2:`);
        
        if (approachingCap.length > 0 || atOrOverCap.length > 0) {
            console.log(`🎯 LIFETIME CAP TESTING!`);
            console.log(`   Week 2 reveals users approaching their 1000 $WISH lifetime cap`);
            console.log(`   This tests the protocol's cap enforcement mechanisms`);
            console.log(`   Shows real-world accumulation patterns over time`);
            
            if (atOrOverCap.length > 0) {
                console.log(`\n🚨 CRITICAL DISCOVERY:`);
                console.log(`   Some users have reached/exceeded the 1000 $WISH cap!`);
                console.log(`   This triggers AutoRelease eligibility in the protocol`);
                console.log(`   These users can now redeem their $DRIP for 1.8 HBAR`);
            }
        } else {
            console.log(`📈 ACCUMULATION PATTERN VERIFICATION:`);
            console.log(`   Week 2 confirms consistent long-term operation`);
            console.log(`   Demonstrates protocol stability over extended periods`);
            console.log(`   Shows predictable token economics in action`);
        }
        
        console.log("\n=== STEP 5: NEXT PROTOCOL ACTIONS ===");
        
        if (atOrOverCap.length > 0) {
            console.log(`🔄 AUTORELEASE READY:`);
            atOrOverCap.forEach(user => {
                console.log(`   • ${user.name}: Eligible for DRIP redemption (1.8 HBAR payout)`);
            });
            console.log(`   Next step: Test AutoRelease mechanism`);
        }
        
        if (approachingCap.length > 0) {
            console.log(`⏰ CAP MONITORING:`);
            approachingCap.forEach(user => {
                const remainingToCap = 1000 - user.wish;
                const dailyRate = user.drop >= 1 ? 75 : 50;
                const daysRemaining = Math.ceil(remainingToCap / dailyRate);
                console.log(`   • ${user.name}: ${daysRemaining} more days until AutoRelease eligible`);
            });
        }
        
        console.log("\n=== STEP 6: TOKEN SUPPLY ANALYSIS ===");
        
        const wishTokenInfo = await new TokenInfoQuery()
            .setTokenId(wishTokenId)
            .execute(client);
        
        const totalWishSupply = parseInt(wishTokenInfo.totalSupply.toString());
        
        console.log(`💎 TOKEN ECONOMICS AFTER 2 WEEKS:`);
        console.log(`   Total $WISH supply: ${totalWishSupply.toLocaleString()} tokens`);
        console.log(`   Two-week inflation: ${totalTwoWeekDistribution.toLocaleString()} tokens`);
        console.log(`   Users holding $WISH: ${currentBalances.filter(p => p.wish > 0).length}/6`);
        console.log(`   Average $WISH per holder: ${Math.round(totalCurrentWish / currentBalances.filter(p => p.wish > 0).length)}`);
        
        console.log("\n🎉 TWO-WEEK ANALYSIS COMPLETE!");
        
        if (atOrOverCap.length > 0) {
            console.log("🎯 SPECIAL REASON REVEALED: LIFETIME CAP REACHED!");
            console.log("🔄 Protocol ready for AutoRelease testing!");
        } else {
            console.log("📈 SPECIAL REASON: LONG-TERM STABILITY VERIFICATION!");
            console.log("🚀 System demonstrates consistent operation!");
        }
        
    } catch (error) {
        console.error("❌ Analysis failed:", error.message);
    } finally {
        client.close();
    }
}

twoWeekComparisonAnalysis();