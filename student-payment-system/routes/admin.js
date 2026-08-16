const express = require('express');
const router = express.Router();
const Receipt = require('../models/Receipt');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Get all receipts (admin only)
router.get('/all', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const receipts = await Receipt.find()
      .populate('uploadedBy', 'username')
      .sort({ createdAt: -1 });
    res.json(receipts);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching receipts' });
  }
});

// Get total sum of all deposits
router.get('/total-sum', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = await Receipt.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const total = result.length > 0 ? result[0].total : 0;
    const count = result.length > 0 ? result[0].count : 0;

    res.json({ total, count });
  } catch (error) {
    res.status(500).json({ message: 'Server error calculating total' });
  }
});

// Search by student name
router.get('/search/student', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({ message: 'Student name is required' });
    }

    const receipts = await Receipt.find({
      studentName: { $regex: name, $options: 'i' }
    });

    const totalAmount = receipts.reduce((sum, r) => sum + r.amount, 0);
    const count = receipts.length;

    res.json({
      receipts,
      summary: {
        totalAmount,
        count
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error searching receipts' });
  }
});

// Filter by date range
router.get('/filter/date-range', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include the entire end date

    const receipts = await Receipt.find({
      gregorianDate: {
        $gte: start,
        $lte: end
      }
    });

    const totalAmount = receipts.reduce((sum, r) => sum + r.amount, 0);
    const count = receipts.length;

    res.json({
      receipts,
      summary: {
        totalAmount,
        count,
        startDate,
        endDate
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error filtering receipts' });
  }
});

// Delete receipt (admin only)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await Receipt.findByIdAndDelete(req.params.id);
    res.json({ message: 'Receipt deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting receipt' });
  }
});

module.exports = router;
