// src/pages/student/StudentDashboard.jsx
// CHANGED: added supervisor information section after approval
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import StatusBadge from '../../components/common/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [requests, setRequests]       = useState([]);
  const [docs, setDocs]               = useState([]);
  const [supervisorData, setSupervisorData] = useState(null); // { supervisor, evaluationStatus }
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/internships/requests/my'),
      api.get('/documents/my'),
    ]).then(([reqRes, docRes]) => {
      setRequests(reqRes.data);
      setDocs(docRes.data);

      // Fetch supervisor info only if student has an approved request
      const hasApproved = reqRes.data.some(r => r.status === 'APPROVED');
      if (hasApproved) {
        return api.get('/supervisor/my').then(res => setSupervisorData(res.data));
      }
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const latestRequest   = requests[0] || null;
  const hasActiveRequest = latestRequest && ['PENDING', 'APPROVED'].includes(latestRequest.status);
  const approvedRequest  = requests.find(r => r.status === 'APPROVED');

  return (
    <>
      <Navbar />
      <div className="page-container">
        {/* Welcome banner */}
        <div className="student-welcome-banner">
          <div>
            <h1>Welcome, {user?.fullName} 👋</h1>
            <p>Student ID: <strong>{user?.studentId}</strong></p>
          </div>
          {!hasActiveRequest && (
            <Link to="/student/request/new" className="btn btn-primary">
              + New Internship Request
            </Link>
          )}
        </div>

        {loading ? <div className="spinner" /> : (
          <>
            {/* Quick stats */}
            <div className="grid-3 mb-24">
              <div className="card">
                <div className="card-body" style={{ textAlign: 'center' }}>
                  <div className="stat-number">{requests.length}</div>
                  <div className="stat-label">Total Requests</div>
                </div>
              </div>
              <div className="card">
                <div className="card-body" style={{ textAlign: 'center' }}>
                  <div className="stat-number">{docs.length}</div>
                  <div className="stat-label">Uploaded Documents</div>
                </div>
              </div>
              <div className="card">
                <div className="card-body" style={{ textAlign: 'center' }}>
                  {latestRequest ? (
                    <div style={{ paddingTop: 4 }}>
                      <StatusBadge status={latestRequest.status} />
                      <div className="stat-label" style={{ marginTop: 6 }}>Latest Request</div>
                    </div>
                  ) : (
                    <>
                      <div className="stat-number" style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>—</div>
                      <div className="stat-label">No Requests Yet</div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* ── NEW: Supervisor Information Section ── */}
            {approvedRequest && (
              <div className="card mb-24">
                <div className="card-header">
                  <h3>Supervisor Information</h3>
                  <Link to="/student/supervisor" className="btn btn-secondary btn-sm">
                    {supervisorData?.supervisor ? 'Edit' : 'Add Supervisor'}
                  </Link>
                </div>
                <div className="card-body">
                  {!supervisorData?.supervisor ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                      <div className="alert alert-warning" style={{ flex: 1, margin: 0 }}>
                        ⚠️ Supervisor information not yet submitted. Please add your supervisor's details so the evaluation process can proceed.
                      </div>
                      <Link to="/student/supervisor" className="btn btn-primary">
                        Add Supervisor Information
                      </Link>
                    </div>
                  ) : (
                    <div className="grid-2">
                      {[
                        ['Supervisor Name',  supervisorData.supervisor.name],
                        ['Supervisor Email', supervisorData.supervisor.email],
                        ['Supervisor Phone', supervisorData.supervisor.phone || '—'],
                        ['Evaluation Status', null], // rendered separately
                      ].map(([label, val]) => (
                        <div key={label} className="info-row">
                          <span className="info-label">{label}</span>
                          {label === 'Evaluation Status'
                            ? <StatusBadge status={supervisorData.evaluationStatus || 'NOT_SENT'} />
                            : <span className="info-value">{val}</span>
                          }
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Latest request card */}
            {latestRequest && (
              <div className="card mb-24">
                <div className="card-header">
                  <h3>Latest Internship Request</h3>
                  <Link to="/student/requests" className="btn btn-secondary btn-sm">View All</Link>
                </div>
                <div className="card-body">
                  <div className="grid-2">
                    {[
                      ['Request ID',  latestRequest.requestCode],
                      ['Company',     latestRequest.companyName],
                      ['Role',        latestRequest.role],
                      ['Start Date',  latestRequest.startDate ? new Date(latestRequest.startDate).toLocaleDateString() : '—'],
                      ['End Date',    latestRequest.endDate   ? new Date(latestRequest.endDate).toLocaleDateString()   : '—'],
                      ['Duration',    latestRequest.durationWeeks ? `${latestRequest.durationWeeks} weeks` : '—'],
                      ['Submitted',   new Date(latestRequest.submittedAt).toLocaleDateString()],
                    ].map(([label, val]) => (
                      <div key={label} className="info-row">
                        <span className="info-label">{label}</span>
                        <span className="info-value">{val}</span>
                      </div>
                    ))}
                    <div className="info-row">
                      <span className="info-label">Status</span>
                      <StatusBadge status={latestRequest.status} />
                    </div>
                  </div>

                  {latestRequest.status === 'REJECTED' && latestRequest.rejectionReason && (
                    <div className="alert alert-error mt-16">
                      <strong>Rejection Reason:</strong> {latestRequest.rejectionReason}
                    </div>
                  )}
                  {latestRequest.status === 'APPROVED' && (
                    <div className="alert alert-success mt-16">
                      🎉 Your internship is approved! Upload your documents and add supervisor info.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div className="card">
              <div className="card-header"><h3>Quick Actions</h3></div>
              <div className="card-body">
                <div className="quick-actions">
                  {!hasActiveRequest && (
                    <Link to="/student/request/new" className="quick-action-btn">
                      <span className="quick-action-icon">📝</span><span>Submit Request</span>
                    </Link>
                  )}
                  {approvedRequest && (
                    <Link to="/student/supervisor" className="quick-action-btn">
                      <span className="quick-action-icon">👔</span>
                      <span>{supervisorData?.supervisor ? 'Edit Supervisor' : 'Add Supervisor'}</span>
                    </Link>
                  )}
                  <Link to="/student/documents" className="quick-action-btn">
                      <span className="quick-action-icon">📂</span><span>My Internships</span>
                  </Link>
                  <Link to="/student/requests" className="quick-action-btn">
                    <span className="quick-action-icon">📋</span><span>View History</span>
                  </Link>
                  <Link to="/student/profile" className="quick-action-btn">
                    <span className="quick-action-icon">👤</span><span>My Profile</span>
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        .student-welcome-banner { display:flex;align-items:center;justify-content:space-between;background:var(--primary);color:white;padding:24px 28px;border-radius:var(--radius-md);margin-bottom:24px;gap:16px; }
        .student-welcome-banner h1 { font-size:1.4rem;margin-bottom:4px; }
        .student-welcome-banner p  { font-size:0.875rem;opacity:0.85; }
        .stat-number { font-size:2rem;font-weight:800;color:var(--primary); }
        .stat-label  { font-size:0.8rem;color:var(--text-muted);margin-top:4px; }
        .info-row    { display:flex;flex-direction:column;gap:2px;padding:10px 0;border-bottom:1px solid var(--border); }
        .info-label  { font-size:0.75rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px; }
        .info-value  { font-size:0.9rem;color:var(--text-primary); }
        .quick-actions { display:flex;gap:12px;flex-wrap:wrap; }
        .quick-action-btn { display:flex;flex-direction:column;align-items:center;gap:8px;padding:18px 24px;background:var(--primary-pale);border-radius:var(--radius-md);text-decoration:none;color:var(--primary);font-weight:600;font-size:0.85rem;transition:all 0.15s;min-width:110px;text-align:center;border:1.5px solid transparent; }
        .quick-action-btn:hover { background:var(--primary);color:white;text-decoration:none; }
        .quick-action-icon { font-size:1.6rem; }
        @media (max-width:600px) { .student-welcome-banner { flex-direction:column;align-items:flex-start; } }
      `}</style>
    </>
  );
}
