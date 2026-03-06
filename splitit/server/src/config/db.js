import mongoose from 'mongoose';

export async function connectDB() {
  console.log('Connecting to MongoDB...');
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    throw err;
  }
}
