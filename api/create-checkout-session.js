// api/create-checkout-session.js

// --- 1. CommonJS Imports (The Fix!) ---
const Stripe = require('stripe');
const mongoose = require('mongoose');

// Initialize Stripe (Vercel automatically pulls the key from process.env)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
});

// --- 2. DATABASE CONNECTION LOGIC ---
const MONGO_URI = process.env.MONGO_URI;
let cachedDb = null;

const connectToDatabase = async () => {
    if (cachedDb) {
        console.log('Using existing database connection');
        return cachedDb;
    }

    try {
        const db = await mongoose.connect(MONGO_URI);
        // Using db.connections[0].db or simply db to cache is often safer in Vercel.
        cachedDb = db; 
        console.log('New MongoDB connection established');
        return cachedDb;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw new Error('Failed to connect to the database.');
    }
}

// --- 3. MONGOOSE SCHEMAS/MODELS ---
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


// --- 4. VERCEL SERVERLESS HANDLER (The main function Vercel runs) ---
module.exports = async function handler(req, res) { // <-- CommonJS Export
    // Set CORS headers for better compatibility (Optional, but good practice)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method !== 'POST') {
        // Handle CORS preflight requests
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }
        return res.status(405).json({ message: 'Method Not Allowed' });
    }
    
    // NOTE: Hardcoded email for test flow; 
    const userEmail = "testuser@challenge.com"; 

    try {
        // 1. Database connection
        await connectToDatabase();
        let user = await User.findOne({ email: userEmail });
        
        if (!user) {
            // Ensure the cached model is being used correctly by accessing mongoose.connection.models
            user = await mongoose.models.User.create({ email: userEmail, ticketCount: 0 });
        }

        // 2. Create the Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: process.env.CHALLENGE_PRICE_ID, // CRUCIAL: Must be set in Vercel
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
        // Log the full error to Vercel logs
        console.error('Stripe session creation failed:', error);
        
        // Send a generic 500 status to the frontend
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}