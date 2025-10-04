// src/App.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css'; 

// --- Configuration ---
// Note: We use the same hardcoded email across all components for the test flow.
const TEST_USER_EMAIL = "testuser@challenge.com";
// Vercel routes are assumed to be deployed to the same host as the frontend.
// For local testing, we hardcode the backend port (3001).
const BASE_API_URL = 'http://localhost:3001/api'; 

// Helper component for the "Payment received" toast
const Toast = ({ message }) => (
  <div style={{ position: 'fixed', top: '20px', right: '20px', padding: '10px', backgroundColor: 'green', color: 'white', borderRadius: '5px', zIndex: 1000 }}>
    {message}
  </div>
);

// Component to fetch and display the leaderboard
const Leaderboard = () => {
    const [leaderboard, setLeaderboard] = useState([]);

    const fetchLeaderboard = async () => {
        try {
            // GET request to the upload API endpoint fetches the list
            const response = await axios.get(`${BASE_API_URL}/upload-entry`);
            setLeaderboard(response.data.leaderboard || []);
        } catch (error) {
            console.error("Error fetching leaderboard:", error);
        }
    };
    
    // Fetch once on load
    useEffect(() => {
        fetchLeaderboard();
        // Set a shorter polling interval for the leaderboard to appear "instantly"
        const intervalId = setInterval(fetchLeaderboard, 1500); 
        return () => clearInterval(intervalId);
    }, []);

    if (leaderboard.length === 0) {
        return <p style={{ textAlign: 'center', margin: '20px' }}>No entries submitted yet.</p>;
    }

    return (
        <div style={{ marginTop: '20px' }}>
            <h3 style={{ borderBottom: '1px solid #ccc', paddingBottom: '5px' }}>Leaderboard (Newest First)</h3>
            <ul style={{ listStyleType: 'none', padding: 0 }}>
                {leaderboard.map((entry, index) => (
                    <li key={index} style={{ border: '1px solid #444', padding: '10px', marginBottom: '10px', borderRadius: '4px' }}>
                        <strong>{index + 1}. {entry.title}</strong> 
                        <span style={{ float: 'right', color: '#888', fontSize: '0.9em' }}>
                            by {entry.userEmail.split('@')[0]}
                        </span>
                        <p style={{ margin: '5px 0 0', fontSize: '0.9em' }}>
                            Link: <a href={entry.url} target="_blank" rel="noopener noreferrer">{entry.url}</a>
                        </p>
                    </li>
                ))}
            </ul>
        </div>
    );
};


// Component containing the form and upload logic
const UploadForm = ({ onUploadSuccess }) => {
    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (!title.trim() || !url.trim()) {
            alert("Title and URL cannot be empty.");
            setLoading(false);
            return;
        }

        try {
            // POST request to save the entry
            await axios.post(`${BASE_API_URL}/upload-entry`, {
                title,
                url,
                email: TEST_USER_EMAIL,
            });
            
            setTitle('');
            setUrl('');
            setLoading(false);
            
            // Trigger an event to instantly refresh the leaderboard
            onUploadSuccess(); 

        } catch (error) {
            console.error("Error uploading entry:", error.response?.data || error);
            alert('Failed to upload entry. Check console.');
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ border: '1px solid #555', padding: '20px', borderRadius: '5px' }}>
            <h3>Upload Your Entry (Title + URL)</h3>
            <input
                type="text"
                placeholder="Entry Title (e.g., 'My Best Poem')"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
                style={{ width: '100%', padding: '10px', margin: '10px 0', boxSizing: 'border-box' }}
            />
            <input
                type="url"
                placeholder="URL to your work (e.g., https://myblog.com/entry)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
                style={{ width: '100%', padding: '10px', margin: '10px 0', boxSizing: 'border-box' }}
            />
            <button type="submit" disabled={loading} style={{ padding: '10px 20px', backgroundColor: loading ? '#555' : '#61dafb', color: 'black', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                {loading ? 'Submitting...' : 'Upload Entry'}
            </button>
        </form>
    );
};


