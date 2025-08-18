import dotenv from 'dotenv';

dotenv.config();

console.log('Testing environment variables:');
console.log('OPERATOR_ACCOUNT_ID:', process.env.OPERATOR_ACCOUNT_ID);
console.log('OPERATOR_PRIVATE_KEY:', process.env.OPERATOR_PRIVATE_KEY ? '***' : 'undefined');
console.log('Current working directory:', process.cwd());