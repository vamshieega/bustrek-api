const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const bookingRoutes = require('./routes/bookingRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// Import database connection
const { connectDB, checkConnection } = require('./config/dbConnect');

// Connect to MongoDB (optional for serverless - connections are established on-demand)
if (process.env.NODE_ENV !== 'production') {
  connectDB().catch(console.error);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to BusTrek API',
    version: '1.0.0',
    status: 'Server is running successfully!',
    endpoints: {
      auth: {
        signup: 'POST /api/auth/signup',
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        profile: 'GET /api/auth/profile'
      },
      booking: {
        bookTicket: 'POST /api/bookTicket (requires auth token)',
        getBookingHistory: 'GET /api/getBookingHistory (requires auth token)',
        getBooking: 'GET /api/getBooking/:bookingId'
      }
    }
  });
});

app.get('/health', async (req, res) => {
  try {
    const dbHealth = await checkConnection();
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbHealth,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      error: error.message,
      environment: process.env.NODE_ENV || 'development'
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', bookingRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Something went wrong!',
    message: err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚌 BusTrek API server is running on port ${PORT}`);
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`);
  console.log(`🎫 Booking endpoints: http://localhost:${PORT}/api/bookTicket`);
});

module.exports = app;
