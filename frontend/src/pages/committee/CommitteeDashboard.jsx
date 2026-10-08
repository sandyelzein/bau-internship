// src/pages/committee/CommitteeDashboard.jsx
// CHANGED: added evaluation tracking section below existing stats
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import StatusBadge from '../../components/common/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

function StatCard({ label, value, color, link, icon }) {
  const card = (
    <div className="stat-card" style={{ borderTopColor: color }}>
      <div className="stat-card-icon">{icon}</div>
      <div className="stat-card-value" style={{ color }}>{value}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  );
  return link
    ? <Link to={link} className="stat-card-link">{card}</Link>
    : card;
}

const EVAL_STATUS_TABS = [
  { label: 'All',          value: '' },
  { label: 'Not Sent',     value: 'NOT_SENT' },
  { label: 'Sent',         value: 'SENT' },
  { label: 'Completed',    value: 'COMPLETED' },
  { label: 'Overdue',      value: 'OVERDUE' },
];

export default function CommitteeDashboard() {
  const { user, isAdmin } = useAuth();
  const [stats, setStats]             = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [requestsOpen, setRequestsOpen] = useState(true);
  const [settingSaving, setSettingSaving] = useState(false);

  // Evaluation table state
  const [evalRows, setEvalRows]       = useState([]);
  const [evalPagination, setEvalPagination] = useState({});
  const [evalFilter, setEvalFilter]   = useState('');
  const [evalPage, setEvalPage]       = useState(1);
  const [evalLoading, setEvalLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/stats')
      .then(res => setStats(res.data))
      .catch(console.error)
      .finally(() => setStatsLoading(false));
  }, []);

  useEffect(() => {
    api.get('/internships/settings').then(res => setRequestsOpen(res.data.requestsOpen)).catch(console.error);
  }, []);

  const toggleRequests = async () => {
    setSettingSaving(true);
    try {
      const res = await api.patch('/internships/settings', { requestsOpen: !requestsOpen });
      setRequestsOpen(res.data.requestsOpen);
    } finally { setSettingSaving(false); }
  };

  useEffect(() => {
    setEvalLoading(true);
    const params = { page: evalPage, limit: 10 };
    if (evalFilter) params.evaluationStatus = evalFilter;

    api.get('/evaluation', { params })
      .then(res => {
        setEvalRows(res.data.rows);
        setEvalPagination(res.data.pagination);
      })
      .catch(console.error)
      .finally(() => setEvalLoading(false));
  }, [evalFilter, evalPage]);

  const evalStatusColor = {
    NOT_SENT:  '#6c757d',
    SENT:      '#007bff',
    COMPLETED: '#28a745',
    OVERDUE:   '#dc3545',
  };

  return (
    <>
      <Navbar />
      <div className="page-container">

        {/* Welcome banner */}
        <div className="committee-banner">
          <div>
            <h1>Welcome, {user?.fullName}</h1>
            <p>{isAdmin ? 'System Administrator' : 'Committee Member'} · BAU Internship System</p>
          </div>
          <div className="banner-actions">
            <Link to="/committee/requests?status=PENDING"
              className="btn btn-primary"
              style={{ background: 'white', color: 'var(--primary)' }}>
              Review Requests
            </Link>
            {isAdmin && (
              <>
                <button onClick={toggleRequests} disabled={settingSaving} className="btn btn-secondary" style={{ borderColor: 'white', color: 'white', background: 'transparent' }}>
                  {requestsOpen ? '🔓 Close Requests' : '🔒 Open Requests'}
                </button>
                <Link to="/committee/import" className="btn btn-secondary" style={{ borderColor: 'white', color: 'white' }}>Import Students</Link>
              </>
            )}
          </div>
        </div>

        {/* ── Stats ── */}
        {statsLoading ? <div className="spinner" /> : (
          <>
            <h2 className="section-title">Overview</h2>
            <div className="grid-4 mb-24">
              <StatCard label="Total Students"        value={stats?.totalStudents}          color="#003571" icon="🎓" link="/committee/students" />
              <StatCard label="Without Accounts"      value={stats?.studentsWithoutAccounts} color="#f0a500" icon="👤" link="/committee/students?hasAccount=false" />
              <StatCard label="Accounts Without Requests" value={stats?.studentsWithoutRequests} color="#6c757d" icon="📋" link="/committee/students?hasAccount=true&hasRequest=false" />
              <StatCard label="Completed Internships" value={stats?.completedInternships}    color="#28a745" icon="✅" link="/committee/students?internshipStatus=COMPLETED" />
            </div>

            <h2 className="section-title">Requests</h2>
            <div className="grid-3 mb-24">
              <StatCard label="Pending Review"    value={stats?.pendingRequests}  color="#ffc107" icon="⏳" link="/committee/requests?status=PENDING" />
              <StatCard label="Approved Requests" value={stats?.approvedRequests} color="#28a745" icon="✔️"  link="/committee/requests?status=APPROVED" />
              <StatCard label="Rejected Requests" value={stats?.rejectedRequests} color="#dc3545" icon="✖️" link="/committee/requests?status=REJECTED" />
            </div>
          </>
        )}

        {/* ── NEW: Evaluation Tracking Table ── */}
        <h2 className="section-title">Evaluation Tracking</h2>

        {/* Filter tabs */}
        <div className="status-tabs mb-16">
          {EVAL_STATUS_TABS.map(tab => (
            <button
              key={tab.value}
              className={`status-tab ${evalFilter === tab.value ? 'active' : ''}`}
              onClick={() => { setEvalFilter(tab.value); setEvalPage(1); }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="card mb-24">
          {evalLoading ? (
            <div className="spinner" />
          ) : evalRows.length === 0 ? (
            <div className="empty-state"><p>No internships found.</p></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Company / Role</th>
                    <th>Dates</th>
                    <th>Supervisor</th>
                    <th>Evaluation</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {evalRows.map(row => (
                    <tr key={row.internshipId}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{row.studentName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.studentId}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{row.companyName}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{row.role}</div>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        <div>{new Date(row.startDate).toLocaleDateString()}</div>
                        <div>→ {new Date(row.endDate).toLocaleDateString()}</div>
                      </td>
                      <td>
                        {row.supervisorName
                          ? (
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{row.supervisorName}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.supervisorEmail}</div>
                            </div>
                          )
                          : <span style={{ color: 'var(--danger)', fontSize: '0.82rem', fontWeight: 600 }}>Missing</span>
                        }
                      </td>
                      <td>
                        <span className="badge" style={{
                          background: `${evalStatusColor[row.evaluationStatus]}18`,
                          color: evalStatusColor[row.evaluationStatus],
                          border: `1px solid ${evalStatusColor[row.evaluationStatus]}40`,
                        }}>
                          {row.evaluationStatus.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        {row.evaluation
                          ? (
                            <div title="Overall performance score">
                              <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1rem' }}>
                                {row.evaluation.overallPerformance}
                              </span>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>/5</span>
                              {row.evaluation.wouldRecommend
                                ? <span style={{ marginLeft: 6, fontSize: '0.75rem', color: '#28a745' }}>✔ Rec.</span>
                                : <span style={{ marginLeft: 6, fontSize: '0.75rem', color: '#dc3545' }}>✖ No Rec.</span>
                              }
                            </div>
                          )
                          : <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>—</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {evalPagination.totalPages > 1 && (
            <div className="pagination">
              <button disabled={evalPage <= 1} onClick={() => setEvalPage(p => p - 1)}>←</button>
              {Array.from({ length: evalPagination.totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} className={evalPage === p ? 'active' : ''} onClick={() => setEvalPage(p)}>{p}</button>
              ))}
              <button disabled={evalPage >= evalPagination.totalPages} onClick={() => setEvalPage(p => p + 1)}>→</button>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="card">
          <div className="card-header"><h3>Quick Actions</h3></div>
          <div className="card-body">
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link to="/committee/requests?status=PENDING" className="btn btn-primary">📋 Review Pending</Link>
              <Link to="/committee/students" className="btn btn-secondary">👥 All Students</Link>
              {isAdmin && (
                <>
                  <Link to="/committee/import"  className="btn btn-secondary">📥 Import Students</Link>
                  <Link to="/committee/members" className="btn btn-secondary">👤 Manage Members</Link>
                </>
              )}
              <Link to="/committee/email-logs" className="btn btn-secondary">📧 Email Logs</Link>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .committee-banner { background:linear-gradient(135deg,var(--primary) 0%,var(--primary-light) 100%);color:white;padding:28px 32px;border-radius:var(--radius-md);display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:32px;flex-wrap:wrap; }
        .committee-banner h1 { font-size:1.4rem;margin-bottom:4px; }
        .committee-banner p  { font-size:0.875rem;opacity:0.8; }
        .banner-actions { display:flex;gap:10px;flex-wrap:wrap; }
        .stat-card-link { text-decoration:none;display:block; }
        .stat-card-link:hover .stat-card { transform:translateY(-3px);box-shadow:var(--shadow-md); }
        .stat-card { background:white;border-radius:var(--radius-md);padding:20px;border:1px solid var(--border);border-top:4px solid;transition:all 0.18s;text-align:center; }
        .stat-card-icon  { font-size:1.8rem;margin-bottom:8px; }
        .stat-card-value { font-size:2.2rem;font-weight:800;line-height:1;margin-bottom:6px; }
        .stat-card-label { font-size:0.8rem;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:0.4px; }
        .status-tabs { display:flex;gap:4px;border-bottom:2px solid var(--border); }
        .status-tab { padding:8px 16px;border:none;background:none;cursor:pointer;font-size:0.875rem;font-weight:600;color:var(--text-muted);border-bottom:2px solid transparent;margin-bottom:-2px;transition:all 0.15s; }
        .status-tab:hover  { color:var(--primary); }
        .status-tab.active { color:var(--primary);border-bottom-color:var(--primary); }
      `}</style>
    </>
  );
}
