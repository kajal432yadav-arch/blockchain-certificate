const { Web3 } = require('web3');

async function checkPorts() {
    const ports = [7545, 8545];
    for (const port of ports) {
        try {
            const web3 = new Web3(`http://127.0.0.1:${port}`);
            await web3.eth.getChainId();
            console.log(`✅ Ganache is running on port ${port}`);
        } catch (err) {
            console.log(`❌ No Ganache on port ${port}`);
        }
    }
}

checkPorts();
