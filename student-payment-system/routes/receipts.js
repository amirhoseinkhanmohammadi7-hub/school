const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Receipt = require('../models/Receipt');
const { authMiddleware } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'receipt-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Submit receipt
router.post('/submit', authMiddleware, upload.single('receiptImage'), async (req, res) => {
  try {
    const { studentName, amount, paymentMethod, shamsiDate } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'Receipt image is required' });
    }

    const receipt = new Receipt({
      studentName,
      amount: parseFloat(amount),
      paymentMethod,
      shamsiDate: JSON.parse(shamsiDate || '{}'),
      receiptImage: `/uploads/${req.file.filename}`,
      uploadedBy: req.user.id
    });

    await receipt.save();
    res.status(201).json({ message: 'Receipt submitted successfully', receipt });
  } catch (error) {
    console.error('Error submitting receipt:', error);
    res.status(500).json({ message: 'Server error submitting receipt' });
  }
});

// Get user's receipts
router.get('/my-receipts', authMiddleware, async (req, res) => {
  try {
    const receipts = await Receipt.find({ uploadedBy: req.user.id })
      .sort({ createdAt: -1 });
    res.json(receipts);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching receipts' });
  }
});

module.exports = router;
