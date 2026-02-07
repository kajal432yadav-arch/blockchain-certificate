const { Web3 } = require('web3');
require('dotenv').config();

const providerUrl = process.env.ETH_RPC_URL || 'http://127.0.0.1:7545';
const web3 = new Web3(providerUrl);

async function listRecent() {
    try {
        const blockNumber = await web3.eth.getBlockNumber();
        console.log(`Current Block: ${blockNumber.toString()}`);

        const startBlock = blockNumber > 10n ? blockNumber - 10n : 0n;

        for (let i = blockNumber; i >= startBlock; i--) {
            const block = await web3.eth.getBlock(i, true);
            if (block.transactions.length > 0) {
                console.log(`--- Block ${i.toString()} ---`);
                block.transactions.forEach(tx => {
                    console.log(`TX Hash: ${tx.hash}`);
                    console.log(`From: ${tx.from}`);
                    console.log(`To: ${tx.to}`);
                    console.log('---');
                });
            }
        }
    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

listRecent();
