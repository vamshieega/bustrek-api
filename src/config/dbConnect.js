const mongoose = require('mongoose');

/**
 * Production-Ready MongoDB Connection Utility for Serverless Environments
 * 
 * This utility handles:
 * - Connection caching and reuse across function invocations
 * - Proper error handling and retry logic
 * - Serverless-optimized configuration
 * - Environment-specific settings
 */

// Global connection cache for serverless environments
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { 
    conn: null, 
    promise: null,
    isConnected: false 
  };
}

/**
 * MongoDB connection options optimized for serverless environments
 * These settings prevent timeout and buffering issues in Vercel/AWS Lambda
 */
const getConnectionOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isVercel = process.env.VERCEL === '1';
  
  return {
    // Core serverless optimizations
    bufferCommands: false, // CRITICAL: Disable mongoose buffering for serverless
    maxPoolSize: isVercel ? 5 : 10, // Smaller pool for Vercel, larger for other platforms
    minPoolSize: 0, // Allow connections to close completely
    
    // Timeout configurations
    serverSelectionTimeoutMS: 5000, // Fast server selection (5 seconds)
    socketTimeoutMS: 45000, // Socket timeout (45 seconds)
    connectTimeoutMS: 10000, // Connection timeout (10 seconds)
    maxIdleTimeMS: 30000, // Close idle connections after 30 seconds
    
    // Network optimizations
    family: 4, // Use IPv4 only (faster in serverless)
    retryWrites: true, // Retry failed writes
    w: 'majority', // Write concern
    
    // Additional production settings
    ...(isProduction && {
      // Production-specific optimizations
      maxStalenessSeconds: 90, // Read from secondary if primary is stale
      heartbeatFrequencyMS: 10000, // Heartbeat every 10 seconds
    }),
    
    // Vercel-specific optimizations
    ...(isVercel && {
      // Vercel has shorter function timeouts, so we optimize accordingly
      serverSelectionTimeoutMS: 3000,
      socketTimeoutMS: 25000,
      maxIdleTimeMS: 20000,
    })
  };
};

/**
 * Establishes MongoDB connection with proper error handling and caching
 * @returns {Promise<mongoose.Connection>} The mongoose connection
 */
const connectDB = async () => {
  // Return existing connection if available and healthy
  if (cached.conn && cached.isConnected) {
    console.log('🔄 Using cached MongoDB connection');
    return cached.conn;
  }

  // If we don't have a connection promise, create one
  if (!cached.promise) {
    const mongoURI = process.env.MONGODB_URI || 
      'mongodb+srv://eegakrishnavamshi1997_db_user:iU1Zrd5XJ4CWvLZp@cluster0.qgrvflz.mongodb.net/bustrek?retryWrites=true&w=majority&appName=Cluster0';
    
    if (!mongoURI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    console.log('🔄 Establishing new MongoDB connection...');
    
    const opts = getConnectionOptions();
    
    cached.promise = mongoose.connect(mongoURI, opts)
      .then((mongooseInstance) => {
        console.log(`✅ MongoDB Connected: ${mongooseInstance.connection.host}`);
        console.log(`📊 Database: ${mongooseInstance.connection.name}`);
        console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
        
        cached.isConnected = true;
        return mongooseInstance;
      })
      .catch((error) => {
        console.error('❌ MongoDB connection failed:', error.message);
        cached.promise = null; // Reset promise on failure
        cached.isConnected = false;
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    // Reset cache on connection failure
    cached.promise = null;
    cached.conn = null;
    cached.isConnected = false;
    throw error;
  }

  return cached.conn;
};

/**
 * Ensures database connection is established before executing operations
 * This is the main function you'll use in your API routes
 * @param {Function} operation - The database operation to execute
 * @param {Object} options - Options for retry logic
 * @returns {Promise<any>} Result of the operation
 */
const withConnection = async (operation, options = {}) => {
  const { 
    retries = 3, 
    retryDelay = 1000,
    timeout = 30000 
  } = options;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Ensure connection is established
      await connectDB();
      
      // Execute the operation with timeout
      const result = await Promise.race([
        operation(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Operation timeout')), timeout)
        )
      ]);
      
      return result;
      
    } catch (error) {
      console.error(`Database operation attempt ${attempt + 1} failed:`, error.message);
      
      // If this is the last attempt, throw the error
      if (attempt === retries) {
        throw new Error(`Database operation failed after ${retries + 1} attempts: ${error.message}`);
      }
      
      // Wait before retrying (exponential backoff)
      const delay = retryDelay * Math.pow(2, attempt);
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Reset connection cache on certain errors
      if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
        cached.promise = null;
        cached.conn = null;
        cached.isConnected = false;
      }
    }
  }
};

/**
 * Health check function to verify database connectivity
 * @returns {Promise<Object>} Health status object
 */
const checkConnection = async () => {
  try {
    await connectDB();
    const state = mongoose.connection.readyState;
    
    return {
      status: state === 1 ? 'connected' : 'disconnected',
      readyState: state,
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

// Connection event handlers for monitoring
mongoose.connection.on('connected', () => {
  console.log('✅ Mongoose connected to MongoDB');
  cached.isConnected = true;
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err.message);
  cached.isConnected = false;
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  Mongoose disconnected from MongoDB');
  cached.isConnected = false;
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 Mongoose reconnected to MongoDB');
  cached.isConnected = true;
});

// Graceful shutdown handling
const gracefulShutdown = async () => {
  try {
    if (cached.conn) {
      await mongoose.connection.close();
      console.log('🔌 MongoDB connection closed gracefully');
    }
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
  }
};

// Handle process termination
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

module.exports = {
  connectDB,
  withConnection,
  checkConnection,
  gracefulShutdown
};
