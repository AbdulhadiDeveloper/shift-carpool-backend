import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import rideRoutes from './routes/rides';
import authRoutes from './routes/auth';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json()); // Parses incoming JSON requests

// MongoDB Connection (Adapted for Vercel Serverless)
const connectDB = async () => {
  if (mongoose.connections[0].readyState) {
    return; // Use existing connection if already connected (crucial for Vercel)
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('MongoDB Connected successfully');
  } catch (error) {
    console.error('Database connection error:', error);
    throw error; // Rethrow to let the middleware handle it
  }
};

// Global middleware to ensure DB connection before handling routes
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// Routes
app.use('/api/rides', rideRoutes);
app.use('/api/auth', authRoutes);

// Basic Health Check Route
app.get('/', (req, res) => {
  res.send('Shift Carpool API is running...');
});

// Only listen locally if we are NOT on Vercel
if (process.env.NODE_ENV !== 'production') {
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running locally on port ${PORT}`);
  });
}

// CRUCIAL: Export the app for Vercel Serverless!
export default app;