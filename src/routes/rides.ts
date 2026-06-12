import express from 'express';
import mongoose from 'mongoose';
import Ride from '../models/Ride';
import User from '../models/User';
import { protect, AuthRequest } from '../middleware/auth';

const router = express.Router();

// GET: Retrieve all active routes with available seats
router.get('/', protect, async (req, res) => {
  try {
    const rides = await Ride.find({ availableSeats: { $gt: 0 }, status: 'active' })
                            .sort({ createdAt: -1 });
    res.status(200).json(rides);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch active routes.' });
  }
});

// GET: Retrieve user's specific journeys (driving or riding)
router.get('/my', protect, async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const rides = await Ride.find({
      $or: [
        { driverId: userObjectId },
        { passengers: userObjectId }
      ]
    }).sort({ departureTime: 1 }); // Sort by upcoming
    
    res.status(200).json(rides);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user journeys.' });
  }
});

// POST: Broadcast a new route (Driver Mode)
router.post('/', protect, async (req: AuthRequest, res) => {
  try {
    const { driverName, origin, destination, departureTime, totalSeats } = req.body;
    
    // driverId should come from the authenticated user
    const driverId = req.user?.id;
    if (!driverId) {
       return res.status(401).json({ error: 'User not authenticated' });
    }

    // Fetch user to get their registered phone number for WhatsApp integration
    const user = await User.findById(driverId);
    if (!user) {
       return res.status(404).json({ error: 'Driver profile not found' });
    }
    
    const newRide = new Ride({
      driverId,
      driverName,
      driverPhone: user.phone,
      origin,
      destination,
      departureTime,
      totalSeats,
      availableSeats: totalSeats // Inherits initial capacity
    });
    
    const savedRide = await newRide.save();
    res.status(201).json(savedRide);
  } catch (error) {
    res.status(400).json({ error: 'Invalid route specifications.' });
  }
});

// PATCH: Atomic Reservation Engine (Rider Mode)
router.patch('/:id/join', protect, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const userId = req.user?.id; // Authenticated passenger ID

  if (!userId) {
     return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    // Atomic update: only decrement IF availableSeats is greater than 0 AND user is not already a passenger
    const updatedRide = await Ride.findOneAndUpdate(
      { _id: id, availableSeats: { $gt: 0 }, passengers: { $ne: userId } },
      { 
        $inc: { availableSeats: -1 }, // Decreases available seats by 1
        $push: { passengers: userId } // Adds user to passenger list
      },
      { new: true } // Returns the updated document
    );

    if (!updatedRide) {
      return res.status(409).json({ error: 'Seat no longer available, you already joined, or ride not found.' });
    }

    res.status(200).json(updatedRide);
  } catch (error) {
    res.status(500).json({ error: 'Transaction failed.' });
  }
});

// PATCH: Leave a ride (Rider relinquishes seat)
router.patch('/:id/leave', protect, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ error: 'User not authenticated' });

  try {
    const updatedRide = await Ride.findOneAndUpdate(
      { _id: id, passengers: userId },
      { 
        $inc: { availableSeats: 1 },
        $pull: { passengers: userId }
      },
      { new: true }
    );

    if (!updatedRide) {
      return res.status(400).json({ error: 'Not a passenger or ride not found.' });
    }

    res.status(200).json(updatedRide);
  } catch (error) {
    res.status(500).json({ error: 'Transaction failed.' });
  }
});

// PATCH: Update a route (Driver mode)
router.patch('/:id', protect, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const { destination, departureTime, totalSeats } = req.body;

  if (!userId) return res.status(401).json({ error: 'User not authenticated' });

  try {
    const ride = await Ride.findOne({ _id: id, driverId: userId, status: 'active' });
    if (!ride) return res.status(404).json({ error: 'Not authorized or ride not found.' });

    // Handle seat logic carefully
    if (totalSeats !== undefined) {
      const reservedSeats = ride.totalSeats - ride.availableSeats;
      if (totalSeats < reservedSeats) {
        return res.status(400).json({ error: `Cannot reduce seats below ${reservedSeats} currently booked.` });
      }
      ride.totalSeats = totalSeats;
      ride.availableSeats = totalSeats - reservedSeats;
    }

    if (destination) ride.destination = destination;
    if (departureTime) ride.departureTime = departureTime;

    const updatedRide = await ride.save();
    res.status(200).json(updatedRide);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update ride.' });
  }
});

// PATCH: Cancel a route (Driver mode)
router.patch('/:id/cancel', protect, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ error: 'User not authenticated' });

  try {
    const updatedRide = await Ride.findOneAndUpdate(
      { _id: id, driverId: userId, status: 'active' },
      { status: 'cancelled' },
      { new: true }
    );

    if (!updatedRide) {
      return res.status(400).json({ error: 'Not authorized or ride already completed/cancelled.' });
    }

    res.status(200).json(updatedRide);
  } catch (error) {
    res.status(500).json({ error: 'Transaction failed.' });
  }
});

export default router;