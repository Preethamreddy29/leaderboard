// models/User.js
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true, // Ensures no two users have the same email
  },
  ticketCount: {
    type: Number,
    required: true,
    default: 0, // Starts every new user with 0 tickets
  },
  // We can also store the Stripe customer ID here for future reference
  stripeCustomerId: {
    type: String,
    required: false,
  }
}, { timestamps: true }); // Automatically adds createdAt and updatedAt fields

// Check if the model already exists before defining it (good for serverless environments)
const User = mongoose.models.User || mongoose.model('User', UserSchema);

export default User;