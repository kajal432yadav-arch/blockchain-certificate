const { Web3 } = require('web3');
require('dotenv').config();

const providerUrl = process.env.ETH_RPC_URL || 'http://127.0.0.1:7545';
console.log(`Connecting to: ${providerUrl}`);
const web3 = new Web3(providerUrl);

async function verifyTx() {
    const txHash = '0x00c48b985b6b930660c2f2dfeeb68a752da3a4668f1fb9638480f05676ac332';
    console.log(`Checking transaction: ${txHash}...`);

    try {
        const receipt = await web3.eth.getTransactionReceipt(txHash);
        if (receipt) {
            console.log('✅ Transaction found!');
            console.log(JSON.stringify(receipt, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));
        } else {
            console.log('❌ Transaction not found. Check if Ganache is running and the TX hash is correct.');
        }
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

verifyTx();
