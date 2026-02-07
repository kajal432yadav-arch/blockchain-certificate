const { Web3 } = require('web3');
const web3 = new Web3('http://127.0.0.1:7545');

async function check() {
    try {
        const accounts = await web3.eth.getAccounts();
        console.log('First Account:', accounts[0]);
    } catch (e) {
        console.error(e);
    }
}
check();
