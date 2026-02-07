require('dotenv').config();
const { Web3 } = require('web3');
const registryArtifact = require('./build/contracts/CertificateRegistry.json');

const web3 = new Web3(process.env.ETH_RPC_URL || 'http://127.0.0.1:7545');

async function issueCertToBlockchain() {
    console.log('🔗 Connecting to Ganache...');
    
    const networkId = await web3.eth.net.getId();
    console.log('Network ID:', networkId);
    
    const deployedNetwork = registryArtifact.networks[networkId];
    if (!deployedNetwork) {
        console.error('❌ Contract not deployed! Run: npx truffle migrate --reset');
        process.exit(1);
    }
    
    const contract = new web3.eth.Contract(
        registryArtifact.abi,
        process.env.CONTRACT_ADDRESS || deployedNetwork.address
    );
    console.log('📜 Contract Address:', contract.options.address);
    
    const accounts = await web3.eth.getAccounts();
    console.log('💳 Using Account:', accounts[0]);
    
    // Issue test certificates
    const testCerts = [
        {
            certificateId: 'CERT-2025-001',
            rollNumber: '20BCS001',
            department: 'Computer Science',
            studentName: 'Test Student',
            courseName: 'B.Tech - Computer Science & Engineering',
            university: 'IEEE Xpert Global University'
        },
        {
            certificateId: 'CERT-TEST-001',
            rollNumber: '20BCS002',
            department: 'Computer Science',
            studentName: 'Demo User',
            courseName: 'Introduction to Blockchain',
            university: 'IEEE Xpert Global University'
        }
    ];
    
    for (const cert of testCerts) {
        console.log(`\n🎓 Issuing certificate: ${cert.certificateId}...`);
        
        try {
            // Check if already exists
            const existing = await contract.methods.verifyCertificate(cert.certificateId).call();
            if (existing.studentName) {
                console.log(`ℹ️ Certificate ${cert.certificateId} already exists on blockchain`);
                continue;
            }
        } catch (e) {
            // Not found, proceed to issue
        }
        
        try {
            const certHash = web3.utils.keccak256(cert.certificateId);
            
            const tx = await contract.methods.issueCertificate(
                cert.certificateId,
                cert.rollNumber,
                cert.department,
                cert.studentName,
                cert.courseName,
                cert.university,
                certHash
            ).send({ from: accounts[0], gas: 3000000 });
            
            console.log(`✅ SUCCESS! TX Hash: ${tx.transactionHash}`);
        } catch (err) {
            if (err.message.includes('already exists')) {
                console.log(`ℹ️ Certificate ${cert.certificateId} already exists`);
            } else {
                console.error(`❌ Error: ${err.message}`);
            }
        }
    }
    
    // Verify the certificates
    console.log('\n📋 Verifying certificates on blockchain...');
    for (const cert of testCerts) {
        try {
            const result = await contract.methods.verifyCertificate(cert.certificateId).call();
            console.log(`\n✅ ${cert.certificateId}:`);
            console.log(`   Student: ${result.studentName}`);
            console.log(`   Course: ${result.courseName}`);
            console.log(`   University: ${result.university}`);
            console.log(`   Roll Number: ${result.rollNumber}`);
        } catch (e) {
            console.log(`❌ ${cert.certificateId}: Not found - ${e.message}`);
        }
    }
    
    console.log('\n🎉 Done! Try verifying CERT-2025-001 or CERT-TEST-001');
    process.exit(0);
}

issueCertToBlockchain().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
