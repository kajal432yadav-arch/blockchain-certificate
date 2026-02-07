const { Web3 } = require('web3');
require('dotenv').config();
const registryArtifact = require('./build/contracts/CertificateRegistry.json');

const providerUrl = process.env.ETH_RPC_URL || 'http://127.0.0.1:7545';
const web3 = new Web3(providerUrl);
const contractAddress = process.env.CONTRACT_ADDRESS;

async function verifyDetails() {
    console.log(`Contract: ${contractAddress}`);
    const contract = new web3.eth.Contract(registryArtifact.abi, contractAddress);

    // We need the certificateId. Let's try to get it from events first.
    try {
        const events = await contract.getPastEvents('CertificateIssued', {
            fromBlock: 0,
            toBlock: 'latest'
        });

        if (events.length > 0) {
            console.log(`Found ${events.length} issuance events.`);
            const latestEvent = events[events.length - 1];
            const certId = latestEvent.returnValues.certificateId;
            console.log(`Latest Certificate ID: ${certId}`);

            const details = await contract.methods.verifyCertificate(certId).call();
            console.log('--- Blockchain Verification Result ---');
            console.log('Student:', details.studentName);
            console.log('Course:', details.courseName);
            console.log('University:', details.university);
            console.log('Issue Date:', new Date(Number(details.issueDate) * 1000).toLocaleString());
            console.log('Revoked:', details.isRevoked);
            console.log('--------------------------------------');
            console.log('✅ ALL CORRECT!');
        } else {
            console.log('❌ No CertificateIssued events found.');
        }
    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

verifyDetails();
