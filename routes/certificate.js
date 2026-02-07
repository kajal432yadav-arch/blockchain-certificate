const express = require('express');
const { Web3 } = require('web3');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Certificate = require('../models/Certificate');
const User = require('../models/User');
const router = express.Router();
const registryArtifact = require('../build/contracts/CertificateRegistry.json');
const { authMiddleware, isAdmin } = require('./middleware');
const QRCode = require('qrcode');
const crypto = require('crypto');

const web3 = new Web3(process.env.ETH_RPC_URL);

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only .png, .jpg, .jpeg and .pdf files are allowed!'));
    }
});


// Get Pending Requests
router.get('/pending', authMiddleware, isAdmin, async (req, res) => {
    try {
        const certs = await Certificate.find({ status: 'pending' }).populate('studentId', 'name email');
        res.json(certs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Toggle Privacy (Selective Disclosure)
router.post('/privacy-toggle/:id', authMiddleware, async (req, res) => {
    try {
        const cert = await Certificate.findOne({ _id: req.params.id, studentId: req.user.id });
        if (!cert) return res.status(404).json({ error: 'Certificate not found' });
        
        cert.isPrivate = !cert.isPrivate;
        await cert.save();
        res.json({ message: 'Privacy mode updated', isPrivate: cert.isPrivate });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Approve & Mint (Dual-Key Governance)
router.post('/approve/:id', authMiddleware, isAdmin, async (req, res) => {
    try {
        const cert = await Certificate.findById(req.params.id);
        if (!cert || cert.status !== 'pending') return res.status(404).json({ error: 'Request not found' });

        const realCertId = 'CERT-' + Math.random().toString(36).substr(2, 9).toUpperCase();
        
        // Generate simulated IPFS CID for decentralized resilience
        const ipfsCid = "Qm" + crypto.createHash('sha256').update(realCertId).digest('hex').substring(0, 44);

        const contract = await getContract();
        const accounts = await web3.eth.getAccounts();

        // Final Minting
        const tx = await contract.methods.issueCertificate(
            realCertId, cert.rollNumber || 'N/A', cert.department || 'General', 
            cert.studentName, cert.courseName, cert.university, web3.utils.keccak256(realCertId)
        ).send({ from: accounts[0], gas: 3000000 });

        const verifyUrl = `${req.protocol}://${req.get('host')}/verifier/verify.html?id=${realCertId}`;
        const qrCodeDataUri = await QRCode.toDataURL(verifyUrl);

        cert.certificateId = realCertId;
        cert.txHash = tx.transactionHash;
        cert.qrCode = qrCodeDataUri;
        cert.ipfsCid = ipfsCid;
        cert.status = 'approved';
        cert.issueDate = Date.now();
        await cert.save();

        res.json({ message: 'Minted to Blockchain', certificateId: realCertId, txHash: tx.transactionHash });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Contract instance (needs to be initialized after deployment)
// Contract instance
const getContract = async () => {
    const address = process.env.CONTRACT_ADDRESS;
    if (!address) {
        const networkId = await web3.eth.net.getId();
        const deployedNetwork = registryArtifact.networks[networkId];
        return new web3.eth.Contract(
            registryArtifact.abi,
            deployedNetwork && deployedNetwork.address
        );
    }
    return new web3.eth.Contract(registryArtifact.abi, address);
};

// Issue Certificate (with file uploads)
router.post('/issue', authMiddleware, isAdmin, upload.fields([
    { name: 'certificate', maxCount: 1 },
    { name: 'photo', maxCount: 1 }
]), async (req, res) => {
    try {
        const { studentId, rollNumber, courseName, university, department, year, grade, cgpa, requestOnly } = req.body;
        
        const student = await User.findById(studentId);
        if (!student) return res.status(404).json({ error: 'Student not found' });

        const studentName = student.name;
        const studentRollNumber = rollNumber || student.rollNumber || 'N/A';
        const studentDepartment = department || student.department || 'General';

        // Handle file uploads
        let photoPath = null;
        let certFilePath = null;
        
        if (req.files?.photo?.[0]) {
            photoPath = '/uploads/' + req.files.photo[0].filename;
        }
        if (req.files?.certificate?.[0]) {
            certFilePath = '/uploads/' + req.files.certificate[0].filename;
        }

        const certificateId = 'CERT-' + Math.random().toString(36).substr(2, 9).toUpperCase();

        if (requestOnly === 'true' || requestOnly === true) {
            const pendingId = 'PEND-' + Math.random().toString(36).substr(2, 9).toUpperCase();
            const certificate = new Certificate({ 
                certificateId: pendingId, 
                studentId, 
                studentName, 
                courseName: courseName || 'Bachelor of Technology',
                university: university || 'IEEE University',
                rollNumber: studentRollNumber, 
                department: studentDepartment,
                year,
                grade,
                cgpa,
                photoUrl: photoPath,
                certFileUrl: certFilePath,
                status: 'pending', 
                txHash: 'AWAITING_GOVERNANCE', 
                qrCode: 'AWAITING_MINT'
            });
            await certificate.save();
            return res.status(201).json({ message: 'Requested successfully', certificateId: pendingId });
        }

        // Save to MongoDB first
        const certificate = new Certificate({ 
            certificateId, 
            studentId, 
            studentName, 
            courseName: courseName || 'Bachelor of Technology',
            university: university || 'IEEE University',
            rollNumber: studentRollNumber, 
            department: studentDepartment,
            year,
            grade,
            cgpa,
            photoUrl: photoPath,
            certFileUrl: certFilePath,
            status: 'approved'
        });
        await certificate.save();

        // Interact with Blockchain
        const contract = await getContract();
        const accounts = await web3.eth.getAccounts();
        
        // Use the first account as issuer (admin)
        const tx = await contract.methods.issueCertificate(
            certificateId, studentRollNumber, studentDepartment, studentName, 
            courseName || 'Bachelor of Technology', university || 'IEEE University', 
            web3.utils.keccak256(certificateId)
        ).send({ from: accounts[0], gas: 3000000 });

        // Generate QR Code data (URL for verification)
        const verifyUrl = `${req.protocol}://${req.get('host')}/verifier/verify.html?id=${certificateId}`;
        const qrCodeDataUri = await QRCode.toDataURL(verifyUrl);

        certificate.txHash = tx.transactionHash;
        certificate.qrCode = qrCodeDataUri;
        certificate.issueDate = Date.now();
        await certificate.save();

        res.status(201).json({ 
            message: 'Certificate issued', 
            certificateId,
            txHash: tx.transactionHash,
            qrCode: qrCodeDataUri
        });
    } catch (err) {
        console.error('Issue certificate error:', err);
        res.status(400).json({ error: err.message });
    }
});

// Serve certificate photo
router.get('/photo/:id', async (req, res) => {
    try {
        const cert = await Certificate.findById(req.params.id);
        if (!cert || !cert.photoUrl) {
            return res.status(404).json({ error: 'Photo not found' });
        }
        
        const photoPath = path.join(__dirname, '..', cert.photoUrl);
        if (fs.existsSync(photoPath)) {
            res.sendFile(photoPath);
        } else {
            res.status(404).json({ error: 'Photo file not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Serve certificate PDF
router.get('/pdf/:id', async (req, res) => {
    try {
        const cert = await Certificate.findById(req.params.id);
        if (!cert || !cert.certFileUrl) {
            return res.status(404).json({ error: 'Certificate file not found' });
        }
        
        const filePath = path.join(__dirname, '..', cert.certFileUrl);
        if (fs.existsSync(filePath)) {
            res.sendFile(filePath);
        } else {
            res.status(404).json({ error: 'Certificate file not found on disk' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Revoke Certificate
router.post('/revoke/:id', authMiddleware, isAdmin, async (req, res) => {
    try {
        const certificateId = req.params.id;
        
        // Update Blockchain
        const contract = await getContract();
        const accounts = await web3.eth.getAccounts();
        await contract.methods.revokeCertificate(certificateId).send({ from: accounts[0] });

        // Update MongoDB
        await Certificate.findOneAndUpdate({ certificateId }, { isRevoked: true });

        res.json({ message: 'Certificate revoked successfully' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Verify Certificate
router.get('/verify/:id', async (req, res) => {
    try {
        const certificateId = req.params.id;
        const contract = await getContract();
        const result = await contract.methods.verifyCertificate(certificateId).call();
        
        // Increment utility count if found in DB
        const cert = await Certificate.findOneAndUpdate(
            { certificateId }, 
            { $inc: { verificationCount: 1 } },
            { new: true }
        );

        res.json({
            rollNumber: cert?.isPrivate ? 'REDACTED (Privacy Mode)' : result.rollNumber,
            department: cert?.isPrivate ? 'REDACTED (Privacy Mode)' : result.department,
            studentName: result.studentName, // Keep name public for validation
            courseName: result.courseName,
            university: result.university,
            issueDate: new Date(Number(result.issueDate) * 1000),
            isRevoked: result.isRevoked,
            txHash: cert?.txHash,
            isPrivate: cert?.isPrivate || false
        });
    } catch (err) {
        res.status(404).json({ error: 'Certificate not found or invalid' });
    }
});

// Get Student Certificates
router.get('/student/:studentId', authMiddleware, async (req, res) => {
    try {
        const certificates = await Certificate.find({ studentId: req.params.studentId });
        res.json(certificates);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get All Certificates (Admin only)
router.get('/', authMiddleware, isAdmin, async (req, res) => {
    try {
        const certificates = await Certificate.find()
            .populate('studentId', 'name email rollNumber department')
            .sort({ issueDate: -1 });
        res.json(certificates);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get All Certificates (Admin only) - alternative route
router.get('/all', authMiddleware, isAdmin, async (req, res) => {
    try {
        const certificates = await Certificate.find().sort({ issueDate: -1 });
        res.json(certificates);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get All Students (Admin only)
router.get('/students', authMiddleware, isAdmin, async (req, res) => {
    try {
        const students = await User.find({ role: 'student' }).select('name email rollNumber department _id');
        res.json(students);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Headless Trust API (Enterprise Verification)
router.get('/trust/verify/:id', async (req, res) => {
    try {
        const certificateId = req.params.id;
        const contract = await getContract();
        const result = await contract.methods.verifyCertificate(certificateId).call();
        
        const cert = await Certificate.findOne({ certificateId });

        res.json({
            status: "success",
            trustScore: cert && !cert.isRevoked ? 1.0 : 0.0,
            credential: {
                id: certificateId,
                holder: result.studentName,
                course: result.courseName,
                university: result.university,
                issuedAt: new Date(Number(result.issueDate) * 1000).toISOString(),
                isRevoked: result.isRevoked,
                blockchain: {
                    network: "Ethereum (Ganache)",
                    proof: cert ? cert.txHash : "ON-CHAIN-ONLY"
                }
            },
            verificationDate: new Date().toISOString()
        });
    } catch (err) {
        res.status(404).json({ status: "fail", error: "Certificate not found" });
    }
});

// Get certificate stats
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const totalCertificates = await Certificate.countDocuments({ status: 'approved' });
        const totalVerifications = await Certificate.aggregate([
            { $group: { _id: null, total: { $sum: '$verificationCount' } } }
        ]);
        
        res.json({
            totalCertificates,
            totalVerifications: totalVerifications[0]?.total || 0
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
