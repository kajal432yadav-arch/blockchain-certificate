const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const router = express.Router();

// Middleware to verify JWT
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role, walletAddress, rollNumber, department, year, finalGrade, cgpa } = req.body;
        const user = new User({ 
            name, email, password, role, walletAddress, rollNumber, department, year, finalGrade, cgpa 
        });
        await user.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        if (err.code === 11000) {
            const field = Object.keys(err.keyPattern)[0];
            return res.status(400).json({ error: `${field === 'email' ? 'Email' : 'Roll Number'} already exists.` });
        }
        res.status(400).json({ error: err.message });
    }
});

// Login - supports both email and roll number
router.post('/login', async (req, res) => {
    try {
        const { email, password, rollNumber } = req.body;
        
        let user;
        if (rollNumber) {
            // Login with roll number (for students)
            user = await User.findOne({ rollNumber });
        } else if (email) {
            // Login with email (for admins or students)
            user = await User.findOne({ email });
        }
        
        if (!user) {
            return res.status(401).json({ error: 'User not found. Please check your credentials.' });
        }
        
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid password.' });
        }
        
        const token = jwt.sign(
            { id: user._id, role: user.role }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1d' }
        );
        
        res.json({ 
            token, 
            user: { 
                id: user._id, 
                name: user.name, 
                email: user.email,
                role: user.role,
                rollNumber: user.rollNumber,
                department: user.department,
                year: user.year,
                finalGrade: user.finalGrade,
                cgpa: user.cgpa
            } 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all students (for admin dropdown)
router.get('/students', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        const students = await User.find({ role: 'student' })
            .select('name email rollNumber department year finalGrade cgpa')
            .sort({ name: 1 });
            
        res.json(students);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get current user profile
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
