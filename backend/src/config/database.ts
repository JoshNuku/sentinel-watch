import mongoose from 'mongoose';

/**
 * MongoDB Connection Configuration
 * Establishes connection with retry logic and proper error handling
 */
export const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = `mongodb+srv://${process.env.MONGODB_ATLAS_USERNAME}:${process.env.MONGODB_ATLAS_PASSWORD}@cluster0.evxv4jy.mongodb.net/orion?retryWrites=true&w=majority&appName=Cluster0`;

//connect to mongo atlas
    
    await mongoose.connect(mongoUri);
    
    console.log('✅ MongoDB Connected Successfully');
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`🌐 Host: ${mongoose.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    console.error('🔄 Retrying connection in 5 seconds...');
    
    // Retry connection after 5 seconds
    setTimeout(connectDatabase, 5000);
  }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB Disconnected. Attempting to reconnect...');
});

mongoose.connection.on('error', (error) => {
  console.error('❌ MongoDB Error:', error);
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB Reconnected');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('🛑 MongoDB connection closed through app termination');
    process.exit(0);
  } catch (error) {
    console.error('Error during MongoDB disconnection:', error);
    process.exit(1);
  }
});
