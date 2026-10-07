// src/pages/committee/EmailLogs.jsx
import React, { useEffect, useState } from 'react';
import Navbar from '../../components/common/Navbar';
import api from '../../api/axios';

const TRIGGER_LABELS = {
  REQUEST_APPROVED: 'Approved',
  REQUEST_REJECTED: 'Rejected',
};

export default function EmailLogs() {
  const [logs, setLogs]         = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.get('/committee/email-logs', { params: { page, limit: 15 } })
      .then(res => { setLogs(res.data.logs); setPagination(res.data.pagination); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <>
      <Navbar />
      <div className="page-container">
        <div className="flex-between mb-24">
          <h1 className="page-title" style={{ margin: 0 }}>Email Logs</h1>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            {pagination.total ?? 0} emails sent
          </span>
        </div>

        <div className="card">
          {loading ? (
            <div className="spinner" />
          ) : logs.length === 0 ? (
            <div className="empty-state"><p>No emails have been sent yet.</p></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Recipient</th>
                    <th>Subject</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <React.Fragment key={log.id}>
                      <tr>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {new Date(log.sentAt).toLocaleString()}
                        </td>
                        <td style={{ fontSize: '0.875rem' }}>{log.recipient}</td>
                        <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{log.subject}</td>
                        <td>
                          <span className={`badge ${log.triggerType === 'REQUEST_APPROVED' ? 'badge-approved' : 'badge-rejected'}`}>
                            {TRIGGER_LABELS[log.triggerType] || log.triggerType}
                          </span>
                        </td>
                        <td>
                          {log.status === 'SENT'
                            ? <span className="badge badge-approved">Sent</span>
                            : <span className="badge badge-rejected">Failed</span>}
                        </td>
                        <td>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                          >
                            {expanded === log.id ? 'Hide' : 'Preview'}
                          </button>
                        </td>
                      </tr>
                      {expanded === log.id && (
                        <tr>
                          <td colSpan={6} style={{ padding: 0 }}>
                            <div style={{ padding: '16px 20px', background: 'var(--bg-page)', borderTop: '1px solid var(--border)' }}>
                              {log.errorMessage && (
                                <div className="alert alert-error" style={{ marginBottom: 12 }}>
                                  <strong>Error:</strong> {log.errorMessage}
                                </div>
                              )}
                              <div style={{
                                background: 'white', border: '1px solid var(--border)',
                                borderRadius: 6, padding: 16, maxHeight: 360, overflowY: 'auto', fontSize: '0.85rem'
                              }}
                                dangerouslySetInnerHTML={{ __html: log.body }}
                              />
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>←</button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} className={page === p ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>→</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
