// src/pages/student/MyRequests.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import StatusBadge from '../../components/common/StatusBadge';
import api from '../../api/axios';

export default function MyRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.get('/internships/requests/my')
      .then(res => setRequests(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const hasActive = requests.some(r => ['PENDING', 'APPROVED'].includes(r.status));

  return (
    <>
      <Navbar />
      <div className="page-container">
        <div className="flex-between mb-24">
          <h1 className="page-title" style={{ margin: 0 }}>My Internship Requests</h1>
          {!hasActive && (
            <Link to="/student/request/new" className="btn btn-primary">+ New Request</Link>
          )}
        </div>

        {loading ? (
          <div className="spinner" />
        ) : requests.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <p>You haven't submitted any internship requests yet.</p>
              <Link to="/student/request/new" className="btn btn-primary mt-16">Submit Your First Request</Link>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {requests.map(req => (
              <div key={req.id} className="card">
                <div className="card-body">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.95rem' }}>
                          {req.requestCode}
                        </span>
                        <StatusBadge status={req.status} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '6px 24px' }}>
                        <div className="info-item"><span className="info-key">Company:</span> {req.companyName}</div>
                        <div className="info-item"><span className="info-key">Role:</span> {req.role}</div>
                        <div className="info-item"><span className="info-key">Duration:</span> {req.durationWeeks} weeks</div>
                        <div className="info-item"><span className="info-key">Submitted:</span> {new Date(req.submittedAt).toLocaleDateString()}</div>
                        {req.reviewedAt && (
                          <div className="info-item"><span className="info-key">Reviewed:</span> {new Date(req.reviewedAt).toLocaleDateString()}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {req.status === 'REJECTED' && req.rejectionReason && (
                    <div className="alert alert-error mt-16">
                      <div><strong>Rejection Reason:</strong> {req.rejectionReason}</div>
                    </div>
                  )}

                  {req.status === 'APPROVED' && req.internship && (
                    <div className="alert alert-success mt-16">
                      Internship Status: <StatusBadge status={req.internship.status} />
                    </div>
                  )}

                  {req.skills && (
                    <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {req.skills.split(',').map(s => s.trim()).filter(Boolean).map(skill => (
                        <span key={skill} style={{
                          background: 'var(--primary-pale)', color: 'var(--primary)',
                          padding: '2px 10px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600
                        }}>{skill}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .info-item { font-size: 0.85rem; color: var(--text-secondary); }
        .info-key  { font-weight: 600; color: var(--text-primary); }
      `}</style>
    </>
  );
}
