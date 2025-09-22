const { v4: uuidv4 } = require('uuid');

// In-memory storage for bookings (for testing purposes)
// In production, this should be replaced with a database
class BookingStorage {
  constructor() {
    this.bookings = new Map(); // Using Map for better performance
  }

  // Create a new booking
  createBooking(bookingData) {
    const bookingId = uuidv4();
    const booking = {
      bookingId,
      ...bookingData,
      bookingTime: bookingData.bookingTime ? new Date(bookingData.bookingTime) : new Date()
    };
    
    this.bookings.set(bookingId, booking);
    return booking;
  }

  // Get booking by ID
  getBookingById(bookingId) {
    return this.bookings.get(bookingId) || null;
  }

  // Get all bookings for a specific email
  getBookingsByEmail(email) {
    const userBookings = [];
    for (const booking of this.bookings.values()) {
      if (booking.userDetails.email.toLowerCase() === email.toLowerCase()) {
        userBookings.push(booking);
      }
    }
    return userBookings.sort((a, b) => new Date(b.bookingTime) - new Date(a.bookingTime));
  }

  // Get all bookings (for admin purposes)
  getAllBookings() {
    return Array.from(this.bookings.values()).sort((a, b) => new Date(b.bookingTime) - new Date(a.bookingTime));
  }

  // Update a booking
  updateBooking(bookingId, updateData) {
    if (this.bookings.has(bookingId)) {
      const booking = this.bookings.get(bookingId);
      const updatedBooking = { ...booking, ...updateData };
      this.bookings.set(bookingId, updatedBooking);
      return updatedBooking;
    }
    return null;
  }

  // Delete a booking
  deleteBooking(bookingId) {
    return this.bookings.delete(bookingId);
  }

  // Get total number of bookings
  getBookingCount() {
    return this.bookings.size;
  }

  // Clear all bookings (for testing purposes)
  clearAllBookings() {
    this.bookings.clear();
  }

  // Check if booking exists
  bookingExists(bookingId) {
    return this.bookings.has(bookingId);
  }
}

// Create a singleton instance
const bookingStorage = new BookingStorage();

module.exports = bookingStorage;
