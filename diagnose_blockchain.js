const { Web3 } = require('web3');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const web3 = new Web3(process.env.ETH_RPC_URL || 'http://127.0.0.1:7545');
const artifactPath = path.join(__dirname, 'build', 'contracts', 'CertificateRegistry.json');
const registryArtifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

async function checkState() {
    try {
        const networkId = await web3.eth.net.getId();
        console.log('Network ID:', networkId);
        
        const deployedNetwork = registryArtifact.networks[networkId];
        if (!deployedNetwork) {
            console.log('No deployment found in artifact for this network ID.');
            return;
        }
        console.log('Contract Address from Artifact:', deployedNetwork.address);
        console.log('Contract Address from .env:', process.env.CONTRACT_ADDRESS);

        const contract = new web3.eth.Contract(registryArtifact.abi, deployedNetwork.address);

        const certId = 'CERT-TEST-001';
        console.log(`Checking certificate: ${certId}...`);

        try {
            const result = await contract.methods.verifyCertificate(certId).call();
            console.log('✅ Certificate found!');
            console.log('Result:', result);
        } catch (err) {
            console.log('❌ Certificate NOT found or contract reverted.');
            console.log('Error:', err.message);
        }

        const owner = await contract.methods.owner().call();
        console.log('Contract Owner:', owner);
        
        const accounts = await web3.eth.getAccounts();
        console.log('Available Accounts:', accounts.slice(0, 3));

    } catch (err) {
        console.error('❌ Diagnostic Error:', err.message);
    }
}

checkState();
