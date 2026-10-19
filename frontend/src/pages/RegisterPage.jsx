// src/pages/RegisterPage.jsx
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import './AuthPages.css';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate      = useNavigate();

  const [form, setForm]       = useState({ studentId: '', fullName: '', email: '', password: '', confirmPassword: '' });
  const [publicSignup, setPublicSignup] = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/auth/registration-settings')
      .then(res => setPublicSignup(res.data.publicStudentSignup === true))
      .catch(console.error);
  }, []);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      return setError('Passwords do not match');
    }
    if (form.password.length < 8) {
      return setError('Password must be at least 8 characters');
    }
    if (publicSignup && !form.fullName.trim()) {
      return setError('Full name is required');
    }

    setLoading(true);
    try {
      await register(publicSignup ? undefined : form.studentId, form.email, form.password, form.fullName);
      navigate('/student');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-wide">
        <div className="auth-header">
          <img className="auth-logo" src="/bau-logo-blue.png" alt="Beirut Arab University" />
          <h1 className="auth-title">Internship Management System</h1>
          <p className="auth-subtitle">Faculty of Sciences – Department of Mathematics and Computer Science</p>
        </div>

        <div className="auth-body">
          <h2 className="auth-form-title">Student Registration</h2>
          <p className="auth-info">
            {publicSignup
              ? 'Testing access is open. Create a student test account with your name, email, and password.'
              : 'You must be a registered CS student to create an account. Your Student ID and university email must match our records.'}
          </p>
          <div className="alert alert-info" style={{ display: 'block' }}>
            <strong>Internship requirements</strong>
            <ul style={{ margin: '8px 0 0 20px' }}>
              {publicSignup ? <li>A test student record and ID will be generated automatically.</li> : <>
                <li>Your student record must already be imported by the department.</li>
                <li>Use your BAU student ID and the matching university email.</li>
              </>}
              <li>An internship request must include its dates, tasks, and company evidence.</li>
              <li>Requests remain subject to administrator review and approval.</li>
            </ul>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            {publicSignup ? (
              <div className="form-group">
                <label>Full Name <span className="required">*</span></label>
                <input name="fullName" value={form.fullName} onChange={handleChange} required />
              </div>
            ) : (
              <div className="form-group">
                <label>Student ID <span className="required">*</span></label>
                <input type="text" name="studentId" value={form.studentId} onChange={handleChange} placeholder="e.g. 202012345" required />
              </div>
            )}

            <div className="form-group">
              <label>University Email <span className="required">*</span></label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="your.name@students.bau.edu.lb"
                required
              />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Password <span className="required">*</span></label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Min. 8 characters"
                  required
                />
              </div>
              <div className="form-group">
                <label>Confirm Password <span className="required">*</span></label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repeat password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: 8 }}
              disabled={loading}
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="auth-footer-text">
            Already have an account? <Link to="/login">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
