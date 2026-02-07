const { Web3 } = require('web3');
require('dotenv').config();

const web3 = new Web3(process.env.ETH_RPC_URL || 'http://127.0.0.1:7545');

async function verifyTx() {
    const txHash = '0x00c48b985b6b930660c2f2dfeeb68a752da3a4668f1fb9638480f05676ac332';
    console.log(`Checking transaction: ${txHash}...`);

    try {
        const receipt = await web3.eth.getTransactionReceipt(txHash);
        if (receipt) {
            console.log('✅ Transaction found!');
            console.log('Status:', receipt.status ? 'Success' : 'Failed');
            console.log('Block Number:', receipt.blockNumber);
            console.log('Logs count:', receipt.logs.length);
        } else {
            console.log('❌ Transaction not found on this blockchain network.');
        }
    } catch (err) {
        console.error('❌ Error checking transaction:', err.message);
    }
}

verifyTx();
