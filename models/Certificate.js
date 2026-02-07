const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
    certificateId: { type: String, required: true, unique: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rollNumber: { type: String },
    department: { type: String },
    studentName: { type: String, required: true },
    courseName: { type: String, required: true },
    university: { type: String, required: true },
    year: { type: String },
    grade: { type: String },
    cgpa: { type: String },
    issueDate: { type: Date, default: Date.now },
    txHash: { type: String },
    qrCode: { type: String },
    isRevoked: { type: Boolean, default: false },
    verificationCount: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'approved', 'issued', 'revoked'], default: 'approved' },
    requestedDate: { type: Date, default: Date.now },
    ipfsCid: { type: String },
    isPrivate: { type: Boolean, default: false },
    photoUrl: { type: String },
    certFileUrl: { type: String },
    metadata: { type: Object }
});

module.exports = mongoose.model('Certificate', certificateSchema);
