// src/pages/student/StudentProfile.jsx
import React, { useEffect, useState } from 'react';
import Navbar from '../../components/common/Navbar';
import StatusBadge from '../../components/common/StatusBadge';
import api from '../../api/axios';

export default function StudentProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gpa, setGpa]         = useState('');
  const [gpaMsg, setGpaMsg]   = useState('');
  const [gpaErr, setGpaErr]   = useState('');
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    api.get('/students/profile')
      .then(res => { setProfile(res.data); setGpa(res.data.gpa ?? ''); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleGpaUpdate = async (e) => {
    e.preventDefault();
    setGpaMsg(''); setGpaErr('');
    setSaving(true);
    try {
      const res = await api.patch('/students/profile/gpa', { gpa });
      setGpaMsg('GPA updated successfully!');
      setProfile(p => ({ ...p, gpa: res.data.gpa }));
    } catch (err) {
      setGpaErr(err.response?.data?.error || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <><Navbar /><div className="spinner" /></>;

  return (
    <>
      <Navbar />
      <div className="page-container">
        <h1 className="page-title">My Profile</h1>

        <div className="grid-2" style={{ alignItems: 'start' }}>
          {/* Profile info card */}
          <div className="card">
            <div className="card-header"><h3>Student Information</h3></div>
            <div className="card-body">
              {[
                ['Student ID',        profile?.studentId],
                ['Full Name',         profile?.fullName],
                ['University Email',  profile?.universityEmail],
                ['Campus',            profile?.campus || '—'],
                ['Phone',             profile?.phone  || '—'],
                ['Completed Credits', profile?.completedCredits ?? '—'],
                ['Academic Year',     profile?.academicYear || '—'],
              ].map(([label, value]) => (
                <div key={label} className="profile-row">
                  <span className="profile-label">{label}</span>
                  <span className="profile-value">{value}</span>
                </div>
              ))}

              <div className="profile-row">
                <span className="profile-label">Graduation Status</span>
                <StatusBadge status={profile?.graduationStatus || 'NOT_GRADUATED'} />
              </div>
            </div>
          </div>

          {/* GPA update card */}
          <div className="card">
            <div className="card-header"><h3>Update GPA</h3></div>
            <div className="card-body">
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                Your current GPA: <strong style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>{profile?.gpa ?? 'Not set'}</strong>
              </p>

              {gpaMsg && <div className="alert alert-success">{gpaMsg}</div>}
              {gpaErr && <div className="alert alert-error">{gpaErr}</div>}

              <form onSubmit={handleGpaUpdate}>
                <div className="form-group">
                  <label>New GPA (0.00 – 4.00)</label>
                  <input
                    type="number"
                    value={gpa}
                    onChange={e => setGpa(e.target.value)}
                    placeholder="e.g. 3.75"
                    step="0.01" min="0" max="4"
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Update GPA'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .profile-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 10px 0; border-bottom: 1px solid var(--border);
          gap: 12px;
        }
        .profile-row:last-child { border-bottom: none; }
        .profile-label { font-size: 0.82rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.4px; }
        .profile-value { font-size: 0.9rem; color: var(--text-primary); text-align: right; }
      `}</style>
    </>
  );
}
