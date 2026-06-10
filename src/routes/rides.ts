import express from 'express';
import Ride from '../models/Ride';
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

// POST: Broadcast a new route (Driver Mode)
router.post('/', protect, async (req: AuthRequest, res) => {
  try {
    const { driverName, origin, destination, departureTime, totalSeats } = req.body;
    
    // driverId should come from the authenticated user
    const driverId = req.user?.id;
    if (!driverId) {
       return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const newRide = new Ride({
      driverId,
      driverName,
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

export default router;