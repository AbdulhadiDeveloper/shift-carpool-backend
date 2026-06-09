import express from 'express';
import Ride from '../models/Ride';

const router = express.Router();

// GET: Retrieve all active routes with available seats
router.get('/', async (req, res) => {
  try {
    const rides = await Ride.find({ availableSeats: { $gt: 0 }, status: 'active' })
                            .sort({ createdAt: -1 });
    res.status(200).json(rides);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch active routes.' });
  }
});

// POST: Broadcast a new route (Driver Mode)
router.post('/', async (req, res) => {
  try {
    const { driverId, driverName, origin, destination, departureTime, totalSeats } = req.body;
    
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
router.patch('/:id/join', async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body; // Authenticated passenger ID

  try {
    // Atomic update: only decrement IF availableSeats is greater than 0
    const updatedRide = await Ride.findOneAndUpdate(
      { _id: id, availableSeats: { $gt: 0 } },
      { 
        $inc: { availableSeats: -1 }, // Decreases available seats by 1
        $push: { passengers: userId } // Adds user to passenger list
      },
      { new: true } // Returns the updated document
    );

    if (!updatedRide) {
      return res.status(409).json({ error: 'Seat no longer available or ride not found.' });
    }

    res.status(200).json(updatedRide);
  } catch (error) {
    res.status(500).json({ error: 'Transaction failed.' });
  }
});

export default router;