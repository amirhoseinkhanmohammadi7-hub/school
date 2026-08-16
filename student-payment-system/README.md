# Student Payment Receipt Management System

A complete Node.js web application for managing student payment receipts with a secure admin panel, user portal, and Persian localization (Shamsi dates, Toman currency).

## 🌟 Features

### Admin Panel
- **Default Admin Account**: Username: `espir`, Password: `a13872008H@`
- View total sum of all deposits with one click
- Advanced search by student name (shows deposit count and total amount)
- Filter receipts by date range
- Manage user accounts (add/delete users)
- View all submitted receipts
- Delete receipts

### User Portal
- Submit payment receipts with:
  - Student name input
  - Amount in Tomans
  - Persian/Shamsi date picker
  - Payment method dropdown (Card-to-Card / POS Machine)
  - Receipt image upload
- View personal receipt history

### UI/UX
- Modern, responsive design
- Dark blue color palette throughout
- Persian language support (RTL)
- Intuitive navigation
- Real-time feedback and alerts

## 📁 Project Structure

```
student-payment-system/
├── config/
│   └── database.js          # MongoDB connection configuration
├── middleware/
│   └── auth.js              # JWT authentication middleware
├── models/
│   ├── User.js              # User schema
│   └── Receipt.js           # Receipt schema
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── receipts.js          # Receipt submission routes
│   └── admin.js             # Admin dashboard routes
├── public/
│   ├── index.html           # Main HTML file
│   └── app.js               # Frontend JavaScript
├── uploads/                 # Uploaded receipt images
├── .env                     # Environment variables
├── server.js                # Main Express server
├── package.json             # Dependencies
└── README.md                # This file
```

## 🚀 Setup Instructions

### Prerequisites

Make sure you have the following installed:
- **Node.js** (v14 or higher): [Download](https://nodejs.org/)
- **MongoDB** (v4.4 or higher): [Download](https://www.mongodb.com/try/download/community)
- **Git**: [Download](https://git-scm.com/)

### Step 1: Clone the Repository

```bash
cd /workspace
git clone <your-repository-url> student-payment-system
cd student-payment-system
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install:
- express
- mongoose
- bcryptjs
- jsonwebtoken
- cors
- dotenv
- multer
- nodemon (dev dependency)

### Step 3: Configure Environment Variables

The `.env` file is already created with default values. You can modify it if needed:

```env
MONGODB_URI=mongodb://localhost:27017/student-payment-system
JWT_SECRET=your-super-secret-jwt-key-change-in-production
PORT=5000
```

### Step 4: Start MongoDB

**On Ubuntu/Debian:**
```bash
sudo systemctl start mongod
```

**On macOS (with Homebrew):**
```bash
brew services start mongodb-community
```

**On Windows:**
```bash
net start MongoDB
```

**Or run MongoDB manually:**
```bash
mongod --dbpath /data/db
```

### Step 5: Start the Application

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
node server.js
```

The application will start on `http://localhost:5000`

## 🔐 Default Credentials

**Admin Account:**
- **Username:** `espir`
- **Password:** `a13872008H@`

⚠️ **Important:** Change the JWT_SECRET in `.env` before deploying to production!

## 📱 Usage Guide

### For Admins

1. **Login** with admin credentials
2. **Dashboard** shows total deposits and receipt count
3. **Search by Student Name** to find specific student payments
4. **Filter by Date Range** to view deposits between two dates
5. **Manage Users** to add new users or delete existing ones
6. **View All Receipts** to see every submitted receipt

### For Users

1. **Login** with your credentials (created by admin)
2. **Submit Receipt** to upload a new payment receipt:
   - Enter student name
   - Enter amount in Tomans
   - Select payment method (Card-to-Card or POS Machine)
   - Choose date using Persian calendar
   - Upload receipt image
3. **View My Receipts** to see your submission history

## 🎨 UI/UX Design

The application features a **Dark Blue** color palette:

- Primary: `#0a192f` (Deep Navy)
- Secondary: `#112240` (Dark Slate)
- Light: `#233554` (Steel Blue)
- Accent: `#3d5a80` (Ocean Blue)
- Highlight: `#64ffda` (Turquoise)
- Text Primary: `#e6f1ff` (Off White)
- Text Secondary: `#8892b0` (Gray Blue)

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control (Admin/User)
- File upload validation (image types only, 5MB limit)
- Protected API endpoints
- CORS enabled

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Register new user (admin)
- `GET /api/auth/users` - Get all users (admin)
- `DELETE /api/auth/users/:id` - Delete user (admin)

### Receipts
- `POST /api/receipts/submit` - Submit receipt (authenticated)
- `GET /api/receipts/my-receipts` - Get user's receipts (authenticated)

### Admin
- `GET /api/admin/all` - Get all receipts (admin)
- `GET /api/admin/total-sum` - Get total deposits (admin)
- `GET /api/admin/search/student?name=` - Search by student (admin)
- `GET /api/admin/filter/date-range?startDate=&endDate=` - Filter by date (admin)
- `DELETE /api/admin/:id` - Delete receipt (admin)

## 🛠️ Troubleshooting

### MongoDB Connection Error
Ensure MongoDB is running:
```bash
sudo systemctl status mongod
```

### Port Already in Use
Change the PORT in `.env`:
```env
PORT=5001
```

### Permission Issues with Uploads
```bash
chmod 755 uploads/
```

## 📝 Notes

- The application automatically seeds the default admin account on first run
- Receipt images are stored in the `uploads/` directory
- The frontend uses Persian Datepicker for Shamsi calendar integration
- All amounts are displayed in Iranian Toman

## 🤝 Support

For issues or questions, please check the code comments or review the API endpoint documentation above.

---

**Developed with ❤️ using Node.js, Express, MongoDB, and Vanilla JavaScript**
