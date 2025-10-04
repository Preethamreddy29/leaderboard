// api/create-checkout-session.js

// NOTE: Vercel automatically loads environment variables (STRIPE_SECRET_KEY, MONGO_URI, etc.)
// DO NOT include 'dotenv' here.

import Stripe from 'stripe';
import mongoose from 'mongoose';

// Initialize Stripe (Vercel automatically pulls the key from process.env)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
});

// --- 1. DATABASE CONNECTION LOGIC (Copied from former db/connect.js) ---
const MONGO_URI = process.env.MONGO_URI;
let cachedDb = null;

const connectToDatabase = async () => {
    if (cachedDb) {
        console.log('Using existing database connection');
        return cachedDb;
    }

    try {
        // Use the connection options suitable for serverless/Vercel
        const db = await mongoose.connect(MONGO_URI);
        cachedDb = db.connection.db;
        console.log('New MongoDB connection established');
        return cachedDb;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw new Error('Failed to connect to the database.');
    }
}

// --- 2. MONGOOSE SCHEMAS/MODELS (Copied from former server/index.js) ---
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    ticketCount: { type: Number, required: true, default: 0 },
}, { timestamps: true });
const User = mongoose.models.User || mongoose.model('User', UserSchema);

const EntrySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userEmail: { type: String, required: true },
    title: { type: String, required: true },
    url: { type: String, required: true },
}, { timestamps: true });
const Entry = mongoose.models.Entry || mongoose.model('Entry', EntrySchema);


// --- 3. VERCEL SERVERLESS HANDLER (The main function Vercel runs) ---
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }
    
    // NOTE: Hardcoded email for test flow; Vercel will handle CORS automatically
    const userEmail = "testuser@challenge.com"; 

    try {
        // 1. Database connection is attempted on every API call
        await connectToDatabase();
        let user = await User.findOne({ email: userEmail });
        
        if (!user) {
            user = await User.create({ email: userEmail, ticketCount: 0 });
        }

        // 2. Create the Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: process.env.CHALLENGE_PRICE_ID, // Loaded from Vercel ENV
                    quantity: 1,
                },
            ],
            // Use the dynamic Vercel host for success/cancel URLs
            success_url: `${req.headers.origin}/?session_id={CHECKOUT_SESSION_ID}&email=${userEmail}`,
            cancel_url: `${req.headers.origin}/`,
            
            customer_email: userEmail,
            metadata: { userId: user._id.toString() } 
        });

        // 3. Return the session URL to the frontend
        return res.status(200).json({ url: session.url });

    } catch (error) {
        console.error('Stripe session creation failed:', error);
        // Send a generic 500 status to the frontend
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}