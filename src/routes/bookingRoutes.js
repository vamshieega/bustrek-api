const express = require('express');
const bookingController = require('../controllers/bookingController');

const router = express.Router();

// POST /api/bookTicket - Book a bus ticket (requires authentication)
router.post('/bookTicket', bookingController.bookTicket);

// GET /api/getBookingHistory/:id - Get booking history for user by ID
router.get('/getBookingHistory/:id', bookingController.getBookingHistory);

// GET /api/getBooking/:bookingId - Get booking by ID (bonus endpoint)
router.get('/getBooking/:bookingId', bookingController.getBookingById);

module.exports = router;
