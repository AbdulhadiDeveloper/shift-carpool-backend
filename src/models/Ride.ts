import mongoose, { Document, Schema } from 'mongoose';

export interface IRide extends Document {
  driverId: mongoose.Types.ObjectId;
  driverName: string;
  driverPhone: string;
  origin: string;
  destination: string;
  departureTime: Date;
  estimatedDuration: string;
  totalSeats: number;
  availableSeats: number;
  passengers: mongoose.Types.ObjectId[];
  status: 'active' | 'completed' | 'cancelled';
}

const RideSchema: Schema = new Schema({
  driverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  driverName: { type: String, required: true },
  driverPhone: { type: String, required: true },
  origin: { type: String, required: true, trim: true },
  destination: { type: String, required: true, trim: true },
  departureTime: { type: Date, required: true },
  estimatedDuration: { type: String, default: '45 mins' },
  totalSeats: { type: Number, required: true, min: 1, max: 4 },
  availableSeats: { type: Number, required: true, min: 0 },
  passengers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' }
}, { timestamps: true });

export default mongoose.model<IRide>('Ride', RideSchema);