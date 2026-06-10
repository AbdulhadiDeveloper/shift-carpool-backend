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

// Basic Health Check & API Documentation Route
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Shift Carpool API | Documentation</title>
        <style>
            :root {
                --bg: #141313;
                --surface: #1C1B1B;
                --primary: #FFFFFF;
                --text-dim: #8f9194;
                --accent: #e5e2e1;
            }
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background-color: var(--bg);
                color: var(--primary);
                margin: 0;
                padding: 40px 20px;
                line-height: 1.6;
            }
            .container {
                max-width: 800px;
                margin: 0 auto;
            }
            h1 { font-size: 3rem; font-weight: 800; letter-spacing: -0.05em; margin-bottom: 10px; }
            p.subtitle { color: var(--text-dim); font-size: 1.2rem; margin-bottom: 40px; }
            .section {
                background: var(--surface);
                border: 1px solid #2a2a2a;
                border-radius: 16px;
                padding: 25px;
                margin-bottom: 30px;
            }
            .section-title {
                font-size: 0.8rem;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.1em;
                color: var(--text-dim);
                margin-bottom: 20px;
                border-bottom: 1px solid #2a2a2a;
                padding-bottom: 10px;
            }
            .endpoint {
                display: flex;
                align-items: center;
                margin-bottom: 15px;
                gap: 15px;
            }
            .method {
                font-size: 0.7rem;
                font-weight: 800;
                padding: 4px 8px;
                border-radius: 4px;
                min-width: 60px;
                text-align: center;
                background: #2a2a2a;
            }
            .method.get { color: #81b1ff; }
            .method.post { color: #81ffad; }
            .method.patch { color: #ffd181; }
            .path { font-family: monospace; font-size: 1rem; flex: 1; }
            .desc { color: var(--text-dim); font-size: 0.9rem; text-align: right; }
            footer { text-align: center; color: var(--text-dim); font-size: 0.8rem; margin-top: 50px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Shift.</h1>
            <p class="subtitle">Quiet Luxury Travel API Documentation</p>

            <div class="section">
                <div class="section-title">Authentication</div>
                <div class="endpoint">
                    <span class="method post">POST</span>
                    <span class="path">/api/auth/register</span>
                    <span class="desc">Create a new account</span>
                </div>
                <div class="endpoint">
                    <span class="method post">POST</span>
                    <span class="path">/api/auth/login</span>
                    <span class="desc">Authenticate user</span>
                </div>
            </div>

            <div class="section">
                <div class="section-title">Rides & Journeys</div>
                <div class="endpoint">
                    <span class="method get">GET</span>
                    <span class="path">/api/rides</span>
                    <span class="desc">Fetch all active routes</span>
                </div>
                <div class="endpoint">
                    <span class="method get">GET</span>
                    <span class="path">/api/rides/my</span>
                    <span class="desc">Fetch user specific journeys</span>
                </div>
                <div class="endpoint">
                    <span class="method post">POST</span>
                    <span class="path">/api/rides</span>
                    <span class="desc">Broadcast a new route</span>
                </div>
                <div class="endpoint">
                    <span class="method patch">PATCH</span>
                    <span class="path">/api/rides/:id</span>
                    <span class="desc">Update ride details</span>
                </div>
                <div class="endpoint">
                    <span class="method patch">PATCH</span>
                    <span class="path">/api/rides/:id/join</span>
                    <span class="desc">Secure a seat</span>
                </div>
                <div class="endpoint">
                    <span class="method patch">PATCH</span>
                    <span class="path">/api/rides/:id/leave</span>
                    <span class="desc">Cancel a reserved seat</span>
                </div>
                <div class="endpoint">
                    <span class="method patch">PATCH</span>
                    <span class="path">/api/rides/:id/cancel</span>
                    <span class="desc">Shut down a route</span>
                </div>
            </div>

            <footer>
                &copy; 2026 Shift Carpool. All systems operational.
            </footer>
        </div>
    </body>
    </html>
  `);
});

// Only listen locally if we are NOT on Vercel
if (process.env.NODE_ENV !== 'production') {
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running locally on port ${PORT}`);
  });
}

// CRUCIAL: Export the app for Vercel Serverless!
export default app;