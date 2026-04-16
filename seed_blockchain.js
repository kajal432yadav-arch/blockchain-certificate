require('dotenv').config();
const { Web3 } = require('web3');

async function getWeb3() {
    const ports = [7545, 8545];
    for (const port of ports) {
        try {
            const web3 = new Web3(`http://127.0.0.1:${port}`);
            await web3.eth.net.getId();
            return web3;
        } catch (e) {}
    }
    throw new Error('Could not connect to Ganache');
}

async function issueCertToBlockchain() {
    console.log('🔗 Connecting to Ganache...');
    const web3 = await getWeb3();
    
    // Always load fresh artifact
    const fs = require('fs');
    const path = require('path');
    const artifactPath = path.join(__dirname, 'build/contracts/CertificateRegistry.json');
    const registryArtifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

    try {
        const networkId = await web3.eth.net.getId();
        console.log('Network ID:', networkId);
        
        let deployedNetwork = registryArtifact.networks[networkId];
        let address = process.env.CONTRACT_ADDRESS || (deployedNetwork && deployedNetwork.address);

        // Ghost check
        if (address) {
            try {
                const tempContract = new web3.eth.Contract(registryArtifact.abi, address);
                await tempContract.methods.owner().call();
            } catch (e) {
                console.warn('⚠️ Ghost deployment in seeding. Resetting address...');
                address = null;
            }
        }

        if (!address) {
            console.log('🚀 Contract not deployed on this network. Deploying now during seeding...');
            const accounts = await web3.eth.getAccounts();
            const tempContract = new web3.eth.Contract(registryArtifact.abi);
            const deployTx = tempContract.deploy({ data: registryArtifact.bytecode });
            const deployedInstance = await deployTx.send({ from: accounts[0], gas: 3000000n });
            address = deployedInstance.options.address;
            console.log(`✅ Contract deployed at: ${address}`);
            
            // Save to artifact
            registryArtifact.networks[networkId] = { address };
            fs.writeFileSync(path.join(__dirname, 'build/contracts/CertificateRegistry.json'), JSON.stringify(registryArtifact, null, 2));
        }
        
        const contract = new web3.eth.Contract(registryArtifact.abi, address);
        console.log('📜 Contract Address:', contract.options.address);
        
        const accounts = await web3.eth.getAccounts();
        console.log('💳 Using Account:', accounts[0]);
        
        const testCerts = [
            {
                certificateId: 'CERT-I83WVQ7QS',
                rollNumber: 'MS-2025',
                department: 'Computer Science',
                studentName: 'Mukesh Sharma',
                courseName: 'Blockchain Engineering Specialization',
                university: 'IEEE Xpert Global University'
            },
            {
                certificateId: 'CERT-2025-001',
                rollNumber: '20BCS001',
                department: 'Computer Science',
                studentName: 'Test Student',
                courseName: 'B.Tech - Computer Science & Engineering',
                university: 'IEEE Xpert Global University'
            }
        ];
        
        for (const cert of testCerts) {
            try {
                // Check if already exists
                await contract.methods.verifyCertificate(cert.certificateId).call();
                console.log(`ℹ️ Certificate ${cert.certificateId} already exists on blockchain`);
            } catch (e) {
                // Not found, proceed to issue
                console.log(`🎓 Issuing certificate: ${cert.certificateId}...`);
                const certHash = web3.utils.keccak256(cert.certificateId);
                await contract.methods.issueCertificate(
                    cert.certificateId, cert.rollNumber, cert.department,
                    cert.studentName, cert.courseName, cert.university, certHash
                ).send({ from: accounts[0], gas: 3000000n });
                console.log(`✅ SUCCESS! ${cert.certificateId} issued.`);
            }
        }
    } catch (err) {
        console.error('❌ Blockchain Seeding Error:', err.message);
    }
}

module.exports = { issueCertToBlockchain };

// Run if called directly
if (require.main === module) {
    issueCertToBlockchain().then(() => process.exit(0)).catch(() => process.exit(1));
}
