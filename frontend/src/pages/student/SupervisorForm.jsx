// src/pages/student/SupervisorForm.jsx  — NEW FILE
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import api from '../../api/axios';

export default function SupervisorForm() {
  const navigate = useNavigate();

  const [existing, setExisting]   = useState(null);  // existing supervisor or null
  const [loading, setLoading]     = useState(true);
  const [form, setForm]           = useState({ name: '', email: '', phone: '' });
  const [saving, setSaving]       = useState(false);
  const [success, setSuccess]     = useState('');
  const [error, setError]         = useState('');

  useEffect(() => {
    api.get('/supervisor/my')
      .then(res => {
        if (res.data.supervisor) {
          setExisting(res.data.supervisor);
          setForm({
            name:  res.data.supervisor.name,
            email: res.data.supervisor.email,
            phone: res.data.supervisor.phone || '',
          });
        }
      })
      .catch(err => {
        // 404 just means no approved internship yet — handled below
        if (err.response?.status !== 404) console.error(err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setSaving(true);
    try {
      if (existing) {
        await api.patch('/supervisor/my', form);
        setSuccess('Supervisor information updated successfully.');
      } else {
        await api.post('/supervisor/my', form);
        setSuccess('Supervisor information saved successfully.');
        setExisting(form); // treat as existing now
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save supervisor information');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <><Navbar /><div className="spinner" /></>;

  return (
    <>
      <Navbar />
      <div className="page-container">
        <div style={{ marginBottom: 20, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          <span
            style={{ color: 'var(--primary)', cursor: 'pointer' }}
            onClick={() => navigate('/student')}
          >
            Dashboard
          </span>
          {' / '}Supervisor Information
        </div>

        <h1 className="page-title">
          {existing ? 'Edit Supervisor Information' : 'Add Supervisor Information'}
        </h1>

        <div className="card" style={{ maxWidth: 560 }}>
          <div className="card-header">
            <h3>Internship Supervisor</h3>
          </div>
          <div className="card-body">
            <div className="alert alert-info" style={{ marginBottom: 20 }}>
              Your supervisor's email will be used to send an automated evaluation request
              near the end of your internship.
            </div>

            {success && <div className="alert alert-success">{success}</div>}
            {error   && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Supervisor Full Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  name="name" value={form.name} onChange={handleChange}
                  placeholder="e.g. Dr. John Smith" required
                />
              </div>

              <div className="form-group">
                <label>Supervisor Email <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  type="email" name="email" value={form.email} onChange={handleChange}
                  placeholder="supervisor@company.com" required
                />
              </div>

              <div className="form-group">
                <label>Supervisor Phone <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                <input
                  name="phone" value={form.phone} onChange={handleChange}
                  placeholder="+961 3 000 000"
                />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => navigate('/student')}>
                  Back
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : existing ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
