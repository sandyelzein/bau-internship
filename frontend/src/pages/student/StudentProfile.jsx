// src/pages/student/StudentProfile.jsx
import React, { useEffect, useState } from 'react';
import Navbar from '../../components/common/Navbar';
import StatusBadge from '../../components/common/StatusBadge';
import api from '../../api/axios';

export default function StudentProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/students/profile')
      .then(res => setProfile(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <><Navbar /><div className="spinner" /></>;

  return (
    <>
      <Navbar />
      <div className="page-container">
        <h1 className="page-title">My Profile</h1>

        <div className="grid-2" style={{ gridTemplateColumns: '1fr', alignItems: 'start' }}>
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
                ['GPA',               profile?.gpa ?? 'Not set'],
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
