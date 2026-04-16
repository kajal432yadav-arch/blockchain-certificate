const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

async function listUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/blockchain_cert');
        console.log('Connected to MongoDB');

        const users = await User.find({ role: 'student' });
        console.log(`Found ${users.length} students:`);
        users.forEach(u => {
            console.log(`- ID: ${u._id}, Name: ${u.name}, Roll: ${u.rollNumber}`);
        });

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

listUsers();
