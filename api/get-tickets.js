// api/get-tickets.js

import mongoose from 'mongoose';

// --- 1. DB CONNECTION & MODELS (Replicated) ---
const MONGO_URI = process.env.MONGO_URI;
let cachedDb = null;

const connectToDatabase = async () => {
    if (cachedDb) return cachedDb;

    try {
        const db = await mongoose.connect(MONGO_URI);
        cachedDb = db.connection.db;
        return cachedDb;
    } catch (error) {
        console.error('MongoDB connection error in get-tickets:', error);
        throw new Error('Failed to connect to the database.');
    }
}

// Mongoose Schemas (Required to read the user data)
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    ticketCount: { type: Number, required: true, default: 0 },
}, { timestamps: true });
const User = mongoose.models.User || mongoose.model('User', UserSchema);

// --- 2. VERCEL SERVERLESS HANDLER ---
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { email } = req.query;

    if (!email) {
        return res.status(400).json({ message: 'Email query parameter is required.' });
    }

    try {
        await connectToDatabase();
        
        // Find the user by email
        const user = await User.findOne({ email });

        if (!user) {
            // If user is not found, assume 0 tickets (safe default)
            return res.status(200).json({ ticketCount: 0 });
        }

        // Return the current ticket count
        return res.status(200).json({ ticketCount: user.ticketCount });

    } catch (dbError) {
        console.error('Error fetching tickets:', dbError);
        return res.status(500).json({ error: 'Database query failed' });
    }
}