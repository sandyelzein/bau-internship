// src/pages/RegisterPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPages.css';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate      = useNavigate();

  const [form, setForm]       = useState({ studentId: '', email: '', password: '', confirmPassword: '', gpa: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

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
    if (form.gpa && (isNaN(form.gpa) || form.gpa < 0 || form.gpa > 4)) {
      return setError('GPA must be between 0 and 4');
    }

    setLoading(true);
    try {
      await register(form.studentId, form.email, form.password, form.gpa || undefined);
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
          <div className="auth-logo">BAU</div>
          <h1 className="auth-title">Internship Management System</h1>
          <p className="auth-subtitle">Faculty of Sciences – Department of Mathematics and Computer Science</p>
        </div>

        <div className="auth-body">
          <h2 className="auth-form-title">Student Registration</h2>
          <p className="auth-info">
            You must be a registered CS student to create an account. Your Student ID and university email must match our records.
          </p>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <div className="form-group">
                <label>Student ID <span className="required">*</span></label>
                <input
                  type="text"
                  name="studentId"
                  value={form.studentId}
                  onChange={handleChange}
                  placeholder="e.g. 202012345"
                  required
                />
              </div>
              <div className="form-group">
                <label>GPA (optional)</label>
                <input
                  type="number"
                  name="gpa"
                  value={form.gpa}
                  onChange={handleChange}
                  placeholder="e.g. 3.75"
                  step="0.01"
                  min="0"
                  max="4"
                />
              </div>
            </div>

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
