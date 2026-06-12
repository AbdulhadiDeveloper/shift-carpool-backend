import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import authRoutes from '../routes/auth';
import rideRoutes from '../routes/rides';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  process.env.JWT_SECRET = 'test_secret';
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Helper to register a user and get a token
async function getAuthToken(email = 'test@example.com', password = 'password123') {
  const res = await request(app).post('/api/auth/register').send({
    fullName: 'Test User',
    email,
    phone: '1234567890',
    password,
  });
  return res.body.token;
}

describe('Rides API', () => {
  it('should prevent access to unauthenticated users', async () => {
    const res = await request(app).get('/api/rides');
    expect(res.statusCode).toEqual(401);
  });

  it('should create a new ride successfully', async () => {
    const token = await getAuthToken();

    const res = await request(app)
      .post('/api/rides')
      .set('Authorization', `Bearer ${token}`)
      .send({
        driverName: 'Test Driver',
        origin: 'New York',
        destination: 'Boston',
        departureTime: new Date().toISOString(),
        totalSeats: 3
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('origin', 'New York');
    expect(res.body).toHaveProperty('availableSeats', 3);
  });

  it('should fetch active routes with available seats', async () => {
    const token = await getAuthToken();

    // Create a ride
    await request(app)
      .post('/api/rides')
      .set('Authorization', `Bearer ${token}`)
      .send({
        driverName: 'Test Driver',
        origin: 'Location A',
        destination: 'Location B',
        departureTime: new Date().toISOString(),
        totalSeats: 2
      });

    const res = await request(app)
      .get('/api/rides')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toBeInstanceOf(Array);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('origin', 'Location A');
  });

  it('should allow a user to join a ride', async () => {
    const driverToken = await getAuthToken('driver@example.com');
    const passengerToken = await getAuthToken('passenger@example.com');

    // Driver creates a ride
    const rideRes = await request(app)
      .post('/api/rides')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        driverName: 'Driver',
        origin: 'Point A',
        destination: 'Point B',
        departureTime: new Date().toISOString(),
        totalSeats: 2
      });

    const rideId = rideRes.body._id;

    // Passenger joins the ride
    const joinRes = await request(app)
      .patch(`/api/rides/${rideId}/join`)
      .set('Authorization', `Bearer ${passengerToken}`);

    expect(joinRes.statusCode).toEqual(200);
    expect(joinRes.body.availableSeats).toEqual(1);
    expect(joinRes.body.passengers.length).toEqual(1);
  });
});