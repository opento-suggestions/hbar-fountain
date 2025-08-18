import { 
    Client, 
    TokenAssociateTransaction,
    PrivateKey
} from "@hashgraph/sdk";
import dotenv from "dotenv";
dotenv.config();

async function associateUsersWithWish() {
    console.log("=== ASSOCIATING TEST USERS WITH $WISH TOKEN ===\n");
    
    const client = Client.forTestnet();
    const wishTokenId = process.env.WISH_TOKEN_ID;
    
    // Users that need to associate with WISH
    const usersToAssociate = [
        { 
            name: "TEST_USER_1", 
            accountId: process.env.TEST_USER_1_ACCOUNT_ID,
            privateKey: PrivateKey.fromString(process.env.TEST_USER_1_PRIVATE_KEY)
        },
        { 
            name: "TEST_USER_2", 
            accountId: process.env.TEST_USER_2_ACCOUNT_ID,
            privateKey: PrivateKey.fromString(process.env.TEST_USER_2_PRIVATE_KEY)
        }
    ];
    
    try {
        for (const user of usersToAssociate) {
            console.log(`Associating ${user.name} (${user.accountId}) with $WISH token...`);
            
            // Set the user as operator for their own transaction
            client.setOperator(user.accountId, user.privateKey);
            
            try {
                const associateTx = new TokenAssociateTransaction()
                    .setAccountId(user.accountId)
                    .setTokenIds([wishTokenId]);
                
                const associateResponse = await associateTx.execute(client);
                const associateReceipt = await associateResponse.getReceipt(client);
                
                console.log(`✅ ${user.name} association successful: ${associateResponse.transactionId}`);
                console.log(`   Status: ${associateReceipt.status.toString()}\n`);
                
            } catch (error) {
                if (error.message.includes("TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT")) {
                    console.log(`✅ ${user.name} already associated with $WISH\n`);
                } else {
                    console.log(`❌ ${user.name} association failed: ${error.message}\n`);
                }
            }
        }
        
        console.log("=== ASSOCIATION COMPLETE ===");
        console.log("All test users are now ready to receive $WISH tokens!");
        
    } catch (error) {
        console.error("❌ Association process failed:", error.message);
    } finally {
        client.close();
    }
}

associateUsersWithWish();