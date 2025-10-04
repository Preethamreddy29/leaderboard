// api/upload-entry.js

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
        console.error('MongoDB connection error in upload-entry:', error);
        throw new Error('Failed to connect to the database.');
    }
}

// Mongoose Schemas (Required to write and read data)
const UserSchema = new mongoose.Schema({ /* ... same schema as User.js ... */ });
const User = mongoose.models.User || mongoose.model('User', UserSchema);

const EntrySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userEmail: { type: String, required: true },
    title: { type: String, required: true },
    url: { type: String, required: true },
}, { timestamps: true });
const Entry = mongoose.models.Entry || mongoose.model('Entry', EntrySchema);


// --- 2. VERCEL SERVERLESS HANDLER ---
export default async function handler(req, res) {
    if (req.method === 'POST') {
        // --- A. Handle Entry Submission ---
        const { title, url, email } = req.body;

        if (!title || !url || !email) {
            return res.status(400).json({ message: 'Missing title, URL, or user email.' });
        }

        try {
            await connectToDatabase();
            
            // 1. Find the user ID
            const user = await User.findOne({ email });
            if (!user) {
                return res.status(404).json({ message: 'User not found.' });
            }

            // 2. Create and save the new entry
            const newEntry = await Entry.create({
                userId: user._id,
                userEmail: user.email,
                title,
                url,
            });

            console.log(`✅ Entry uploaded: ${newEntry.title}`);

            // The code proceeds to fetch the full leaderboard and return it
        } catch (error) {
            console.error('Error processing entry submission:', error);
            return res.status(500).json({ message: 'Failed to save entry.' });
        }
    }

    // --- B. Handle Leaderboard Fetch (Runs after POST or during GET) ---
    try {
        await connectToDatabase();

        // Fetch all entries, sorted by creation date (newest first)
        const leaderboard = await Entry.find({})
            .select('title url userEmail createdAt') // Select only necessary fields
            .sort({ createdAt: -1 }); // Newest entries appear instantly at the top

        // Return the full leaderboard list
        return res.status(200).json({ leaderboard });
        
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        return res.status(500).json({ message: 'Failed to fetch leaderboard data.' });
    }
}