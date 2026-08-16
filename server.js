const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(session({
    secret: 'session-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    }
});
const upload = multer({ 
    storage: storage,
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

// Database setup
const db = new Database('database.sqlite');
console.log('Connected to SQLite database');
initializeDatabase();

function initializeDatabase() {
    // Users table
    db.exec(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Check and create admin user
    const adminUsername = 'espir';
    const adminPassword = 'a13872008H@';
    
    const existingAdmin = db.prepare('SELECT * FROM users WHERE username = ?').get(adminUsername);
    if (!existingAdmin) {
        const hash = bcrypt.hashSync(adminPassword, 10);
        db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(adminUsername, hash, 'admin');
        console.log('Admin user created successfully');
    } else {
        console.log('Admin user already exists');
    }
    
    // Receipts table
    db.exec(`CREATE TABLE IF NOT EXISTS receipts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_name TEXT NOT NULL,
        amount INTEGER NOT NULL,
        payment_date TEXT NOT NULL,
        payment_method TEXT NOT NULL,
        receipt_image TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);
    console.log('Receipts table ready');
}

// Auth middleware
function authenticateToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Access denied' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
}

function isAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

// Routes

// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
        return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const match = bcrypt.compareSync(password, user.password);
    if (!match) {
        return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
    
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

// Register new user (admin only)
app.post('/api/register', authenticateToken, isAdmin, (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    
    const hash = bcrypt.hashSync(password, 10);
    
    try {
        const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
        const info = stmt.run(username, hash);
        res.json({ message: 'User created successfully', userId: info.lastInsertRowid });
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        return res.status(500).json({ error: 'Error creating user' });
    }
});

// Get all users (admin only)
app.get('/api/users', authenticateToken, isAdmin, (req, res) => {
    const rows = db.prepare('SELECT id, username, role, created_at FROM users').all();
    res.json(rows);
});

// Create receipt
app.post('/api/receipts', authenticateToken, upload.single('receiptImage'), (req, res) => {
    const { studentName, amount, paymentDate, paymentMethod } = req.body;
    
    if (!req.file) {
        return res.status(400).json({ error: 'Receipt image is required' });
    }
    
    if (!studentName || !amount || !paymentDate || !paymentMethod) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    
    const receiptImage = req.file.filename;
    
    try {
        const stmt = db.prepare(`INSERT INTO receipts (student_name, amount, payment_date, payment_method, receipt_image, user_id) 
         VALUES (?, ?, ?, ?, ?, ?)`);
        const info = stmt.run(studentName, parseInt(amount), paymentDate, paymentMethod, receiptImage, req.user.id);
        res.json({ 
            message: 'Receipt created successfully', 
            receiptId: info.lastInsertRowid,
            receiptImage: receiptImage
        });
    } catch (err) {
        return res.status(500).json({ error: 'Error creating receipt' });
    }
});

// Get user's receipts
app.get('/api/receipts', authenticateToken, (req, res) => {
    const { studentName, startDate, endDate } = req.query;
    
    let query = 'SELECT * FROM receipts WHERE 1=1';
    const params = [];
    
    if (req.user.role !== 'admin') {
        query += ' AND user_id = ?';
        params.push(req.user.id);
    }
    
    if (studentName) {
        query += ' AND student_name LIKE ?';
        params.push(`%${studentName}%`);
    }
    
    if (startDate) {
        query += ' AND payment_date >= ?';
        params.push(startDate);
    }
    
    if (endDate) {
        query += ' AND payment_date <= ?';
        params.push(endDate);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const rows = db.prepare(query).all(...params);
    res.json(rows);
});

// Get statistics (admin only)
app.get('/api/statistics', authenticateToken, isAdmin, (req, res) => {
    const { studentName, startDate, endDate } = req.query;
    
    let query = 'SELECT SUM(amount) as total, COUNT(*) as count FROM receipts WHERE 1=1';
    const params = [];
    
    if (studentName) {
        query += ' AND student_name LIKE ?';
        params.push(`%${studentName}%`);
    }
    
    if (startDate) {
        query += ' AND payment_date >= ?';
        params.push(startDate);
    }
    
    if (endDate) {
        query += ' AND payment_date <= ?';
        params.push(endDate);
    }
    
    const row = db.prepare(query).get(...params);
    res.json({ total: row.total || 0, count: row.count || 0 });
});

// Get monthly chart data (admin only)
app.get('/api/chart-data', authenticateToken, (req, res) => {
    // Get last 6 months data - for all users if admin, or just user's receipts if regular user
    let query;
    if (req.user.role === 'admin') {
        query = `
            SELECT 
                strftime('%Y-%m', payment_date) as month,
                COUNT(*) as count,
                SUM(amount) as total
            FROM receipts 
            WHERE payment_date >= date('now', '-6 months')
            GROUP BY month
            ORDER BY month ASC
        `;
    } else {
        query = `
            SELECT 
                strftime('%Y-%m', payment_date) as month,
                COUNT(*) as count,
                SUM(amount) as total
            FROM receipts 
            WHERE user_id = ? AND payment_date >= date('now', '-6 months')
            GROUP BY month
            ORDER BY month ASC
        `;
    }
    
    const rows = req.user.role === 'admin' 
        ? db.prepare(query).all()
        : db.prepare(query).all(req.user.id);
    
    // Convert to Persian month names
    const persianMonths = {
        '01': 'فروردین', '02': 'اردیبهشت', '03': 'خرداد',
        '04': 'تیر', '05': 'مرداد', '06': 'شهریور',
        '07': 'مهر', '08': 'آبان', '09': 'آذر',
        '10': 'دی', '11': 'بهمن', '12': 'اسفند'
    };
    
    const labels = [];
    const counts = [];
    const totals = [];
    
    rows.forEach(row => {
        const monthNum = row.month.split('-')[1];
        labels.push(persianMonths[monthNum] || row.month);
        counts.push(row.count);
        totals.push(row.total);
    });
    
    res.json({ labels, counts, totals });
});

// Get all receipts with stats (admin only)
app.get('/api/admin/receipts', authenticateToken, isAdmin, (req, res) => {
    const { studentName, startDate, endDate } = req.query;
    
    let query = 'SELECT r.*, u.username as uploader FROM receipts r JOIN users u ON r.user_id = u.id WHERE 1=1';
    const params = [];
    
    if (studentName) {
        query += ' AND r.student_name LIKE ?';
        params.push(`%${studentName}%`);
    }
    
    if (startDate) {
        query += ' AND r.payment_date >= ?';
        params.push(startDate);
    }
    
    if (endDate) {
        query += ' AND r.payment_date <= ?';
        params.push(endDate);
    }
    
    query += ' ORDER BY r.created_at DESC';
    
    const rows = db.prepare(query).all(...params);
    
    // Calculate total
    const total = rows.reduce((sum, r) => sum + r.amount, 0);
    
    res.json({ receipts: rows, totalAmount: total, totalCount: rows.length });
});

// Delete receipt
app.delete('/api/receipts/:id', authenticateToken, (req, res) => {
    const receiptId = req.params.id;
    
    const receipt = db.prepare('SELECT * FROM receipts WHERE id = ?').get(receiptId);
    if (!receipt) {
        return res.status(404).json({ error: 'Receipt not found' });
    }
    
    // Check if user owns the receipt or is admin
    if (receipt.user_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized' });
    }
    
    // Delete file
    const filePath = path.join(__dirname, 'uploads', receipt.receipt_image);
    try {
        fs.unlinkSync(filePath);
    } catch (err) {
        // Ignore file not found errors
    }
    
    db.prepare('DELETE FROM receipts WHERE id = ?').run(receiptId);
    res.json({ message: 'Receipt deleted successfully' });
});

// Delete user (admin only)
app.delete('/api/users/:id', authenticateToken, isAdmin, (req, res) => {
    const userId = req.params.id;
    
    // Prevent deleting yourself
    if (parseInt(userId) === req.user.id) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    // Delete user's receipts first
    const receipts = db.prepare('SELECT * FROM receipts WHERE user_id = ?').all(userId);
    receipts.forEach(receipt => {
        const filePath = path.join(__dirname, 'uploads', receipt.receipt_image);
        try {
            fs.unlinkSync(filePath);
        } catch (err) {
            // Ignore file not found errors
        }
    });
    
    db.prepare('DELETE FROM receipts WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    res.json({ message: 'User deleted successfully' });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
