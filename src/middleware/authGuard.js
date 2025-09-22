const sessionManager = require('../config/sessions');

const authGuard = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Extract token from "Bearer <token>"
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid token format.'
      });
    }

    // Check if session exists
    const session = sessionManager.get(token);
    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid token.'
      });
    }

    // Session expiration removed - tokens will not expire

    // Add user info to request object
    req.user = {
      id: session.userId,
      email: session.email
    };

    next();

  } catch (error) {
    console.error('Auth guard error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication'
    });
  }
};

module.exports = authGuard;
