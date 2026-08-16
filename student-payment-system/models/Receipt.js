const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema({
  studentName: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['Card-to-Card', 'POS Machine'],
    required: true
  },
  shamsiDate: {
    year: Number,
    month: Number,
    day: Number,
    full: String
  },
  gregorianDate: {
    type: Date,
    default: Date.now
  },
  receiptImage: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

receiptSchema.index({ studentName: 1 });
receiptSchema.index({ gregorianDate: 1 });

module.exports = mongoose.model('Receipt', receiptSchema);
