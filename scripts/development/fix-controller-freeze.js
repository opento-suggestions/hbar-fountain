import { 
    Client, 
    TokenUnfreezeTransaction,
    PrivateKey
} from "@hashgraph/sdk";
import dotenv from "dotenv";
dotenv.config();

async function fixControllerFreeze() {
    console.log("=== UNFREEZING CONTROLLER FOR $DRIP TOKEN ===\n");
    
    const client = Client.forTestnet();
    
    // CONTROLLER has the freeze key, so it can unfreeze itself
    const controllerAccountId = process.env.CONTROLLER_ACCOUNT_ID;
    const controllerPrivateKey = PrivateKey.fromString(process.env.CONTROLLER_PRIVATE_KEY);
    const dripTokenId = process.env.DRIP_TOKEN_ID;
    
    client.setOperator(controllerAccountId, controllerPrivateKey);
    
    try {
        console.log(`Unfreezing CONTROLLER (${controllerAccountId}) for $DRIP token...`);
        
        const unfreezeTx = new TokenUnfreezeTransaction()
            .setAccountId(controllerAccountId)
            .setTokenId(dripTokenId);
        
        const unfreezeResponse = await unfreezeTx.execute(client);
        const unfreezeReceipt = await unfreezeResponse.getReceipt(client);
        
        console.log(`✅ Unfreeze successful!`);
        console.log(`Transaction ID: ${unfreezeResponse.transactionId}`);
        console.log(`Status: ${unfreezeReceipt.status.toString()}`);
        console.log(`CONTROLLER can now mint and hold $DRIP tokens\n`);
        
    } catch (error) {
        console.error("❌ Failed to unfreeze CONTROLLER:", error.message);
    } finally {
        client.close();
    }
}

fixControllerFreeze();