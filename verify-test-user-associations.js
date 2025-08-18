import { Client, AccountBalanceQuery, PrivateKey } from "@hashgraph/sdk";
import dotenv from "dotenv";
dotenv.config();

async function verifyTestUserAssociations() {
    console.log("=== VERIFYING TEST USER TOKEN ASSOCIATIONS ===\n");
    
    const client = Client.forTestnet();
    
    // Set operator
    const controllerAccountId = process.env.CONTROLLER_ACCOUNT_ID;
    const controllerPrivateKey = PrivateKey.fromString(process.env.CONTROLLER_PRIVATE_KEY);
    client.setOperator(controllerAccountId, controllerPrivateKey);
    
    // Protocol tokens
    const tokens = {
        WISH: process.env.WISH_TOKEN_ID,
        DRIP: process.env.DRIP_TOKEN_ID,
        DROP: process.env.DROP_TOKEN_ID
    };
    
    // All test users to verify
    const testUsers = [
        { name: "TEST_USER_1", id: process.env.TEST_USER_1_ACCOUNT_ID },
        { name: "TEST_USER_2", id: process.env.TEST_USER_2_ACCOUNT_ID },
        { name: "TEST_USER_3", id: process.env.TEST_USER_3_ACCOUNT_ID },
        { name: "TEST_USER_4", id: process.env.TEST_USER_4_ACCOUNT_ID },
        { name: "TEST_USER_5", id: process.env.TEST_USER_5_ACCOUNT_ID }
    ];
    
    try {
        console.log("Checking token associations and balances...\n");
        
        const verificationResults = [];
        
        for (const user of testUsers) {
            console.log(`=== ${user.name} (${user.id}) ===`);
            
            try {
                const balance = await new AccountBalanceQuery()
                    .setAccountId(user.id)
                    .execute(client);
                
                const userResult = {
                    name: user.name,
                    accountId: user.id,
                    tokens: {}
                };
                
                // Check each protocol token
                for (const [tokenName, tokenId] of Object.entries(tokens)) {
                    const tokenBalance = balance.tokens.get(tokenId);
                    const amount = tokenBalance ? tokenBalance.toString() : "0";
                    
                    console.log(`  $${tokenName}: ${amount} tokens`);
                    
                    userResult.tokens[tokenName] = {
                        associated: tokenBalance !== undefined,
                        balance: parseInt(amount)
                    };
                }
                
                // Check association status
                const allAssociated = Object.values(userResult.tokens).every(token => token.associated);
                userResult.fullyAssociated = allAssociated;
                
                if (allAssociated) {
                    console.log(`  ✅ FULLY ASSOCIATED: All protocol tokens`);
                } else {
                    const missing = Object.entries(userResult.tokens)
                        .filter(([_, token]) => !token.associated)
                        .map(([name, _]) => `$${name}`)
                        .join(', ');
                    console.log(`  ❌ MISSING: ${missing}`);
                }
                
                verificationResults.push(userResult);
                console.log();
                
            } catch (error) {
                console.log(`  ERROR: ${error.message}\n`);
                verificationResults.push({
                    name: user.name,
                    accountId: user.id,
                    error: error.message,
                    fullyAssociated: false
                });
            }
        }
        
        console.log("=== ASSOCIATION VERIFICATION SUMMARY ===");
        
        const fullyAssociatedUsers = verificationResults.filter(user => user.fullyAssociated);
        const partiallyAssociatedUsers = verificationResults.filter(user => !user.fullyAssociated && !user.error);
        const errorUsers = verificationResults.filter(user => user.error);
        
        console.log(`📊 Total users checked: ${testUsers.length}`);
        console.log(`✅ Fully associated: ${fullyAssociatedUsers.length}`);
        console.log(`⚠️  Partially associated: ${partiallyAssociatedUsers.length}`);
        console.log(`❌ Errors: ${errorUsers.length}`);
        
        if (fullyAssociatedUsers.length > 0) {
            console.log(`\n✅ READY FOR TESTING:`);
            fullyAssociatedUsers.forEach(user => {
                console.log(`   • ${user.name}: Can receive all protocol tokens`);
            });
        }
        
        if (partiallyAssociatedUsers.length > 0) {
            console.log(`\n⚠️  NEEDS ATTENTION:`);
            partiallyAssociatedUsers.forEach(user => {
                const missing = Object.entries(user.tokens)
                    .filter(([_, token]) => !token.associated)
                    .map(([name, _]) => `$${name}`)
                    .join(', ');
                console.log(`   • ${user.name}: Missing ${missing}`);
            });
        }
        
        console.log(`\n=== PROTOCOL TESTING READINESS ===`);
        
        // Check specifically for the newly associated users
        const newlyAssociatedUsers = ["TEST_USER_3", "TEST_USER_4", "TEST_USER_5"];
        const newUsersReady = newlyAssociatedUsers.every(userName => 
            fullyAssociatedUsers.some(user => user.name === userName)
        );
        
        if (newUsersReady) {
            console.log("🎉 SUCCESS: TEST_USER_3, 4, and 5 are fully prepared!");
            console.log("✅ All three users associated with $WISH, $DRIP, $DROP");
            console.log("✅ Ready for membership creation tests");
            console.log("✅ Ready for donation threshold tests");
            console.log("✅ Ready for daily snapshot participation");
        } else {
            console.log("⚠️  Some newly associated users may need attention");
        }
        
        console.log(`\n=== CURRENT PROTOCOL STATE ===`);
        
        // Show users with tokens for context
        const usersWithTokens = verificationResults.filter(user => 
            user.tokens && Object.values(user.tokens).some(token => token.balance > 0)
        );
        
        if (usersWithTokens.length > 0) {
            console.log("👤 Users with protocol tokens:");
            usersWithTokens.forEach(user => {
                const tokenSummary = Object.entries(user.tokens)
                    .filter(([_, token]) => token.balance > 0)
                    .map(([name, token]) => `${token.balance} $${name}`)
                    .join(', ');
                console.log(`   • ${user.name}: ${tokenSummary}`);
            });
        }
        
        console.log(`\n💡 Next testing possibilities:`);
        console.log(`   • Create memberships for TEST_USER_3, 4, 5 (1 HBAR → 1 $DRIP)`);
        console.log(`   • Test donation thresholds (> 0.01 HBAR → $DROP)`);
        console.log(`   • Run enhanced snapshots with more participants`);
        
    } catch (error) {
        console.error("❌ Verification failed:", error.message);
    } finally {
        client.close();
    }
}

verifyTestUserAssociations();