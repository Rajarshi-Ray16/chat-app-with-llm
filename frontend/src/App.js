import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from 'react-router-dom';
import Register from './components/Register';
import Login from './components/Login';
import Chat from './components/Chat';
import './App.css';
import axios from 'axios';

function App() {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('AVAILABLE');

  useEffect(() => {
    const fetchUserStatus = async () => {
      if (user && user.token) {
        try {
          const response = await axios.get(`http://localhost:4000/api/users/status`, {
            headers: {
              Authorization: `Bearer ${user.token}`
            }
          });
          setStatus(response.data.status);
        } catch (error) {
          console.error('Error fetching user status', error);
        }
      }
    };

    fetchUserStatus();
  }, [user]);

  const toggleStatus = async () => {
    if (user && user.token) {
      const newStatus = status === 'AVAILABLE' ? 'BUSY' : 'AVAILABLE';

      try {
        await axios.put('http://localhost:4000/api/auth/status', { status: newStatus, email: user.email }, {
          headers: {
            Authorization: `Bearer ${user.token}`
          }
        });
        setStatus(newStatus);
      } catch (error) {
        console.error('Error updating status', error);
      }
    }
  };

  const handleLogout = async () => {
    if (user && user.token) {
      try {
        console.log(user.email);
        // Assuming user object contains email and token properties
        await axios.post('http://localhost:4000/api/auth/logout', { email: user.email }, {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        });
        setUser(null);
      } catch (error) {
        console.error('Error logging out', error);
      }
    }
  };

  return (
    <Router>
      <div className="App">
        <header>
          <nav>
            <ul>
              {user ? (
                <>
                  <li><Link to="/chat">Chat</Link></li>
                  <li><button onClick={handleLogout}>Logout</button></li>
                  <li><button onClick={toggleStatus}>{status === 'AVAILABLE' ? 'BUSY?' : 'AVAILABLE?'}</button></li>
                </>
              ) : (
                <>
                  <li><Link to="/register">Register</Link></li>
                  <li><Link to="/login">Login</Link></li>
                </>
              )}
            </ul>
          </nav>
        </header>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register setUser={setUser} />} />
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route path="/chat" element={user ? <Chat user={user} /> : <Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
}

function Home() {
  return (
    <div className="home">
      <h1>Welcome to the Chat App</h1>
      <p>Please register or login to continue.</p>
    </div>
  );
}

export default App;
