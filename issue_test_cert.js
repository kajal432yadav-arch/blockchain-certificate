const { Web3 } = require('web3');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const web3 = new Web3(process.env.ETH_RPC_URL || 'http://127.0.0.1:7545');
const artifactPath = path.join(__dirname, 'build', 'contracts', 'CertificateRegistry.json');
const registryArtifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

async function issueTestCert() {
    try {
        const accounts = await web3.eth.getAccounts();
        const networkId = await web3.eth.net.getId();
        const deployedNetwork = registryArtifact.networks[networkId];
        
        if (!deployedNetwork) {
            throw new Error('Contract not deployed on this network');
        }

        const contract = new web3.eth.Contract(registryArtifact.abi, deployedNetwork.address);

        const certId = 'CERT-TEST-001';
        console.log(`Issuing certificate: ${certId}...`);

        await contract.methods.issueCertificate(
            certId,
            'John Doe',
            'Blockchain Foundations',
            'BlockCertify Academy',
            web3.utils.keccak256(certId)
        ).send({ from: accounts[0], gas: 3000000 });

        console.log('✅ Certificate issued successfully!');
        console.log('ID:', certId);
    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

issueTestCert();
