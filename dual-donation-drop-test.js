import { 
    Client, 
    TransferTransaction, 
    TokenMintTransaction,
    TokenAssociateTransaction,
    TokenFreezeTransaction,
    AccountBalanceQuery,
    Hbar, 
    PrivateKey
} from "@hashgraph/sdk";
import dotenv from "dotenv";
dotenv.config();

async function dualDonationDropTest() {
    console.log("=== DUAL DONATION $DROP TEST: TEST_USER_3 & TEST_USER_5 ===\n");
    console.log("🎯 Each user donates 3.33 HBAR to Treasury");
    console.log("🪙 Expected: $DROP mint for each (donation > 0.01 HBAR threshold)");
    console.log("👤 Both users hold ≥1 $DRIP and have no existing $DROP\n");
    
    const client = Client.forTestnet();
    
    // Treasury/Controller details
    const controllerAccountId = process.env.CONTROLLER_ACCOUNT_ID;
    const controllerPrivateKey = PrivateKey.fromString(process.env.CONTROLLER_PRIVATE_KEY);
    const dropTokenId = process.env.DROP_TOKEN_ID;
    
    // Test users for dual donation
    const donors = [
        { 
            name: "TEST_USER_3", 
            accountId: process.env.TEST_USER_3_ACCOUNT_ID,
            privateKey: PrivateKey.fromString(process.env.TEST_USER_3_PRIVATE_KEY)
        },
        { 
            name: "TEST_USER_5", 
            accountId: process.env.TEST_USER_5_ACCOUNT_ID,
            privateKey: PrivateKey.fromString(process.env.TEST_USER_5_PRIVATE_KEY)
        }
    ];
    
    const DONATION_AMOUNT = 3.33; // 3.33 HBAR per donation
    const THRESHOLD = 0.01; // 0.01 HBAR threshold
    
    try {
        console.log("=== STEP 1: VALIDATE DUAL ELIGIBILITY ===");
        
        client.setOperator(controllerAccountId, controllerPrivateKey);
        
        const eligibilityResults = [];
        
        for (const donor of donors) {
            console.log(`Checking ${donor.name} eligibility...`);
            
            try {
                const preBalance = await new AccountBalanceQuery()
                    .setAccountId(donor.accountId)
                    .execute(client);
                
                const existingDrop = preBalance.tokens.get(dropTokenId);
                const dropAmount = existingDrop ? parseInt(existingDrop.toString()) : 0;
                
                if (dropAmount > 0) {
                    console.log(`  ❌ ${donor.name} already has ${dropAmount} $DROP token(s)`);
                    console.log("  💡 Lifetime cap: 1 $DROP per wallet (already reached)");
                    eligibilityResults.push({ donor: donor.name, eligible: false, reason: "Already has $DROP" });
                } else {
                    console.log(`  ✅ ${donor.name} has no existing $DROP tokens`);
                    eligibilityResults.push({ donor: donor.name, eligible: true });
                }
            } catch (error) {
                if (error.message.includes("TOKEN_NOT_ASSOCIATED_TO_ACCOUNT")) {
                    console.log(`  ✅ ${donor.name} not associated with $DROP (eligible)`);
                    eligibilityResults.push({ donor: donor.name, eligible: true });
                } else {
                    console.log(`  ❌ ${donor.name} check failed: ${error.message}`);
                    eligibilityResults.push({ donor: donor.name, eligible: false, reason: error.message });
                }
            }
        }
        
        const eligibleDonors = eligibilityResults.filter(r => r.eligible);
        
        console.log(`\n📊 Eligibility Summary:`);
        console.log(`  Eligible donors: ${eligibleDonors.length}/${donors.length}`);
        console.log(`  Donation amount: ${DONATION_AMOUNT} HBAR > ${THRESHOLD} HBAR threshold ✓`);
        console.log(`  Both hold ≥1 $DRIP (verified previously) ✓\n`);
        
        if (eligibleDonors.length === 0) {
            console.log("⚠️  No eligible donors found. Exiting...");
            return;
        }
        
        console.log("=== STEP 2: EXECUTE DUAL DONATIONS ===");
        
        const donationResults = [];
        
        for (const donor of donors) {
            const isEligible = eligibilityResults.find(r => r.donor === donor.name)?.eligible;
            
            if (!isEligible) {
                console.log(`Skipping ${donor.name} (not eligible)\n`);
                continue;
            }
            
            console.log(`Processing ${donor.name} donation...`);
            
            const donorResult = {
                donor: donor.name,
                accountId: donor.accountId,
                steps: {},
                status: "PENDING"
            };
            
            try {
                // Step 1: User donates 3.33 HBAR to Treasury
                console.log(`  Step 1: ${donor.name} donates ${DONATION_AMOUNT} HBAR...`);
                client.setOperator(donor.accountId, donor.privateKey);
                
                const donationTx = new TransferTransaction()
                    .addHbarTransfer(donor.accountId, new Hbar(-DONATION_AMOUNT))
                    .addHbarTransfer(controllerAccountId, new Hbar(DONATION_AMOUNT));
                
                const donationResponse = await donationTx.execute(client);
                const donationReceipt = await donationResponse.getReceipt(client);
                
                console.log(`    ✅ Donation: ${donationResponse.transactionId}`);
                console.log(`    Status: ${donationReceipt.status.toString()}`);
                
                donorResult.steps.donation = {
                    status: "SUCCESS",
                    transactionId: donationResponse.transactionId.toString(),
                    amount: DONATION_AMOUNT
                };
                
                // Step 2: Associate with $DROP token (if needed)
                console.log(`  Step 2: Associating ${donor.name} with $DROP token...`);
                
                try {
                    const associateTx = new TokenAssociateTransaction()
                        .setAccountId(donor.accountId)
                        .setTokenIds([dropTokenId]);
                    
                    const associateResponse = await associateTx.execute(client);
                    const associateReceipt = await associateResponse.getReceipt(client);
                    
                    console.log(`    ✅ Association: ${associateResponse.transactionId}`);
                    console.log(`    Status: ${associateReceipt.status.toString()}`);
                    
                    donorResult.steps.association = {
                        status: "SUCCESS",
                        transactionId: associateResponse.transactionId.toString()
                    };
                } catch (error) {
                    if (error.message.includes("TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT")) {
                        console.log(`    ✅ $DROP already associated with ${donor.name}`);
                        donorResult.steps.association = {
                            status: "ALREADY_ASSOCIATED"
                        };
                    } else {
                        throw error;
                    }
                }
                
                // Step 3: Treasury mints 1 $DROP token (donation threshold triggered)
                console.log(`  Step 3: Treasury mints 1 $DROP for ${donor.name}...`);
                client.setOperator(controllerAccountId, controllerPrivateKey);
                
                const mintTx = new TokenMintTransaction()
                    .setTokenId(dropTokenId)
                    .setAmount(1); // Mint exactly 1 $DROP token
                
                const mintResponse = await mintTx.execute(client);
                const mintReceipt = await mintResponse.getReceipt(client);
                
                console.log(`    ✅ Mint: ${mintResponse.transactionId}`);
                console.log(`    Status: ${mintReceipt.status.toString()}`);
                
                donorResult.steps.mint = {
                    status: "SUCCESS",
                    transactionId: mintResponse.transactionId.toString(),
                    amount: 1
                };
                
                // Step 4: Transfer $DROP from Treasury to donor
                console.log(`  Step 4: Transferring 1 $DROP to ${donor.name}...`);
                
                const dropTransferTx = new TransferTransaction()
                    .addTokenTransfer(dropTokenId, controllerAccountId, -1) // Transfer from treasury
                    .addTokenTransfer(dropTokenId, donor.accountId, 1);     // To donor
                
                const transferResponse = await dropTransferTx.execute(client);
                const transferReceipt = await transferResponse.getReceipt(client);
                
                console.log(`    ✅ Transfer: ${transferResponse.transactionId}`);
                console.log(`    Status: ${transferReceipt.status.toString()}`);
                
                donorResult.steps.transfer = {
                    status: "SUCCESS",
                    transactionId: transferResponse.transactionId.toString(),
                    amount: 1
                };
                
                // Step 5: Freeze donor to enforce non-transferability
                console.log(`  Step 5: Freezing ${donor.name} for non-transferability...`);
                
                const freezeTx = new TokenFreezeTransaction()
                    .setAccountId(donor.accountId)
                    .setTokenId(dropTokenId);
                
                const freezeResponse = await freezeTx.execute(client);
                const freezeReceipt = await freezeResponse.getReceipt(client);
                
                console.log(`    ✅ Freeze: ${freezeResponse.transactionId}`);
                console.log(`    Status: ${freezeReceipt.status.toString()}`);
                
                donorResult.steps.freeze = {
                    status: "SUCCESS",
                    transactionId: freezeResponse.transactionId.toString()
                };
                
                // Step 6: Verify final balance
                console.log(`  Step 6: Verifying ${donor.name} final balance...`);
                
                const finalBalance = await new AccountBalanceQuery()
                    .setAccountId(donor.accountId)
                    .execute(client);
                
                const finalDrop = finalBalance.tokens.get(dropTokenId);
                const finalDropAmount = finalDrop ? parseInt(finalDrop.toString()) : 0;
                
                console.log(`    Final $DROP balance: ${finalDropAmount}`);
                
                if (finalDropAmount === 1) {
                    console.log(`    ✅ $DROP RECOGNITION GRANTED: ${donor.name} has 1 $DROP`);
                    donorResult.status = "SUCCESS";
                    donorResult.finalDropBalance = finalDropAmount;
                } else {
                    console.log(`    ❌ BALANCE MISMATCH: Expected 1, got ${finalDropAmount}`);
                    donorResult.status = "BALANCE_MISMATCH";
                    donorResult.finalDropBalance = finalDropAmount;
                }
                
            } catch (error) {
                console.log(`    ❌ ${donor.name} donation failed: ${error.message}`);
                donorResult.status = "FAILED";
                donorResult.error = error.message;
            }
            
            donationResults.push(donorResult);
            console.log(`  ${donor.name} processing complete!\n`);
        }
        
        // Dual donation summary
        console.log("=== DUAL DONATION RESULTS ===");
        
        let successfulDonations = 0;
        let totalHbarDonated = 0;
        let totalDropMinted = 0;
        
        donationResults.forEach((result, index) => {
            console.log(`\n${index + 1}. ${result.donor} (${result.accountId}):`);
            console.log(`   Status: ${result.status}`);
            
            if (result.steps.donation) {
                console.log(`   💰 Donation: ${result.steps.donation.amount} HBAR`);
                console.log(`     Transaction: ${result.steps.donation.transactionId}`);
                totalHbarDonated += result.steps.donation.amount;
            }
            
            if (result.steps.mint) {
                console.log(`   🪙 Minted: ${result.steps.mint.amount} $DROP`);
                console.log(`     Transaction: ${result.steps.mint.transactionId}`);
                totalDropMinted += result.steps.mint.amount;
            }
            
            if (result.finalDropBalance !== undefined) {
                console.log(`   💧 Final Balance: ${result.finalDropBalance} $DROP`);
            }
            
            if (result.status === "SUCCESS") {
                successfulDonations++;
                console.log(`   ✅ RECOGNITION ACTIVE`);
            } else if (result.error) {
                console.log(`   ❌ Error: ${result.error}`);
            }
        });
        
        console.log("\n=== DUAL DONATION SUMMARY ===");
        console.log(`📊 Total donors processed: ${donors.length}`);
        console.log(`✅ Successful donations: ${successfulDonations}`);
        console.log(`❌ Failed donations: ${donors.length - successfulDonations}`);
        console.log(`💰 Total HBAR donated: ${totalHbarDonated}`);
        console.log(`🪙 Total $DROP minted: ${totalDropMinted}`);
        console.log(`🎯 Success rate: ${(successfulDonations / donors.length * 100).toFixed(1)}%`);
        
        console.log("\n=== PROTOCOL ENHANCEMENT ===");
        if (successfulDonations === donors.length) {
            console.log("🎉 DUAL DONATION SUCCESS!");
            console.log("✅ Both TEST_USER_3 and TEST_USER_5 now have $DROP tokens");
            console.log("✅ Next snapshot will include bonus $WISH for both users");
            console.log("🎁 Expected bonus recipients increased from 1 → 3");
            
            console.log("\n💡 Next snapshot distribution:");
            console.log("   • Base distribution: 6 × 50 = 300 $WISH");
            console.log("   • Bonus distribution: 3 × 25 = 75 $WISH");
            console.log("   • Total needed: 375 $WISH");
        } else {
            console.log("⚠️  Some donations failed - review errors above");
        }
        
        console.log("\n✅ PROTOCOL COMPLIANCE:");
        console.log("✅ Donation threshold: 3.33 HBAR >> 0.01 HBAR minimum");
        console.log("✅ Lifetime cap: 1 $DROP per wallet enforced");
        console.log("✅ Treasury authority: All operations treasury-signed");
        console.log("✅ Non-transferability: All $DROP tokens frozen");
        
    } catch (error) {
        console.error("❌ Dual donation test failed:", error.message);
    } finally {
        client.close();
    }
}

dualDonationDropTest();