import { Client, AccountId, PrivateKey, TopicCreateTransaction } from '@hashgraph/sdk';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

async function createSnapshotTopic() {
    const operatorId = AccountId.fromString(process.env.OPERATOR_ID);
    const operatorKey = PrivateKey.fromStringED25519(process.env.OPERATOR_KEY);

    const client = Client.forTestnet();
    client.setOperator(operatorId, operatorKey);
    
    console.log("Creating HCS topic for Fountain Protocol snapshots...");
    
    const topicCreateTx = await new TopicCreateTransaction()
        .setTopicMemo("Fountain Protocol Daily Snapshots")
        .setAdminKey(operatorKey.publicKey)
        .setSubmitKey(operatorKey.publicKey)
        .execute(client);
    
    const receipt = await topicCreateTx.getReceipt(client);
    const topicId = receipt.topicId;
    
    console.log(`✅ HCS Topic created! Topic ID: ${topicId}`);
    console.log(`📋 Complete Fountain Protocol Infrastructure:`);
    console.log(`   💧 $DRIP Token: 0.0.6590960`);
    console.log(`   ✨ $WISH Token: 0.0.6590974`);
    console.log(`   🎁 $DROP Token: 0.0.6590982`);
    console.log(`   📡 HCS Topic: ${topicId}`);
    
    return topicId;
}

createSnapshotTopic().catch(console.error);