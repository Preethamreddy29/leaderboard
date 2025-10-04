// models/Entry.js
import mongoose from 'mongoose';

const EntrySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId, // Links back to the User's unique ID
    ref: 'User',
    required: true,
  },
  userEmail: {
    type: String,
    required: true, // Easier for displaying the submitter on the leaderboard
  },
  title: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true, // The link to the user's challenge submission
  }
}, { timestamps: true }); // We will use 'createdAt' to order the leaderboard

// Check if the model already exists before defining it
const Entry = mongoose.models.Entry || mongoose.model('Entry', EntrySchema);

export default Entry;