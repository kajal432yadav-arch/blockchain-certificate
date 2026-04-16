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

app.get('/download-csv', async (req, res) => {
    try {
        const User = require('./models/User');
        const students = await User.find({ role: 'student' });
        let csvContent = 'rollNumber,courseName,university\n';
        students.forEach(s => {
            csvContent += `${s.rollNumber || 'NO_ROLL'},Blockchain Engineering Specialization,IEEE Xpert Global University\n`;
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=all_students_batch.csv');
        res.send(csvContent);
    } catch (err) {
        res.status(500).send('Error generating CSV');
    }
});

app.use('/api/auth', authRoutes);
app.use('/api/certificates', certificateRoutes);

app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
    console.error('SERVER ERROR:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 8000;

async function startServer() {
    console.log('--- Starting Background Initialization ---');
    if (!process.env.MONGODB_URI) {
        console.log('⚠️ MONGODB_URI missing. Running in MOCK MODE for Vercel.');
        return;
    }

    try {
        console.log('Attempting to connect to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI, { 
            serverSelectionTimeoutMS: 5000,
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connected to MongoDB');
    } catch (err) {
        console.log('❌ MongoDB Connection Failed:', err.message);
        console.log('⚠️ Running in MOCK MODE.');
    }

    // Seeding part (only if DB is connected)
    if (mongoose.connection.readyState === 1) {
        try {
            const User = require('./models/User');
            const count = await User.countDocuments();
            if (count === 0) {
                console.log('🌱 Seeding initial records...');
                const testAccounts = [
                    { name: 'Admin User', email: 'admin@gmail.com', password: 'password123', role: 'admin' },
                    { name: 'Test Student', email: 'student@example.com', password: 'password123', role: 'student', rollNumber: 'ABC123' }
                ];
                for (const account of testAccounts) {
                    await new User(account).save();
                }
            }
        } catch (err) {
            console.error('❌ Seeding Error:', err.message);
        }
    }
}

// Start server only if not in a serverless environment (like Vercel)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`🚀 SERVER RUNNING ON PORT ${PORT}`);
        startServer().catch(err => console.error('BG Error:', err));
    });
} else {
    // In Vercel, we just initialize the background tasks
    startServer().catch(err => console.error('Serverless Init Error:', err));
}

// Export for Vercel
module.exports = app;
