const { Web3 } = require('web3');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function run() {
    let result = "--- FINAL DIAGNOSIS ---\n";
    result += `Time: ${new Date().toISOString()}\n`;
    
    const ports = [7545, 8545];
    for (const port of ports) {
        try {
            const web3 = new Web3(`http://127.0.0.1:${port}`);
            const networkId = await web3.eth.net.getId();
            result += `Port ${port}: CONNECTED (Network ID: ${networkId})\n`;
            
            const accounts = await web3.eth.getAccounts();
            result += ` - Accounts: ${accounts.length}\n`;
            
            const artifactPath = path.join(__dirname, 'build', 'contracts', 'CertificateRegistry.json');
            if (fs.existsSync(artifactPath)) {
                const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
                const deployed = artifact.networks[networkId];
                if (deployed) {
                    result += ` - Contract Deployed: YES (${deployed.address})\n`;
                    const contract = new web3.eth.Contract(artifact.abi, deployed.address);
                    
                    try {
                        const owner = await contract.methods.owner().call();
                        result += ` - Contract Owner check: SUCCESS (${owner})\n`;
                        
                        const certId = 'CERT-2025-001';
                        try {
                            const cert = await contract.methods.verifyCertificate(certId).call();
                            result += ` - Certificate ${certId}: FOUND (Student: ${cert.studentName})\n`;
                        } catch (e) {
                            result += ` - Certificate ${certId}: NOT FOUND (${e.message})\n`;
                        }
                    } catch (e) {
                        result += ` - Contract Call Error: ${e.message}\n`;
                    }
                } else {
                    result += ` - Contract Deployed: NO\n`;
                }
            } else {
                result += ` - Artifact missing: ${artifactPath}\n`;
            }
        } catch (e) {
            result += `Port ${port}: FAILED (${e.message})\n`;
        }
    }
    
    fs.writeFileSync('DIAGNOSE_RESULT.txt', result);
}

run();
