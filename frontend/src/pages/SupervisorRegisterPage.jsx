import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPages.css';

export default function SupervisorRegisterPage() {
  const { registerSupervisor } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match');
    if (form.password.length < 8) return setError('Password must be at least 8 characters');
    setLoading(true);
    try {
      await registerSupervisor(form.email, form.password);
      navigate('/supervisor');
    } catch (err) {
      const serverError = err.response?.data?.error;
      if (serverError === 'An account already exists for this supervisor') {
        setError('An account already exists for this supervisor. Please sign in instead.');
      } else if (!err.response) {
        setError('Cannot reach the server. Check VITE_API_BASE_URL on the frontend and FRONTEND_URL on the backend, then redeploy both services.');
      } else {
        setError(serverError || 'Could not create supervisor account');
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <img className="auth-logo" src="/bau-logo-blue.png" alt="Beirut Arab University" />
          <h1 className="auth-title">Supervisor Account</h1>
          <p className="auth-subtitle">Internship evaluation portal</p>
        </div>
        <div className="auth-body">
          <h2 className="auth-form-title">Create Your Account</h2>
          <p className="auth-info">Use the same email address that the student entered for you.</p>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={submit}>
            <div className="form-group"><label>Email Address</label><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required /></div>
            <div className="form-group"><label>Password</label><input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required /></div>
            <div className="form-group"><label>Confirm Password</label><input type="password" value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} required /></div>
            <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>{loading ? 'Creating…' : 'Create Supervisor Account'}</button>
          </form>
          <p className="auth-footer-text">Already registered? <Link to="/login">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}
