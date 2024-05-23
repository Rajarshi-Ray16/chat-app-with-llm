import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './AuthForm.css';

function Register({ setUser }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:4000/api/auth/signup', { email, password });
      setUser({ email, token: response.data.token });
      navigate('/chat');
    } catch (error) {
      console.error('Error registering', error);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>Register</h2>
      <div className="input-group">
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="input-group">
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <button type="submit">Register</button>
    </form>
  );
}

export default Register;
