// api/webhook.js

// IMPORTANT: Vercel loads environment variables automatically.
// DO NOT include 'dotenv' here.
import { buffer } from 'micro';
import Stripe from 'stripe';
import mongoose from 'mongoose';
import { buffer } from 'micro'; // Tool to read the raw request body

// Initialize Stripe (Vercel automatically pulls the key from process.env)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
});

// --- 1. DB CONNECTION & MODELS (Replicated from create-checkout-session.js) ---
const MONGO_URI = process.env.MONGO_URI;
let cachedDb = null;

const connectToDatabase = async () => {
    if (cachedDb) return cachedDb;

    try {
        const db = await mongoose.connect(MONGO_URI);
        cachedDb = db.connection.db;
        return cachedDb;
    } catch (error) {
        console.error('MongoDB connection error in webhook:', error);
        throw new Error('Failed to connect to the database.');
    }
}

// Mongoose Schemas (Required to interact with the database)
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    ticketCount: { type: Number, required: true, default: 0 },
}, { timestamps: true });
const User = mongoose.models.User || mongoose.model('User', UserSchema);


// --- 2. VERCEL CONFIG (Disables Express Body Parser) ---
// This is crucial for Stripe signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};


// --- 3. VERCEL SERVERLESS HANDLER ---
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  // 3.1. Read the raw request body and signature
  const rawBody = await buffer(req);
  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  // 3.2. Verify the Webhook Signature
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret
    );
  } catch (err) {
    console.error(`❌ Webhook Signature Error: ${err.message}`);
    // Return a 400 status so Stripe knows verification failed
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 3.3. Handle the Event Type (Payment Success)
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userEmail = session.customer_details.email;

    try {
      // Connect to DB and find the user
      await connectToDatabase(); 
      
      // Find the user by email (which was passed via customer_email in the session)
      const user = await User.findOne({ email: userEmail });

      if (!user) {
        console.error(`User not found for email: ${userEmail}`);
        return res.status(200).json({ received: true }); // Still return 200 so Stripe doesn't retry
      }

      // 3.4. CREDIT THE TICKET (CORE REQUIREMENT)
      user.ticketCount += 1;
      await user.save();

      console.log(`✅ TICKET CREDITED: ${userEmail}. New count: ${user.ticketCount}`);

    } catch (dbError) {
      console.error('Database update failed:', dbError);
      return res.status(500).json({ received: false, error: 'Database update failed' });
    }
  }

  // 3.5. Return success to Stripe
  res.status(200).json({ received: true });
}