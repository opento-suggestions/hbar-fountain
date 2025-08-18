import { 
    Client, 
    TokenAssociateTransaction,
    PrivateKey
} from "@hashgraph/sdk";
import dotenv from "dotenv";
dotenv.config();

async function associateTestUsersAllTokens() {
    console.log("=== ASSOCIATING TEST_USER_3, 4, 5 WITH ALL PROTOCOL TOKENS ===\n");
    console.log("🎯 Preparing accounts for future testing");
    console.log("🪙 Tokens: $WISH, $DRIP, $DROP");
    console.log("👤 Users: TEST_USER_3, TEST_USER_4, TEST_USER_5\n");
    
    const client = Client.forTestnet();
    
    // Protocol token IDs
    const wishTokenId = process.env.WISH_TOKEN_ID;
    const dripTokenId = process.env.DRIP_TOKEN_ID;
    const dropTokenId = process.env.DROP_TOKEN_ID;
    
    const protocolTokens = [
        { name: "$WISH", id: wishTokenId },
        { name: "$DRIP", id: dripTokenId },
        { name: "$DROP", id: dropTokenId }
    ];
    
    // Test users to associate
    const testUsers = [
        { 
            name: "TEST_USER_3", 
            accountId: process.env.TEST_USER_3_ACCOUNT_ID,
            privateKey: PrivateKey.fromString(process.env.TEST_USER_3_PRIVATE_KEY)
        },
        { 
            name: "TEST_USER_4", 
            accountId: process.env.TEST_USER_4_ACCOUNT_ID,
            privateKey: PrivateKey.fromString(process.env.TEST_USER_4_PRIVATE_KEY)
        },
        { 
            name: "TEST_USER_5", 
            accountId: process.env.TEST_USER_5_ACCOUNT_ID,
            privateKey: PrivateKey.fromString(process.env.TEST_USER_5_PRIVATE_KEY)
        }
    ];
    
    try {
        const associationResults = [];
        
        for (const user of testUsers) {
            console.log(`=== ASSOCIATING ${user.name} (${user.accountId}) ===`);
            
            // Set the user as operator for their own association transactions
            client.setOperator(user.accountId, user.privateKey);
            
            const userResults = {
                user: user.name,
                accountId: user.accountId,
                associations: []
            };
            
            // Associate with all protocol tokens
            for (const token of protocolTokens) {
                console.log(`  Associating with ${token.name} (${token.id})...`);
                
                try {
                    const associateTx = new TokenAssociateTransaction()
                        .setAccountId(user.accountId)
                        .setTokenIds([token.id]);
                    
                    const associateResponse = await associateTx.execute(client);
                    const associateReceipt = await associateResponse.getReceipt(client);
                    
                    console.log(`    ✅ Success: ${associateResponse.transactionId}`);
                    console.log(`    Status: ${associateReceipt.status.toString()}`);
                    
                    userResults.associations.push({
                        token: token.name,
                        tokenId: token.id,
                        status: "SUCCESS",
                        transactionId: associateResponse.transactionId.toString()
                    });
                    
                } catch (error) {
                    if (error.message.includes("TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT")) {
                        console.log(`    ✅ Already associated with ${token.name}`);
                        userResults.associations.push({
                            token: token.name,
                            tokenId: token.id,
                            status: "ALREADY_ASSOCIATED",
                            transactionId: null
                        });
                    } else {
                        console.log(`    ❌ Failed: ${error.message}`);
                        userResults.associations.push({
                            token: token.name,
                            tokenId: token.id,
                            status: "FAILED",
                            error: error.message
                        });
                    }
                }
            }
            
            associationResults.push(userResults);
            console.log(`  ${user.name} association complete!\n`);
        }
        
        // Summary report
        console.log("=== ASSOCIATION SUMMARY REPORT ===");
        
        let totalSuccessful = 0;
        let totalAlreadyAssociated = 0;
        let totalFailed = 0;
        
        associationResults.forEach((userResult, index) => {
            console.log(`\n${index + 1}. ${userResult.user} (${userResult.accountId}):`);
            
            userResult.associations.forEach(assoc => {
                const statusIcon = assoc.status === "SUCCESS" ? "✅" : 
                                 assoc.status === "ALREADY_ASSOCIATED" ? "✅" : "❌";
                
                console.log(`   ${statusIcon} ${assoc.token}: ${assoc.status}`);
                
                if (assoc.transactionId) {
                    console.log(`     Transaction: ${assoc.transactionId}`);
                }
                
                if (assoc.status === "SUCCESS") totalSuccessful++;
                else if (assoc.status === "ALREADY_ASSOCIATED") totalAlreadyAssociated++;
                else totalFailed++;
            });
        });
        
        const totalOperations = testUsers.length * protocolTokens.length;
        
        console.log("\n=== FINAL STATISTICS ===");
        console.log(`📊 Total operations: ${totalOperations}`);
        console.log(`✅ New associations: ${totalSuccessful}`);
        console.log(`✅ Already associated: ${totalAlreadyAssociated}`);
        console.log(`❌ Failed: ${totalFailed}`);
        console.log(`🎯 Success rate: ${((totalSuccessful + totalAlreadyAssociated) / totalOperations * 100).toFixed(1)}%`);
        
        console.log("\n=== PROTOCOL READINESS ===");
        if (totalFailed === 0) {
            console.log("🎉 ALL TEST USERS READY FOR PROTOCOL TESTING!");
            console.log("✅ TEST_USER_3: Associated with $WISH, $DRIP, $DROP");
            console.log("✅ TEST_USER_4: Associated with $WISH, $DRIP, $DROP"); 
            console.log("✅ TEST_USER_5: Associated with $WISH, $DRIP, $DROP");
            console.log("\n💡 These accounts can now:");
            console.log("   • Receive $DRIP tokens (when they create memberships)");
            console.log("   • Receive $WISH tokens (in daily snapshots)");
            console.log("   • Receive $DROP tokens (when they donate > 0.01 HBAR)");
            console.log("   • Participate in all protocol testing scenarios");
        } else {
            console.log("⚠️  Some associations failed - review errors above");
        }
        
    } catch (error) {
        console.error("❌ Association process failed:", error.message);
    } finally {
        client.close();
    }
}

associateTestUsersAllTokens();