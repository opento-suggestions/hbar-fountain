import { Client, AccountId, PrivateKey, AccountBalanceQuery } from '@hashgraph/sdk';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

async function main() {
    const operatorId = AccountId.fromString(process.env.OPERATOR_ID);
    const operatorKey = PrivateKey.fromStringED25519(process.env.OPERATOR_KEY);

    const client = Client.forTestnet();
    client.setOperator(operatorId, operatorKey);
    
    const balance = await new AccountBalanceQuery()
        .setAccountId(operatorId)
        .execute(client);
    
    console.log(`Your account has ${balance.hbars} HBAR!`);
}

main().catch(console.error);