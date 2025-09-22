const Booking = require('../models/Booking');
const User = require('../models/User');
const sessionManager = require('../config/sessions');
const { withConnection } = require('../config/dbConnect');

const bookingController = {
  // Book a bus ticket
  bookTicket: async (req, res) => {
    try {
      // Get user information from the authenticated token
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return res.status(401).json({
          status: 'error',
          message: 'Access denied. No token provided.'
        });
      }

      // Extract token from "Bearer <token>"
      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : authHeader;

      if (!token) {
        return res.status(401).json({
          status: 'error',
          message: 'Access denied. Invalid token format.'
        });
      }

      // Get session from token
      const session = sessionManager.get(token);
      if (!session) {
        return res.status(401).json({
          status: 'error',
          message: 'Access denied. Invalid token.'
        });
      }

      // Get user details from database using session (using custom id field, not _id)
      let user;
      await withConnection(async () => {
        user = await User.findOne({ id: session.userId });
      });
      
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
      }

      const {
        busId,
        selectedSeats,
        passengerDetails,
        journeyDetails,
        busDetails,
        totalAmount,
        bookingTime
      } = req.body;

      // Create userDetails object from authenticated user (override with passengerDetails if provided)
      const userDetails = {
        name: passengerDetails?.name || user.name,
        email: user.email, // Always use authenticated user's email
        phone: passengerDetails?.phone || user.phone || req.body.phone
      };

      // Validate required fields
      if (!selectedSeats || !Array.isArray(selectedSeats) || selectedSeats.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Selected seats are required and must be a non-empty array'
        });
      }

      // Validate phone if not provided in user profile
      if (!userDetails.phone && !req.body.phone) {
        return res.status(400).json({
          status: 'error',
          message: 'Phone number is required for booking'
        });
      }

      // Update userDetails with phone if provided in request
      if (req.body.phone) {
        userDetails.phone = req.body.phone;
      }

      // Validate bus details - allow for different structures
      if (!busDetails || !busDetails.busName || !busDetails.busType) {
        return res.status(400).json({
          status: 'error',
          message: 'Bus details are incomplete. Required: busName, busType'
        });
      }

      // Add missing fields with default values if not provided
      const completeBusDetails = {
        busName: busDetails.busName,
        duration: busDetails.duration || journeyDetails?.departureTime && journeyDetails?.arrivalTime ? 'Calculated' : 'N/A',
        busType: busDetails.busType,
        departureTime: journeyDetails?.departureTime || busDetails.departureTime || 'N/A',
        arrivalTime: journeyDetails?.arrivalTime || busDetails.arrivalTime || 'N/A',
        price: busDetails.price || Math.round(totalAmount / selectedSeats.length),
        rating: busDetails.rating || 4.0,
        amenities: busDetails.amenities || ['Basic'],
        totalSeats: busDetails.totalSeats || 40,
        busId: busId || busDetails.busId || 'unknown'
      };

      if (!journeyDetails || !journeyDetails.from || !journeyDetails.to || !journeyDetails.date) {
        return res.status(400).json({
          status: 'error',
          message: 'Journey details (from, to, date) are required'
        });
      }

      if (!totalAmount || totalAmount <= 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Total amount is required and must be greater than 0'
        });
      }

      // Email is already validated from the authenticated user

      // Validate phone format (basic validation)
      const phoneRegex = /^[0-9]{10,15}$/;
      if (!phoneRegex.test(userDetails.phone.replace(/\D/g, ''))) {
        return res.status(400).json({
          status: 'error',
          message: 'Please provide a valid phone number'
        });
      }

      // Create new booking using MongoDB
      const bookingData = {
        selectedSeats,
        userDetails,
        busDetails: completeBusDetails,
        journeyDetails,
        totalAmount,
        bookingTime: bookingTime ? new Date(bookingTime) : new Date()
      };

      let booking;
      await withConnection(async () => {
        booking = new Booking(bookingData);
        await booking.save();
      });

      res.status(201).json({
        status: 'success',
        message: 'Booking successfully created',
        bookingId: booking.bookingId
      });

    } catch (error) {
      console.error('Booking error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // Get booking history for user by ID
  getBookingHistory: async (req, res) => {
    try {
      const { id } = req.params;

      // Validate user ID parameter
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'User ID is required'
        });
      }

      // Get user details from database using the provided user ID
      let user, bookings;
      await withConnection(async () => {
        user = await User.findOne({ id: id });
        if (!user) {
          return res.status(404).json({
            status: 'error',
            message: 'User not found'
          });
        }

        // Find bookings by user's email using MongoDB
        bookings = await Booking.find({ 'userDetails.email': user.email })
          .sort({ bookingTime: -1 }); // Sort by booking time descending (newest first)
      });

      // Return the booking history (empty array if no bookings found)
      res.status(200).json({
        status: 'success',
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email
          },
          bookings: bookings
        }
      });

    } catch (error) {
      console.error('Get booking history error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // Get booking by ID (bonus endpoint)
  getBookingById: async (req, res) => {
    try {
      const { bookingId } = req.params;

      if (!bookingId) {
        return res.status(400).json({
          status: 'error',
          message: 'Booking ID is required'
        });
      }

      let booking;
      await withConnection(async () => {
        booking = await Booking.findOne({ bookingId: bookingId });
      });

      if (!booking) {
        return res.status(404).json({
          status: 'error',
          message: 'Booking not found'
        });
      }

      res.status(200).json({
        status: 'success',
        data: booking
      });

    } catch (error) {
      console.error('Get booking by ID error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        error: error.message
      });
    }
  }
};

module.exports = bookingController;
