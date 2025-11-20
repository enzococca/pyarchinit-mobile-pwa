import React, { useState } from 'react';
import { API_BASE } from '../config/api';

/**
 * Register Component
 * Handles new user registration
 */
export default function Register({ onRegisterSuccess, onSwitchToLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('archaeologist');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password,
          name,
          role
        })
      });

      if (response.ok) {
        const data = await response.json();

        // Check if registration is pending approval
        if (data.status === 'pending') {
          // User registered but needs approval
          setSuccessMessage('Account creato con successo! Il tuo account è in attesa di approvazione da parte di un amministratore. Riceverai una notifica quando sarà approvato.');

          // Clear form
          setName('');
          setEmail('');
          setPassword('');
          setConfirmPassword('');
          setRole('archaeologist');
        } else if (data.access_token) {
          // User is approved (first user becomes admin automatically)
          localStorage.setItem('auth_token', data.access_token);
          localStorage.setItem('user_email', data.user.email);
          localStorage.setItem('user_name', data.user.name);
          localStorage.setItem('user_role', data.user.role);

          // Notify parent
          onRegisterSuccess(data);
        } else {
          // Unexpected response
          setError('Unexpected response from server. Please try again.');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Registration failed');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <img src="/logo.svg" alt="pyArchInit" className="auth-logo" />
          <h2>Register for pyArchInit Mobile</h2>
          <p>Create your archaeological documentation account</p>
        </div>

        <form onSubmit={handleRegister} className="auth-form">
          {error && (
            <div className="error-banner">
              ⚠️ {error}
            </div>
          )}

          {successMessage && (
            <div className="success-banner">
              ✓ {successMessage}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dr. Indiana Jones"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="archaeologist@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">Role</label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            >
              <option value="archaeologist">Archaeologist</option>
              <option value="student">Student</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn-auth-primary"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <button
              onClick={onSwitchToLogin}
              className="btn-link"
            >
              Login here
            </button>
          </p>
        </div>
      </div>

      <style>{`
        .auth-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 1rem;
        }

        .auth-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          max-width: 400px;
          width: 100%;
          overflow: hidden;
        }

        .auth-header {
          background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%);
          color: white;
          padding: 2rem;
          text-align: center;
        }

        .auth-logo {
          height: 60px;
          margin-bottom: 1rem;
        }

        .auth-header h2 {
          margin: 0 0 0.5rem 0;
          font-size: 1.5rem;
        }

        .auth-header p {
          margin: 0;
          opacity: 0.9;
          font-size: 0.9rem;
        }

        .auth-form {
          padding: 2rem;
          max-height: 70vh;
          overflow-y: auto;
        }

        .error-banner {
          background: #ffebee;
          color: #c62828;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          font-size: 0.9rem;
          border-left: 4px solid #c62828;
        }

        .success-banner {
          background: #e8f5e9;
          color: #2e7d32;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          font-size: 0.9rem;
          border-left: 4px solid #4caf50;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
          color: #333;
          font-size: 0.9rem;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 12px;
          font-size: 1rem;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          transition: border-color 0.2s;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #4caf50;
        }

        .btn-auth-primary {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .btn-auth-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
        }

        .btn-auth-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .auth-footer {
          padding: 1.5rem 2rem;
          background: #f5f5f5;
          text-align: center;
          border-top: 1px solid #e0e0e0;
        }

        .auth-footer p {
          margin: 0;
          color: #666;
          font-size: 0.9rem;
        }

        .btn-link {
          background: none;
          border: none;
          color: #4caf50;
          font-weight: 600;
          cursor: pointer;
          text-decoration: underline;
          font-size: 0.9rem;
        }

        .btn-link:hover {
          color: #388e3c;
        }
      `}</style>
    </div>
  );
}
