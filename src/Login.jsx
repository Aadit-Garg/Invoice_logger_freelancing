import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';
import './App.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!auth) {
      setError("Firebase is not configured.");
      return;
    }
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="brutalist-card" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
        <h1 className="brutalist-title" style={{ fontSize: '2rem', marginBottom: '1.5rem', textAlign: 'center' }}>
          {isLogin ? 'LOGIN_HQ' : 'REGISTER_HQ'}
        </h1>
        
        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '1rem', border: '2px solid #b91c1c', marginBottom: '1rem', fontWeight: 'bold' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 800, marginBottom: '0.5rem' }}>EMAIL</label>
            <input 
              type="email" 
              className="inline-input" 
              style={{ width: '100%', padding: '0.75rem', border: '2px solid #000' }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 800, marginBottom: '0.5rem' }}>PASSWORD</label>
            <input 
              type="password" 
              className="inline-input" 
              style={{ width: '100%', padding: '0.75rem', border: '2px solid #000' }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button 
            type="submit" 
            className="btn-primary" 
            style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', marginTop: '1rem' }}
            disabled={loading}
          >
            {loading ? 'PROCESSING...' : (isLogin ? 'ACCESS HQ' : 'CREATE ACCOUNT')}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button 
            className="icon-only" 
            style={{ color: '#2563eb', textDecoration: 'underline', fontSize: '0.9rem', fontWeight: 600 }}
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
          >
            {isLogin ? 'Need an account? Register ->' : '<- Back to Login'}
          </button>
        </div>
      </div>
    </div>
  );
}
