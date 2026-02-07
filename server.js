require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const { MongoMemoryServer } = require('mongodb-memory-server');

const authRoutes = require('./routes/auth');
const certificateRoutes = require('./routes/certificate');

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

app.use('/api/auth', authRoutes);
app.use('/api/certificates', certificateRoutes);

// Catch-all 404 for API routes to prevent HTML responses
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('SERVER ERROR:', err);
    if (err.name === 'MulterError') {
        return res.status(400).json({ error: 'File Upload Error: ' + err.message });
    }
    res.status(500).json({ error: err.message || 'Internal Server Error' });
});

async function startServer() {
    console.log('--- Starting Server Initialization ---');
    try {
        console.log('Attempting to connect to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 2000
        });
        console.log('✅ Connected to MongoDB');
    } catch (err) {
        console.log('⚠️ Local MongoDB failed, using Memory Server...');
        try {
            const path = require('path');
            const fs = require('fs');
            
            // Clean up previous temp dir to ensure fresh state
            const dbPath = path.join(__dirname, '.mongo_temp');
            if (fs.existsSync(dbPath)) {
                try {
                    fs.rmSync(dbPath, { recursive: true, force: true });
                } catch (e) {
                    console.log('Note: Could not clean old db path, continuing...');
                }
            }
            // Ensure directory exists
            if (!fs.existsSync(dbPath)) {
                fs.mkdirSync(dbPath, { recursive: true });
            }

            const mongod = await MongoMemoryServer.create({
                instance: {
                    dbPath: dbPath,
                    storageEngine: 'wiredTiger'
                }
            });
            const uri = mongod.getUri();
            await mongoose.connect(uri);
            console.log('✅ Connected to In-Memory MongoDB');
        } catch (memErr) {
            console.error('❌ Failed to start Memory Server:', memErr);
            process.exit(1);
        }
    }

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });

    // Seed test accounts immediately
    try {
        const User = require('./models/User');
        const count = await User.countDocuments();
        console.log(`📊 Current user count: ${count}`);

        const testAccounts = [
            { name: 'Admin User', email: 'admin@gmail.com', password: 'password123', role: 'admin' },
            { name: 'Test Student', email: 'student@example.com', password: 'password123', role: 'student', rollNumber: 'ABC123', department: 'CSE' },
            { name: 'Test Verifier', email: 'verifier@example.com', password: 'password123', role: 'verifier' }
        ];

        for (const account of testAccounts) {
            const exists = await User.findOne({ email: account.email });
            if (!exists) {
                console.log(`🌱 Seeding ${account.role}: ${account.email}...`);
                await new User(account).save();
                console.log(`✅ ${account.email} created.`);
            } else {
                console.log(`ℹ️ ${account.email} already exists.`);
            }
        }
        // Seed sample certificate for testing
        const student = await User.findOne({ email: 'student@example.com' });
        if (student) {
            const Certificate = require('./models/Certificate');
            const certExists = await Certificate.findOne({ studentId: student._id });
            if (!certExists) {
                console.log('🌱 Seeding sample certificate for student...');
                await new Certificate({
                    certificateId: 'CERT-2025-001',
                    studentId: student._id,
                    rollNumber: student.rollNumber || '20BCS001',
                    department: student.department || 'Computer Science',
                    studentName: student.name,
                    courseName: 'B.Tech - Computer Science & Engineering',
                    university: 'IEEE Xpert Global University',
                    txHash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
                    qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJQAAACUCAYAAAB1Y170AAAACXBIWXMAAAsTAAALEwEAmpwYAAABNklEQVR4nO3S0Q0AIAzEwP2X7h6M4AnpL8mBfWtmZpZp5v0AA0M9A6GeAVDPQKhnoE89A6GeAVDPQKhnoE89A6GeAVDPQKhnoE89A6GeAVDPQKhnoE89A6GeAVDPQKhnoE89A6GeAVDPQKhnoE89A6GeAVDPQKhnoE89A6GeAVDPQKhnoE89A6GeAVDPQKhnoE89A6GeAVDPQKhnoE89A6GeAVDPQKhnoE89A6GeAVDPQKhnoE89A6GeAVDPQKhnoE89A6GeAVDPQKhnoE89A6GeAVDPQKhnoE89A6GeAVDPQKhnoE89A6GeAVDPQKhnoE89A6GeAVDPQKhnoE89A6GeAVDPQKhnoE89A6GeAVDPQKhnoE89A6GeAVDPQKhnoE89A6GeAVDPQKhnoD89A6GeAVDPQKhnoE89A6GeAVDPQMgD2X4AnrByfYoAAAAASUVORK5CYII=', // Placeholder valid-ish QR
                    issueDate: new Date(),
                    photoUrl: '/uploads/student.png'
                }).save();
                console.log('✅ Sample certificate created.');
            }
        }
        console.log('--- Database Initialization Complete ---');
    } catch (seedErr) {
        console.error('❌ Seeding Error:', seedErr);
    }
}

startServer().catch(err => {
    console.error('❌ Global Startup Error:', err);
});
