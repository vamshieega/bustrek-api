const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://eegakrishnavamshi1997_db_user:iU1Zrd5XJ4CWvLZp@cluster0.qgrvflz.mongodb.net/bustrek?retryWrites=true&w=majority&appName=Cluster0';
    
    console.log('🔄 Attempting to connect to MongoDB...');
    const conn = await mongoose.connect(mongoURI);

    console.log(`🗄️  MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.log('⚠️  Server will continue without database connection');
    // Don't exit the process, let the server run without DB
  }
};

module.exports = connectDB;
