import mongoose, { Document, Schema } from 'mongoose';

// TypeScript Interface for autocomplete and type safety
export interface IUser extends Document {
  fullName: string;
  email: string;
  passwordHash: string;
  phone: string;
  rating: number;
  createdAt: Date;
}

// Mongoose Schema for database rules
const UserSchema: Schema = new Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true }, // We will hash passwords in production
  phone: { type: String, required: true, trim: true },
  rating: { type: Number, default: 5.0 },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IUser>('User', UserSchema);