// Main Application Component
function App() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [toastMessage, setToastMessage] = useState(null);
  const [leaderboardKey, setLeaderboardKey] = useState(0); // Used to force leaderboard refresh

  // --- Utility Functions ---
  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };
  
  // Checks URL on initial load for success redirection
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    
    if (sessionId) {
        // Stripe has redirected us back after payment
        setCurrentPage('success');
    }
  }, []);

  // --- Payment Logic ---
  const handleJoinChallenge = async () => {
    try {
      // Call Vercel API function to create the checkout session
      const response = await axios.post(`${BASE_API_URL}/create-checkout-session`);
      
      // Redirect the user to the Stripe checkout page
      window.location.href = response.data.url;

    } catch (error) {
      console.error("Error joining challenge:", error.response?.data || error);
      alert('Could not start payment process. Check console for details.');
    }
  };

  // --- Dashboard Component (Ticket Polling) ---
  const Dashboard = () => {
    const [ticketCount, setTicketCount] = useState('...');
    
    // Polling Logic (Refreshes the count every 3 seconds)
    useEffect(() => {
        const fetchTickets = async () => {
            try {
                // Call API route to get the ticket count
                const response = await axios.get(`${BASE_API_URL}/get-tickets?email=${TEST_USER_EMAIL}`);
                setTicketCount(response.data.ticketCount);
            } catch (error) {
                console.error("Error fetching tickets:", error);
            }
        };

        fetchTickets(); 
        const intervalId = setInterval(fetchTickets, 3000);

        return () => clearInterval(intervalId);
    }, []);

    // Function to force the leaderboard to refresh instantly after an upload
    const handleUploadSuccess = () => {
        setLeaderboardKey(prev => prev + 1);
        showToast("Entry uploaded successfully!");
    };

    return (
        <div style={{ maxWidth: '800px', margin: '40px auto', padding: '20px', border: '1px solid #333', borderRadius: '8px' }}>
            <h2>Welcome to Your Challenge Dashboard</h2>
            <div style={{ padding: '15px', backgroundColor: '#222', margin: '20px 0', borderRadius: '5px' }}>
                <h3 style={{ margin: 0 }}>🎟️ Raffle Tickets: {ticketCount}</h3>
                {ticketCount > 0 && (
                    <p style={{ color: 'lightgreen', margin: '5px 0 0' }}>Payment confirmed and ticket credited!</p>
                )}
            </div>
            
            <UploadForm onUploadSuccess={handleUploadSuccess} />
            
            <Leaderboard key={leaderboardKey} /> 
        </div>
    );
  };
  
  // --- Rendering Functions ---
  
  if (currentPage === 'success') {
      // Show the success toast and switch to the dashboard after a short delay
      showToast("Payment received.");
      setTimeout(() => {
          setCurrentPage('dashboard');
      }, 1000);
      
      return (
          <div style={{ textAlign: 'center', paddingTop: '100px' }}>
              <h1>Thank You!</h1>
              <p>Payment successful. Redirecting to your dashboard now...</p>
          </div>
      );
  }
  
  if (currentPage === 'dashboard') {
      return (
          <>
              <Dashboard />
              {toastMessage && <Toast message={toastMessage} />}
          </>
      );
  }

  // Default: Landing Page
  return (
    <div className="App">
      <header className="App-header" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        
        {/* --- Landing Snippet (Must-Have) --- */}
        <h1 style={{color: '#61dafb'}}>Join the Challenge — Just $7</h1>
        
        <button 
          onClick={handleJoinChallenge} 
          style={{ padding: '10px 20px', fontSize: '1.2em', cursor: 'pointer', backgroundColor: '#61dafb', color: 'black', border: 'none', borderRadius: '5px' }}
        >
          Join Now
        </button>

        <h3 style={{ marginTop: '30px' }}>How it works:</h3>
        <p>Pay $7 → Ticket credited → Upload → Show on leaderboard</p>

        <div style={{ marginTop: '40px', padding: '10px', borderTop: '1px solid #ccc' }}>
            <p><strong>Secure Stripe checkout</strong> • Winners announced publicly</p>
        </div>
        
      </header>
    </div>
  );
}

export default App;