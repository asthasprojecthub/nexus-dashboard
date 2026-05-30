// ─────────────────────────────────────────────────────────────────────────────
// backend/server.js  — FIXED (full replacement)
//
// Bug fix applied:
//   [H3] Added express.static middleware to serve the uploads/ directory.
//        Without this, every file the user downloads goes to /uploads/<path>
//        which Express never matched, returning 404 for all attachments.
//        The frontend links to /uploads/inquiry/<filename> — this must be
//        reachable from the browser through the same Express server.
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const morgan  = require('morgan');
const dotenv  = require('dotenv');
const cors    = require('cors');
const path    = require('path');

const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// ─── Middleware ────────────────────────────────────────────────────────────────

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─── Static file serving for uploads  [FIX H3] ────────────────────────────────
// Serves files under backend/uploads/ at the URL path /uploads.
// The frontend references attachment URLs as /uploads/inquiry/<filename>.
// Must be registered BEFORE the API routes so it is matched first.
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'), {
    // Do not list directory contents — serve individual files only
    index: false,
    // 1 day cache for uploaded files in production; no-cache in dev
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
  })
);

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/api/auth',          require('./routes/authRoutes'));
app.use('/api/inquiries',     require('./routes/inquiryRoutes'));
app.use('/api/projects',      require('./routes/projectRoutes'));
app.use('/api/customers',     require('./routes/customerRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/dashboard',     require('./routes/dashboardRoutes'));
app.use('/api/users',         require('./routes/userRoutes'));

// ─── Health Check ──────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({
    status:  'OK',
    message: 'Electrical CRM API is running',
  });
});

// ─── Error Handling Middleware ─────────────────────────────────────────────────

app.use(require('./middleware/errorMiddleware'));

// ─── Server Start ──────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
