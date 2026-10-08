// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPages.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate   = useNavigate();

  const [form, setForm]       = useState({ email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const role = await login(form.email, form.password);
      navigate(role === 'STUDENT' ? '/student' : role === 'SUPERVISOR' ? '/supervisor' : '/committee');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Header */}
        <div className="auth-header">
          <div className="auth-logo">BAU</div>
          <h1 className="auth-title">Internship Management System</h1>
          <p className="auth-subtitle">Faculty of Sciences – Department of Mathematics and Computer Science</p>
        </div>

        {/* Form */}
        <div className="auth-body">
          <h2 className="auth-form-title">Sign In</h2>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="your@email.com"
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="auth-footer-text">
            Don't have an account?{' '}
            <Link to="/register">Register as a Student</Link>
          </p>
          <p className="auth-footer-text" style={{ marginTop: 8 }}>
            Invited as a supervisor? <Link to="/register/supervisor">Create supervisor account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
