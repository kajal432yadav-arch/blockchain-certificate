const mongoose = require('mongoose');
require('dotenv').config();
const Certificate = require('./models/Certificate');

async function listCerts() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/blockchain_cert');
        console.log('Connected to MongoDB');

        const certs = await Certificate.find({});
        console.log(`Found ${certs.length} certificates:`);
        certs.forEach(c => {
            console.log(`- ID: ${c.certificateId}, Status: ${c.status}, TxHash: ${c.txHash || 'None'}`);
        });

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

listCerts();
