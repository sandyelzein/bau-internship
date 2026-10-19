// src/pages/committee/EmailLogs.jsx
import React, { useEffect, useState } from 'react';
import Navbar from '../../components/common/Navbar';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const TRIGGER_LABELS = {
  REQUEST_APPROVED: 'Approved',
  REQUEST_REJECTED: 'Rejected',
  MANUAL: 'Manual',
};

export default function EmailLogs() {
  const { isAdmin } = useAuth();
  const [logs, setLogs]         = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [expanded, setExpanded] = useState(null);
  const [email, setEmail] = useState({ to: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    setLoading(true);
    api.get('/committee/email-logs', { params: { page, limit: 15 } })
      .then(res => { setLogs(res.data.logs); setPagination(res.data.pagination); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, refresh]);

  const handleSend = async (event) => {
    event.preventDefault();
    setFeedback(null);
    setSending(true);
    try {
      await api.post('/committee/email-test', email);
      setFeedback({ type: 'success', message: 'Email sent successfully.' });
      setEmail(current => ({ ...current, message: '' }));
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.response?.data?.error || 'Email could not be sent. Please try again.',
      });
    } finally {
      setSending(false);
      setRefresh(value => value + 1);
    }
  };

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

        {isAdmin && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header"><h3>Send Test Email</h3></div>
            <div className="card-body">
              <p style={{ color: 'var(--text-secondary)', marginTop: 0 }}>
                Send a message through the configured email service. The result will appear in Email Logs.
              </p>
              {feedback && (
                <div className={`alert alert-${feedback.type === 'success' ? 'success' : 'error'}`} role="status">
                  {feedback.message}
                </div>
              )}
              <form onSubmit={handleSend}>
                <div className="form-group">
                  <label htmlFor="email-recipient">Recipient email</label>
                  <input
                    id="email-recipient"
                    type="email"
                    value={email.to}
                    onChange={event => setEmail(current => ({ ...current, to: event.target.value }))}
                    maxLength={254}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email-subject">Subject</label>
                  <input
                    id="email-subject"
                    value={email.subject}
                    onChange={event => setEmail(current => ({ ...current, subject: event.target.value }))}
                    maxLength={200}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email-message">Message</label>
                  <textarea
                    id="email-message"
                    value={email.message}
                    onChange={event => setEmail(current => ({ ...current, message: event.target.value }))}
                    maxLength={5000}
                    rows={6}
                    required
                  />
                  <small style={{ color: 'var(--text-muted)' }}>{email.message.length}/5000</small>
                </div>
                <button type="submit" className="btn btn-primary" disabled={sending}>
                  {sending ? 'Sending…' : 'Send Email'}
                </button>
              </form>
            </div>
          </div>
        )}

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
