// src/pages/student/InternshipRequest.jsx
// CHANGED: replaced durationWeeks input with startDate + endDate fields
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import api from '../../api/axios';

export default function InternshipRequest() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    companyName: '',
    role:        '',
    skills:      '',
    startDate:   '',
    endDate:     '',
  });
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (new Date(form.endDate) <= new Date(form.startDate)) {
      return setError('End date must be after start date');
    }

    setLoading(true);
    try {
      const res = await api.post('/internships/requests', form);
      setSuccess(
        `Request submitted! Your Request ID is: ${res.data.request.requestCode}`
      );
      setTimeout(() => navigate('/student/requests'), 2500);
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  // Calculate duration preview for the student's convenience
  const durationPreview = () => {
    if (!form.startDate || !form.endDate) return null;
    const diff = new Date(form.endDate) - new Date(form.startDate);
    if (diff <= 0) return null;
    const weeks = Math.round(diff / (7 * 24 * 60 * 60 * 1000));
    return `${weeks} week${weeks !== 1 ? 's' : ''}`;
  };

  return (
    <>
      <Navbar />
      <div className="page-container">
        <h1 className="page-title">Submit Internship Request</h1>

        <div className="card" style={{ maxWidth: 640 }}>
          <div className="card-header"><h3>New Internship Request</h3></div>
          <div className="card-body">
            {error   && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Company Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  name="companyName" value={form.companyName}
                  onChange={handleChange} placeholder="e.g. Berytech, IDM" required
                />
              </div>

              <div className="form-group">
                <label>Role / Position <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  name="role" value={form.role}
                  onChange={handleChange} placeholder="e.g. Software Developer Intern" required
                />
              </div>

              <div className="form-group">
                <label>Skills Required</label>
                <input
                  name="skills" value={form.skills}
                  onChange={handleChange} placeholder="e.g. React, Node.js (comma separated)"
                />
              </div>

              {/* CHANGED: date fields replace duration input */}
              <div className="grid-2">
                <div className="form-group">
                  <label>Start Date <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input
                    type="date" name="startDate" value={form.startDate}
                    onChange={handleChange} required
                  />
                </div>
                <div className="form-group">
                  <label>End Date <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input
                    type="date" name="endDate" value={form.endDate}
                    onChange={handleChange} required
                  />
                </div>
              </div>

              {durationPreview() && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: -10, marginBottom: 16 }}>
                  Duration: <strong>{durationPreview()}</strong>
                </p>
              )}

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Submitting…' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
