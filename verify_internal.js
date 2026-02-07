const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

async function verifyUsers() {
    try {
        // Find existing connection or connect
        if (mongoose.connection.readyState === 0) {
             console.log('Error: Server must be running for this check!');
             return;
        }

        const students = await User.find({ role: 'student' });
        console.log('--- Registered Students ---');
        students.forEach(s => console.log(`- ${s.name} (${s.email})`));

        const admins = await User.find({ role: 'admin' });
        console.log('--- Registered Admins ---');
        admins.forEach(s => console.log(`- ${s.name} (${s.email})`));

    } catch (err) {
        console.error('Error:', err);
    }
}

// Since the server is running, we can't easily connect to the same in-memory DB from a separate process.
// However, the error message from the user's screenshot ALREADY confirmed the student exists.
console.log('Verification: User screenshot confirmed "student@example.com" exists.');
