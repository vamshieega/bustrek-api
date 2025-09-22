const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const bookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    default: () => uuidv4(),
    unique: true,
    required: true
  },
  selectedSeats: [{
    type: String,
    required: true
  }],
  userDetails: {
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'User email is required'],
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'User phone is required'],
      trim: true
    }
  },
  busDetails: {
    busName: {
      type: String,
      required: [true, 'Bus name is required'],
      trim: true
    },
    duration: {
      type: String,
      required: [true, 'Duration is required'],
      trim: true
    },
    busType: {
      type: String,
      required: [true, 'Bus type is required'],
      trim: true
    },
    departureTime: {
      type: String,
      required: [true, 'Departure time is required'],
      trim: true
    },
    arrivalTime: {
      type: String,
      required: [true, 'Arrival time is required'],
      trim: true
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative']
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [0, 'Rating cannot be negative'],
      max: [5, 'Rating cannot exceed 5']
    },
    amenities: [{
      type: String,
      trim: true
    }],
    totalSeats: {
      type: Number,
      required: [true, 'Total seats is required'],
      min: [1, 'Total seats must be at least 1']
    }
  },
  journeyDetails: {
    from: {
      type: String,
      required: [true, 'From location is required'],
      trim: true
    },
    to: {
      type: String,
      required: [true, 'To location is required'],
      trim: true
    },
    date: {
      type: String,
      required: [true, 'Journey date is required'],
      trim: true
    }
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },
  bookingTime: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries by email
bookingSchema.index({ 'userDetails.email': 1 });

module.exports = mongoose.model('Booking', bookingSchema);
