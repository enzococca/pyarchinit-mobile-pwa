import React, { useState } from 'react';
import { API_BASE } from '../config/api';

/**
 * Login Component
 * Handles user authentication
 */
export default function Login({ onLoginSuccess, onSwitchToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (response.ok) {
        const data = await response.json();

        // Store auth token
        localStorage.setItem('auth_token', data.access_token);
        localStorage.setItem('user_email', data.user.email);
        localStorage.setItem('user_name', data.user.name);
        localStorage.setItem('user_role', data.user.role);

        // Notify parent
        onLoginSuccess(data);
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.detail || 'Login failed';

        // Check if it's a pending approval error
        if (response.status === 403 && errorMessage.toLowerCase().includes('pending')) {
          setError('Il tuo account è in attesa di approvazione da parte di un amministratore. Riceverai conferma quando sarà approvato.');
        } else if (response.status === 403 && errorMessage.toLowerCase().includes('rejected')) {
          setError('La tua richiesta di registrazione è stata rifiutata. Contatta l\'amministratore per maggiori informazioni.');
        } else {
          setError(errorMessage);
        }
      }
    } catch (err) {
      console.error('Login error:', err);
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
          <h2>Login to pyArchInit Mobile</h2>
          <p>Archaeological field documentation system</p>
        </div>

        <form onSubmit={handleLogin} className="auth-form">
          {error && (
            <div className="error-banner">
              ⚠️ {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="archaeologist@example.com"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn-auth-primary"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account?{' '}
            <button
              onClick={onSwitchToRegister}
              className="btn-link"
            >
              Register here
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
          background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%);
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

        .form-group input {
          width: 100%;
          padding: 12px;
          font-size: 1rem;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          transition: border-color 0.2s;
        }

        .form-group input:focus {
          outline: none;
          border-color: #2196f3;
        }

        .btn-auth-primary {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%);
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
          box-shadow: 0 6px 20px rgba(33, 150, 243, 0.4);
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
          color: #2196f3;
          font-weight: 600;
          cursor: pointer;
          text-decoration: underline;
          font-size: 0.9rem;
        }

        .btn-link:hover {
          color: #1976d2;
        }
      `}</style>
    </div>
  );
}
