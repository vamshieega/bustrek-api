// In-memory session storage
// In production, you'd want to use Redis or store in database
const sessions = new Map();

const sessionManager = {
  // Create a new session
  create: (userId, email) => {
    const sessionToken = require('uuid').v4();
    sessions.set(sessionToken, {
      userId,
      email,
      createdAt: new Date()
    });
    return sessionToken;
  },

  // Get session by token
  get: (token) => {
    return sessions.get(token);
  },

  // Delete session
  delete: (token) => {
    return sessions.delete(token);
  },

  // Check if session exists
  has: (token) => {
    return sessions.has(token);
  },

  // Get all sessions (for debugging)
  getAll: () => {
    return Array.from(sessions.entries());
  },

  // Clear all sessions (for testing)
  clear: () => {
    sessions.clear();
  }
};

module.exports = sessionManager;
