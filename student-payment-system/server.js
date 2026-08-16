const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/database');
const authRoutes = require('./routes/auth');
const receiptRoutes = require('./routes/receipts');
const adminRoutes = require('./routes/admin');
const { authMiddleware, adminMiddleware } = require('./middleware/auth');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

const app = express();

// Connect to database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// Seed default admin account
const seedAdmin = async () => {
  try {
    const adminExists = await User.findOne({ username: 'espir' });
    
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('a13872008H@', 10);
      
      const admin = new User({
        username: 'espir',
        password: hashedPassword,
        role: 'admin'
      });
      
      await admin.save();
      console.log('Default admin account created: espir / a13872008H@');
    } else {
      console.log('Default admin account already exists');
    }
  } catch (error) {
    console.error('Error seeding admin:', error.message);
  }
};

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  await seedAdmin();
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the application at http://localhost:${PORT}`);
});
