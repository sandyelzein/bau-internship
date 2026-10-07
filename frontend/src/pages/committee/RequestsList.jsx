// src/pages/committee/RequestsList.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import StatusBadge from '../../components/common/StatusBadge';
import api from '../../api/axios';

export default function RequestsList() {
  const [searchParams] = useSearchParams();
  const [requests, setRequests]     = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading]       = useState(true);
  const [filters, setFilters]       = useState({
    status:    searchParams.get('status')    || '',
    studentId: searchParams.get('studentId') || '',
    page: 1,
  });

  const fetchRequests = useCallback(() => {
    setLoading(true);
    const params = {};
    Object.entries(filters).forEach(([k, v]) => { if (v !== '') params[k] = v; });
    api.get('/internships/requests', { params })
      .then(res => { setRequests(res.data.requests); setPagination(res.data.pagination); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const tabs = [
    { label: 'All',      value: '' },
    { label: 'Pending',  value: 'PENDING' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Rejected', value: 'REJECTED' },
  ];

  return (
    <>
      <Navbar />
      <div className="page-container">
        <div className="flex-between mb-24">
          <h1 className="page-title" style={{ margin: 0 }}>Internship Requests</h1>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {pagination.total ?? 0} total
          </span>
        </div>

        {/* Status tabs */}
        <div className="status-tabs mb-24">
          {tabs.map(tab => (
            <button
              key={tab.value}
              className={`status-tab ${filters.status === tab.value ? 'active' : ''}`}
              onClick={() => setFilters(f => ({ ...f, status: tab.value, page: 1 }))}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search by student ID */}
        <div className="card mb-16">
          <div className="card-body" style={{ padding: '12px 16px' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                type="text"
                value={filters.studentId}
                onChange={e => setFilters(f => ({ ...f, studentId: e.target.value, page: 1 }))}
                placeholder="Filter by Student ID…"
                style={{ padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 6, fontSize: '0.875rem', width: 240 }}
              />
              {filters.studentId && (
                <button className="btn btn-secondary btn-sm" onClick={() => setFilters(f => ({ ...f, studentId: '', page: 1 }))}>
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card">
          {loading ? (
            <div className="spinner" />
          ) : requests.length === 0 ? (
            <div className="empty-state"><p>No requests found.</p></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>Student</th>
                    <th>Company</th>
                    <th>Role</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(r => (
                    <tr key={r.id}>
                      <td><code style={{ fontSize: '0.78rem' }}>{r.requestCode}</code></td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{r.student?.fullName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.student?.studentId}</div>
                      </td>
                      <td>{r.companyName}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{r.role}</td>
                      <td>{r.durationWeeks}w</td>
                      <td><StatusBadge status={r.status} /></td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {new Date(r.submittedAt).toLocaleDateString()}
                      </td>
                      <td>
                        <Link to={`/committee/requests/${r.id}`} className="btn btn-secondary btn-sm">
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button disabled={filters.page <= 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>←</button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} className={filters.page === p ? 'active' : ''} onClick={() => setFilters(f => ({ ...f, page: p }))}>
                  {p}
                </button>
              ))}
              <button disabled={filters.page >= pagination.totalPages} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>→</button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .status-tabs { display: flex; gap: 4px; border-bottom: 2px solid var(--border); }
        .status-tab {
          padding: 8px 20px; border: none; background: none; cursor: pointer;
          font-size: 0.875rem; font-weight: 600; color: var(--text-muted);
          border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.15s;
        }
        .status-tab:hover { color: var(--primary); }
        .status-tab.active { color: var(--primary); border-bottom-color: var(--primary); }
      `}</style>
    </>
  );
}
