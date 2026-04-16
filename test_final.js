const { Web3 } = require('web3');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const web3 = new Web3(process.env.ETH_RPC_URL || 'http://127.0.0.1:7545');
const artifactPath = path.join(__dirname, 'build', 'contracts', 'CertificateRegistry.json');
const registryArtifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

async function check() {
    try {
        const networkId = await web3.eth.net.getId();
        const deployedNetwork = registryArtifact.networks[networkId];
        if (!deployedNetwork) {
            console.log('Contract not deployed on this network');
            process.exit(1);
        }

        const contract = new web3.eth.Contract(registryArtifact.abi, deployedNetwork.address);
        const certId = 'CERT-2025-001';
        
        try {
            const result = await contract.methods.verifyCertificate(certId).call();
            console.log(`✅ Certificate ${certId} FOUND on blockchain!`);
            console.log('Student:', result.studentName);
        } catch (err) {
            console.log(`❌ Certificate ${certId} NOT found.`);
        }
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

check();
