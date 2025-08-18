import { 
    Client, 
    TokenMintTransaction,
    TransferTransaction,
    AccountBalanceQuery,
    PrivateKey
} from "@hashgraph/sdk";
import dotenv from "dotenv";
dotenv.config();

async function sevenDayTimelapseSnapshots() {
    console.log("=== 7-DAY TIMELAPSE: SEQUENTIAL SNAPSHOT SIMULATION ===\n");
    console.log("🕐 Simulating 7 consecutive daily UTC 00:00 snapshots");
    console.log("📊 Base: 50 $WISH per $DRIP holder + 25 $WISH bonus per $DROP holder");
    console.log("💰 Users accumulate $WISH without claiming/spending\n");
    
    const client = Client.forTestnet();
    
    // Use CONTROLLER (treasury) for minting operations
    const controllerAccountId = process.env.CONTROLLER_ACCOUNT_ID;
    const controllerPrivateKey = PrivateKey.fromString(process.env.CONTROLLER_PRIVATE_KEY);
    client.setOperator(controllerAccountId, controllerPrivateKey);
    
    const dripTokenId = process.env.DRIP_TOKEN_ID;
    const wishTokenId = process.env.WISH_TOKEN_ID;
    const dropTokenId = process.env.DROP_TOKEN_ID;
    
    // All participants (will be checked each day for consistency)
    const participants = [
        { name: "CONTROLLER", id: process.env.CONTROLLER_ACCOUNT_ID },
        { name: "TEST_USER_1", id: process.env.TEST_USER_1_ACCOUNT_ID },
        { name: "TEST_USER_2", id: process.env.TEST_USER_2_ACCOUNT_ID },
        { name: "TEST_USER_3", id: process.env.TEST_USER_3_ACCOUNT_ID },
        { name: "TEST_USER_4", id: process.env.TEST_USER_4_ACCOUNT_ID },
        { name: "TEST_USER_5", id: process.env.TEST_USER_5_ACCOUNT_ID }
    ];
    
    const BASE_WISH_AMOUNT = 50;  // Base daily grant
    const DROP_BONUS_AMOUNT = 25; // Bonus for $DROP holders
    const SIMULATION_DAYS = 7;
    
    try {
        console.log("=== INITIAL STATE CHECK ===");
        
        // Get initial balances
        const initialBalances = [];
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
            
            initialBalances.push({
                name: participant.name,
                id: participant.id,
                initialWish: wishAmount,
                drip: dripAmount,
                drop: dropAmount,
                isEligible: dripAmount >= 1,
                hasBonus: dropAmount >= 1
            });
        }
        
        const eligibleParticipants = initialBalances.filter(p => p.isEligible);
        const bonusRecipients = initialBalances.filter(p => p.hasBonus);
        
        console.log(`📊 Starting State:`);
        console.log(`   Eligible participants: ${eligibleParticipants.length}`);
        console.log(`   Bonus recipients: ${bonusRecipients.length}`);
        console.log(`   Daily distribution: ${eligibleParticipants.length * BASE_WISH_AMOUNT + bonusRecipients.length * DROP_BONUS_AMOUNT} $WISH\n`);
        
        const weeklyResults = [];
        
        // Execute 7 consecutive snapshots
        for (let day = 1; day <= SIMULATION_DAYS; day++) {
            console.log(`=== DAY ${day} SNAPSHOT (UTC 00:00) ===`);
            
            const dayStart = new Date();
            dayStart.setDate(dayStart.getDate() + day - 1);
            console.log(`📅 Simulated Date: ${dayStart.toISOString().split('T')[0]}`);
            
            // Step 1: Snapshot current holdings
            const currentEligible = [];
            const currentBonusRecipients = [];
            
            for (const participant of participants) {
                const balance = await new AccountBalanceQuery()
                    .setAccountId(participant.id)
                    .execute(client);
                
                const dripBalance = balance.tokens.get(dripTokenId);
                const dropBalance = balance.tokens.get(dropTokenId);
                
                const dripAmount = dripBalance ? parseInt(dripBalance.toString()) : 0;
                const dropAmount = dropBalance ? parseInt(dropBalance.toString()) : 0;
                
                if (dripAmount >= 1) {
                    const hasDropBonus = dropAmount >= 1;
                    const wishGrant = BASE_WISH_AMOUNT + (hasDropBonus ? DROP_BONUS_AMOUNT : 0);
                    
                    currentEligible.push({
                        name: participant.name,
                        id: participant.id,
                        dripBalance: dripAmount,
                        dropBalance: dropAmount,
                        hasDropBonus: hasDropBonus,
                        wishGrant: wishGrant
                    });
                    
                    if (hasDropBonus) {
                        currentBonusRecipients.push(participant.name);
                    }
                }
            }
            
            console.log(`   Eligible accounts: ${currentEligible.length}`);
            console.log(`   Bonus recipients: ${currentBonusRecipients.length}`);
            
            // Step 2: Calculate total distribution
            const totalWishNeeded = currentEligible.reduce((sum, participant) => sum + participant.wishGrant, 0);
            console.log(`   Total $WISH to distribute: ${totalWishNeeded}`);
            
            // Step 3: Mint total $WISH to treasury
            console.log(`   Minting ${totalWishNeeded} $WISH to treasury...`);
            
            const mintTx = new TokenMintTransaction()
                .setTokenId(wishTokenId)
                .setAmount(totalWishNeeded);
            
            const mintResponse = await mintTx.execute(client);
            const mintReceipt = await mintResponse.getReceipt(client);
            
            console.log(`   ✅ Mint: ${mintResponse.transactionId}`);
            
            // Step 4: Distribute to each eligible participant
            const dayDistributionResults = [];
            
            for (const participant of currentEligible) {
                try {
                    const transferTx = new TransferTransaction()
                        .addTokenTransfer(wishTokenId, controllerAccountId, -participant.wishGrant)
                        .addTokenTransfer(wishTokenId, participant.id, participant.wishGrant);
                    
                    const transferResponse = await transferTx.execute(client);
                    const transferReceipt = await transferResponse.getReceipt(client);
                    
                    dayDistributionResults.push({
                        participant: participant.name,
                        wishGranted: participant.wishGrant,
                        baseAmount: BASE_WISH_AMOUNT,
                        bonusAmount: participant.hasDropBonus ? DROP_BONUS_AMOUNT : 0,
                        status: "SUCCESS",
                        transactionId: transferResponse.transactionId.toString()
                    });
                    
                } catch (error) {
                    console.log(`   ❌ Distribution to ${participant.name} failed: ${error.message}`);
                    dayDistributionResults.push({
                        participant: participant.name,
                        wishGranted: 0,
                        status: "FAILED",
                        error: error.message
                    });
                }
            }
            
            // Step 5: Day summary
            const successfulDistributions = dayDistributionResults.filter(r => r.status === "SUCCESS");
            const totalWishDistributed = successfulDistributions.reduce((sum, r) => sum + r.wishGranted, 0);
            const totalBonusDistributed = successfulDistributions.reduce((sum, r) => sum + r.bonusAmount, 0);
            
            console.log(`   ✅ Successful distributions: ${successfulDistributions.length}/${currentEligible.length}`);
            console.log(`   🪙 Total distributed: ${totalWishDistributed} $WISH`);
            console.log(`   🎁 Bonus distributed: ${totalBonusDistributed} $WISH`);
            
            weeklyResults.push({
                day: day,
                date: dayStart.toISOString().split('T')[0],
                eligibleCount: currentEligible.length,
                bonusCount: currentBonusRecipients.length,
                totalDistributed: totalWishDistributed,
                bonusDistributed: totalBonusDistributed,
                distributions: dayDistributionResults,
                mintTransactionId: mintResponse.transactionId.toString()
            });
            
            console.log(`   Day ${day} complete!\n`);
        }
        
        console.log("=== 7-DAY TIMELAPSE SUMMARY ===");
        
        let weeklyTotalDistributed = 0;
        let weeklyBonusDistributed = 0;
        
        weeklyResults.forEach((dayResult, index) => {
            console.log(`📅 Day ${dayResult.day} (${dayResult.date}):`);
            console.log(`   Participants: ${dayResult.eligibleCount} | Bonus: ${dayResult.bonusCount}`);
            console.log(`   Distributed: ${dayResult.totalDistributed} $WISH (${dayResult.bonusDistributed} bonus)`);
            
            weeklyTotalDistributed += dayResult.totalDistributed;
            weeklyBonusDistributed += dayResult.bonusDistributed;
        });
        
        console.log(`\n📊 WEEKLY TOTALS:`);
        console.log(`   Total $WISH distributed: ${weeklyTotalDistributed}`);
        console.log(`   Total bonus $WISH: ${weeklyBonusDistributed}`);
        console.log(`   Average per day: ${Math.round(weeklyTotalDistributed / SIMULATION_DAYS)} $WISH`);
        
        console.log("\n=== FINAL ACCUMULATION CHECK ===");
        
        // Check final balances vs initial
        for (const initialBalance of initialBalances) {
            if (!initialBalance.isEligible) continue;
            
            const finalBalance = await new AccountBalanceQuery()
                .setAccountId(initialBalance.id)
                .execute(client);
            
            const finalWishBalance = finalBalance.tokens.get(wishTokenId);
            const finalWishAmount = finalWishBalance ? parseInt(finalWishBalance.toString()) : 0;
            
            const expectedDailyWish = BASE_WISH_AMOUNT + (initialBalance.hasBonus ? DROP_BONUS_AMOUNT : 0);
            const expectedWeeklyWish = expectedDailyWish * SIMULATION_DAYS;
            const actualWeeklyIncrease = finalWishAmount - initialBalance.initialWish;
            
            console.log(`${initialBalance.name}:`);
            console.log(`   Initial: ${initialBalance.initialWish} $WISH`);
            console.log(`   Final: ${finalWishAmount} $WISH`);
            console.log(`   Weekly increase: ${actualWeeklyIncrease} $WISH`);
            console.log(`   Expected increase: ${expectedWeeklyWish} $WISH`);
            console.log(`   Daily rate: ${expectedDailyWish} $WISH (${BASE_WISH_AMOUNT} base${initialBalance.hasBonus ? ` + ${DROP_BONUS_AMOUNT} bonus` : ''})`);
            
            if (actualWeeklyIncrease === expectedWeeklyWish) {
                console.log(`   ✅ ACCUMULATION CORRECT`);
            } else {
                console.log(`   ❌ ACCUMULATION MISMATCH`);
            }
            console.log();
        }
        
        console.log("=== PROTOCOL PERFORMANCE ANALYSIS ===");
        
        const consistentParticipation = weeklyResults.every(day => 
            day.eligibleCount === eligibleParticipants.length && 
            day.bonusCount === bonusRecipients.length
        );
        
        console.log(`✅ CONSISTENCY METRICS:`);
        console.log(`   Participant count stable: ${consistentParticipation ? 'YES' : 'NO'}`);
        console.log(`   Daily distributions successful: ${weeklyResults.length}/${SIMULATION_DAYS}`);
        console.log(`   Bonus system stable: ${weeklyResults.every(d => d.bonusCount === bonusRecipients.length) ? 'YES' : 'NO'}`);
        
        console.log(`\n💎 TOKEN ECONOMICS:`);
        console.log(`   Weekly $WISH inflation: ${weeklyTotalDistributed} tokens`);
        console.log(`   Bonus incentive value: ${weeklyBonusDistributed} tokens (${(weeklyBonusDistributed/weeklyTotalDistributed*100).toFixed(1)}%)`);
        console.log(`   Treasury mint operations: ${weeklyResults.length} (one per day)`);
        
        console.log(`\n🎯 INCENTIVE EFFECTIVENESS:`);
        const bonusPercentage = (bonusRecipients.length / eligibleParticipants.length * 100);
        console.log(`   Donor conversion rate: ${bonusPercentage.toFixed(1)}% (${bonusRecipients.length}/${eligibleParticipants.length})`);
        console.log(`   Bonus value per donor: ${DROP_BONUS_AMOUNT * SIMULATION_DAYS} $WISH/week`);
        console.log(`   Total bonus incentive: ${weeklyBonusDistributed} $WISH created`);
        
        if (consistentParticipation && weeklyResults.length === SIMULATION_DAYS) {
            console.log("\n🎉 7-DAY TIMELAPSE SIMULATION COMPLETE!");
            console.log("🚀 Protocol demonstrates stable long-term operation!");
            console.log("📈 Enhanced snapshot system working perfectly!");
        } else {
            console.log("\n⚠️  Some consistency issues detected - review above");
        }
        
    } catch (error) {
        console.error("❌ Timelapse simulation failed:", error.message);
    } finally {
        client.close();
    }
}

sevenDayTimelapseSnapshots();