import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/axios';
import './AuthPages.css';

export default function SupervisorProfileSetupPage() {
  const { token } = useParams();
  const [form, setForm] = useState({ name: '', position: '', email: '', phone: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.get(`/supervisor/profile/${token}`)
      .then(res => setForm(res.data.supervisor))
      .catch(err => setError(err.response?.data?.error || 'This supervisor profile link is invalid or expired.'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await api.post(`/supervisor/profile/${token}`, {
        name: form.name,
        position: form.position,
        phone: form.phone,
      });
      setSuccess(res.data.message);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to save your supervisor profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <img className="auth-logo" src="/bau-logo-blue.png" alt="Beirut Arab University" />
          <h1 className="auth-title">Supervisor Profile</h1>
          <p className="auth-subtitle">Confirm your internship contact details</p>
        </div>
        <div className="auth-body">
          {loading ? <div className="spinner" /> : success ? (
            <>
              <div className="alert alert-success">{success}</div>
              <p className="auth-footer-text">Next, <Link to="/register/supervisor">create your supervisor account</Link> using this email.</p>
            </>
          ) : error && !form.email ? (
            <div className="alert alert-error">{error}</div>
          ) : (
            <>
              <p className="auth-info">This secure link expires in 72 hours and can only be used once.</p>
              {error && <div className="alert alert-error">{error}</div>}
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="supervisor-name">Full Name</label>
                  <input id="supervisor-name" value={form.name} onChange={e => setForm(current => ({ ...current, name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label htmlFor="supervisor-position">Position</label>
                  <input id="supervisor-position" value={form.position || ''} onChange={e => setForm(current => ({ ...current, position: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label htmlFor="supervisor-email">Email Address</label>
                  <input id="supervisor-email" type="email" value={form.email} readOnly />
                </div>
                <div className="form-group">
                  <label htmlFor="supervisor-phone">Phone (optional)</label>
                  <input id="supervisor-phone" type="tel" value={form.phone || ''} onChange={e => setForm(current => ({ ...current, phone: e.target.value }))} />
                </div>
                <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={saving}>
                  {saving ? 'Saving…' : 'Confirm Profile'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}