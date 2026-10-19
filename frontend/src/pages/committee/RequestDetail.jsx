// src/pages/committee/RequestDetail.jsx
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import StatusBadge from '../../components/common/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const formatYear = value => value ? (/year/i.test(String(value)) ? value : `Year ${value}`) : '—';

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [request, setRequest]         = useState(null);
  const [loading, setLoading]         = useState(true);
  const [rejectionReason, setReason]  = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [msg, setMsg]                 = useState('');
  const [err, setErr]                 = useState('');

  // Internship status update
  const [internshipStatus, setIntStatus] = useState('');
  const [updatingStatus, setUpdating]    = useState(false);
  const [reviewingDocumentId, setReviewingDocumentId] = useState(null);

  const fetchRequest = () =>
    api.get(`/internships/requests/${id}`)
      .then(res => {
        setRequest(res.data);
        if (res.data.internship) setIntStatus(res.data.internship.status);
      })
      .catch(console.error);

  useEffect(() => {
    fetchRequest().finally(() => setLoading(false));
  }, [id]);

  const handleReview = async (status) => {
    if (status === 'REJECTED' && !rejectionReason.trim()) {
      return setErr('Please provide a rejection reason.');
    }
    setErr(''); setMsg(''); setSubmitting(true);
    try {
      await api.patch(`/internships/requests/${id}/review`, { status, rejectionReason });
      setMsg(`Request has been ${status.toLowerCase()} successfully.`);
      fetchRequest();
    } catch (e) {
      setErr(e.response?.data?.error || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInternshipStatusUpdate = async () => {
    setUpdating(true); setErr(''); setMsg('');
    try {
      await api.patch(`/internships/${request.internship.id}/status`, { status: internshipStatus });
      setMsg('Internship status updated.');
      fetchRequest();
    } catch (e) {
      setErr(e.response?.data?.error || 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  const handleCertificateReview = async (documentId) => {
    setReviewingDocumentId(documentId); setErr(''); setMsg('');
    try {
      await api.post(`/documents/${documentId}/review`);
      setMsg('Certificate marked as reviewed.');
      await fetchRequest();
    } catch (e) {
      setErr(e.response?.data?.error || 'Could not mark certificate as reviewed.');
    } finally {
      setReviewingDocumentId(null);
    }
  };

  if (loading) return <><Navbar /><div className="spinner" /></>;
  if (!request) return <><Navbar /><div className="page-container"><div className="alert alert-error">Request not found.</div></div></>;

  const isPending = request.status === 'PENDING';
  const minimumDurationMs = 14 * 24 * 60 * 60 * 1000;
  const belowMinimumDuration = request.startDate && request.endDate
    ? new Date(request.endDate) - new Date(request.startDate) < minimumDurationMs
    : request.durationWeeks < 2;
  const completionCertificates = request.internship?.documents?.filter(
    document => document.documentType === 'COMPLETION_CERTIFICATE'
  ) || [];
  const reviewedCertificate = completionCertificates.some(certificate => certificate.reviewedAt);

  return (
    <>
      <Navbar />
      <div className="page-container">
        {/* Breadcrumb */}
        <div style={{ marginBottom: 20, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          <Link to="/committee/requests" style={{ color: 'var(--primary)' }}>Requests</Link>
          {' / '}{request.requestCode}
        </div>

        {msg && <div className="alert alert-success">{msg}</div>}
        {err && <div className="alert alert-error">{err}</div>}

        <div className="grid-2" style={{ alignItems: 'start' }}>
          {/* Request details */}
          <div>
            <div className="card mb-24">
              <div className="card-header">
                <h3>Request Details</h3>
                <StatusBadge status={request.status} />
              </div>
              <div className="card-body">
                {belowMinimumDuration && (
                  <div className="alert alert-warning">
                    This internship is shorter than the required minimum of 2 weeks (14 days). Do not approve this request.
                  </div>
                )}
                {[
                  ['Request Code', request.requestCode],
                  ['Company',      request.companyName],
                  ['Role',         request.role],
                  ['Duration',     `${request.durationWeeks} weeks`],
                  ['Submitted',    new Date(request.submittedAt).toLocaleString()],
                  ...(request.reviewedAt ? [['Reviewed', new Date(request.reviewedAt).toLocaleString()]] : []),
                  ...(request.reviewedBy ? [['Reviewed By', request.reviewedBy.fullName]] : []),
                ].map(([label, val]) => (
                  <div key={label} className="detail-row">
                    <span className="detail-label">{label}</span>
                    <span className="detail-value">{val}</span>
                  </div>
                ))}

                {request.skills && (
                  <div className="detail-row">
                    <span className="detail-label">Skills</span>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {request.skills.split(',').map(s => s.trim()).filter(Boolean).map(skill => (
                        <span key={skill} style={{ background: 'var(--primary-pale)', color: 'var(--primary)', padding: '2px 10px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600 }}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="detail-row">
                  <span className="detail-label">Tasks</span>
                  <span className="detail-value" style={{ whiteSpace: 'pre-wrap' }}>{request.tasks || '—'}</span>
                </div>
                {request.attachments?.map(attachment => (
                  <div className="detail-row" key={attachment.id}>
                    <span className="detail-label">{attachment.type === 'ACCEPTANCE_LETTER' ? 'Acceptance Letter or Email' : 'Official Internship Tasks'}</span>
                    <a className="btn btn-secondary btn-sm" href={`${BACKEND_URL}/uploads/${attachment.filePath}`} target="_blank" rel="noreferrer">View {attachment.fileName}</a>
                  </div>
                ))}
                {!request.attachments?.length && request.evidenceFilePath && (
                  <div className="detail-row">
                    <span className="detail-label">Task Evidence</span>
                    <a className="btn btn-secondary btn-sm" href={`${BACKEND_URL}/uploads/${request.evidenceFilePath}`} target="_blank" rel="noreferrer">View {request.evidenceFileName}</a>
                  </div>
                )}

                {request.status === 'REJECTED' && request.rejectionReason && (
                  <div className="alert alert-error mt-16">
                    <div><strong>Rejection Reason:</strong> {request.rejectionReason}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Internship status update (only if approved) */}
            {request.internship && (
              <div className="card">
                <div className="card-header">
                  <h3>Internship Progress</h3>
                  <StatusBadge status={request.internship.status} />
                </div>
                <div className="card-body">
                  <div className="form-group">
                    <label>Completion Certificate</label>
                    {completionCertificates.length ? completionCertificates.map(certificate => (
                      <div key={certificate.id} style={{ marginBottom: 8 }}>
                        <a className="btn btn-secondary btn-sm" href={`${BACKEND_URL}/uploads/${certificate.filePath}`} target="_blank" rel="noreferrer">
                          Review {certificate.fileName}
                        </a>
                        {isAdmin && (certificate.reviewedAt ? (
                          <span className="badge badge-approved" style={{ marginLeft: 8 }}>Reviewed</span>
                        ) : (
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ marginLeft: 8 }}
                            onClick={() => handleCertificateReview(certificate.id)}
                            disabled={reviewingDocumentId !== null}
                          >
                            {reviewingDocumentId === certificate.id ? 'Saving…' : 'Mark Reviewed'}
                          </button>
                        ))}
                      </div>
                    )) : <p style={{ color: 'var(--text-muted)' }}>No completion certificate uploaded.</p>}
                  </div>
                  {isAdmin && !reviewedCertificate && (
                    <div className="alert alert-warning">
                      {completionCertificates.length === 0
                        ? 'A completion certificate must be uploaded before this internship can be completed.'
                        : 'Open and review the certificate, then mark it as reviewed before completing this internship.'}
                    </div>
                  )}
                  <div className="form-group">
                    <label>Update Internship Status</label>
                    <select value={internshipStatus} onChange={e => setIntStatus(e.target.value)}>
                      <option value="IN_PROGRESS">In Progress</option>
                      {(isAdmin || request.internship.status === 'COMPLETED') && (
                        <option value="COMPLETED" disabled={!isAdmin || !reviewedCertificate}>
                          Completed
                        </option>
                      )}
                      <option value="NOT_COMPLETED">Not Completed</option>
                    </select>
                  </div>
                  <button className="btn btn-primary" onClick={handleInternshipStatusUpdate} disabled={updatingStatus}>
                    {updatingStatus ? 'Updating…' : 'Update Status'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right column */}
          <div>
            {/* Student info */}
            <div className="card mb-24">
              <div className="card-header">
                <h3>Student</h3>
                <Link to={`/committee/students/${request.student?.studentId}`} className="btn btn-secondary btn-sm">
                  Full Profile
                </Link>
              </div>
              <div className="card-body">
                {[
                  ['Name',    request.student?.fullName],
                  ['ID',      request.student?.studentId],
                  ['Email',   request.student?.universityEmail],
                  ['Campus',  request.student?.campus || '—'],
                  ['GPA',     request.student?.gpa?.toFixed(2) ?? '—'],
                  ['Credits', request.student?.completedCredits ?? '—'],
                  ['Year',    formatYear(request.student?.academicYear)],
                ].map(([label, val]) => (
                  <div key={label} className="detail-row">
                    <span className="detail-label">{label}</span>
                    <span className="detail-value">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Review panel — only for pending */}
            {isPending && (
              <div className="card">
                <div className="card-header"><h3>Review This Request</h3></div>
                <div className="card-body">
                  <div className="form-group">
                    <label>Rejection Reason <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(required if rejecting)</span></label>
                    <textarea
                      value={rejectionReason}
                      onChange={e => setReason(e.target.value)}
                      placeholder="Explain the reason for rejection…"
                      rows={4}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      className="btn btn-success"
                      onClick={() => handleReview('APPROVED')}
                      disabled={submitting}
                    >
                      ✔ Approve
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleReview('REJECTED')}
                      disabled={submitting}
                    >
                      ✖ Reject
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .detail-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 9px 0; border-bottom: 1px solid var(--border); gap: 12px; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { font-size: 0.78rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.4px; flex-shrink: 0; }
        .detail-value { font-size: 0.875rem; color: var(--text-primary); text-align: right; }
      `}</style>
    </>
  );
}
