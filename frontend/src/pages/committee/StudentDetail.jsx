// src/pages/committee/StudentDetail.jsx
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import StatusBadge from '../../components/common/StatusBadge';
import api from '../../api/axios';

const DOC_LABELS = {
  COMPLETION_CERTIFICATE: 'Completion Certificate',
  RECOMMENDATION_LETTER: 'Recommendation Letter',
};

// ✅ FIX: Use absolute backend URL so documents open in new tab correctly
const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const formatYear = value => value ? (/year/i.test(String(value)) ? value : `Year ${value}`) : '—';

export default function StudentDetail() {
  const { studentId } = useParams();
  const [student, setStudent]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState('');
  const [err, setErr]           = useState('');

  const fetchStudent = () =>
    api.get(`/students/${studentId}`)
      .then(res => {
        setStudent(res.data);
        setEditForm({
          academicYear:     res.data.academicYear     ?? '',
          gpa:              res.data.gpa              ?? '',
          graduationStatus: res.data.graduationStatus ?? 'NOT_GRADUATED',
        });
      })
      .catch(console.error);

  useEffect(() => {
    fetchStudent().finally(() => setLoading(false));
  }, [studentId]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg(''); setErr('');
    try {
      await api.patch(`/students/${studentId}`, editForm);
      setMsg('Student updated successfully.');
      setEditing(false);
      fetchStudent();
    } catch (e) {
      setErr(e.response?.data?.error || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <><Navbar /><div className="spinner" /></>;
  if (!student) return <><Navbar /><div className="page-container"><div className="alert alert-error">Student not found.</div></div></>;

  return (
    <>
      <Navbar />
      <div className="page-container">
        {/* Breadcrumb */}
        <div style={{ marginBottom: 20, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          <Link to="/committee/students" style={{ color: 'var(--primary)' }}>Students</Link>
          {' / '}{student.fullName}
        </div>

        {msg && <div className="alert alert-success">{msg}</div>}
        {err && <div className="alert alert-error">{err}</div>}

        <div className="grid-2" style={{ alignItems: 'start' }}>
          {/* Left: Profile info */}
          <div>
            <div className="card mb-24">
              <div className="card-header">
                <h3>Student Information</h3>
                <button className="btn btn-secondary btn-sm" onClick={() => setEditing(!editing)}>
                  {editing ? 'Cancel' : 'Edit'}
                </button>
              </div>
              <div className="card-body">
                {editing ? (
                  <form onSubmit={handleSave}>
                    <div className="form-group">
                      <label>Academic Year</label>
                      <select value={editForm.academicYear} onChange={e => setEditForm(f => ({ ...f, academicYear: e.target.value }))}>
                        <option value="">—</option>
                        {[1,2,3,4].map(y => <option key={y} value={y}>Year {y}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>GPA</label>
                      <input type="number" step="0.01" min="0" max="4" value={editForm.gpa}
                        onChange={e => setEditForm(f => ({ ...f, gpa: e.target.value }))} placeholder="0.00 – 4.00" />
                    </div>
                    <div className="form-group">
                      <label>Graduation Status</label>
                      <select value={editForm.graduationStatus} onChange={e => setEditForm(f => ({ ...f, graduationStatus: e.target.value }))}>
                        <option value="NOT_GRADUATED">Not Graduated</option>
                        <option value="GRADUATED">Graduated</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
                      <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <>
                    {[
                      ['Student ID',       student.studentId],
                      ['Full Name',        student.fullName],
                      ['Email',            student.universityEmail],
                      ['Campus',           student.campus || '—'],
                      ['Phone',            student.phone  || '—'],
                      ['GPA',              student.gpa?.toFixed(2) ?? '—'],
                      ['Credits',          student.completedCredits ?? '—'],
                      ['Academic Year',    formatYear(student.academicYear)],
                    ].map(([label, val]) => (
                      <div key={label} className="profile-row">
                        <span className="profile-label">{label}</span>
                        <span className="profile-value">{val}</span>
                      </div>
                    ))}
                    <div className="profile-row">
                      <span className="profile-label">Graduation Status</span>
                      <StatusBadge status={student.graduationStatus || 'NOT_GRADUATED'} />
                    </div>
                    <div className="profile-row">
                      <span className="profile-label">Account</span>
                      {student.user
                        ? <span className="badge badge-approved">Active since {new Date(student.user.createdAt).toLocaleDateString()}</span>
                        : <span className="badge badge-not-started">No account</span>}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Documents */}
            <div className="card">
              <div className="card-header"><h3>Documents ({student.documents?.length || 0})</h3></div>
              <div className="card-body" style={{ padding: 0 }}>
                {!student.documents?.length ? (
                  <div className="empty-state" style={{ padding: '24px 20px' }}><p>No documents uploaded.</p></div>
                ) : student.documents.map(doc => (
                  <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{DOC_LABELS[doc.documentType]}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{doc.fileName} · {doc.internship?.request?.companyName || 'Legacy document'}</div>
                    </div>
                    {/* ✅ FIX: Absolute URL — was /uploads/... which React Router intercepted */}
                    <a
                      href={`${BACKEND_URL}/uploads/${doc.filePath}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary btn-sm"
                    >
                      View
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Internship requests */}
          <div className="card">
            <div className="card-header">
              <h3>Internship Requests ({student.internshipRequests?.length || 0})</h3>
              <Link to={`/committee/requests?studentId=${studentId}`} className="btn btn-secondary btn-sm">Filter</Link>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {!student.internshipRequests?.length ? (
                <div className="empty-state" style={{ padding: '24px 20px' }}><p>No requests submitted.</p></div>
              ) : student.internshipRequests.map(req => (
                <div key={req.id} style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.875rem' }}>{req.requestCode}</div>
                    <StatusBadge status={req.status} />
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                    <strong>{req.companyName}</strong> · {req.role}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                    {req.durationWeeks} weeks · {new Date(req.submittedAt).toLocaleDateString()}
                  </div>
                  {req.status === 'REJECTED' && req.rejectionReason && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--danger)', background: 'var(--danger-light)', padding: '6px 10px', borderRadius: 4 }}>
                      {req.rejectionReason}
                    </div>
                  )}
                  {req.internship && (
                    <div style={{ marginTop: 6 }}>
                      Internship: <StatusBadge status={req.internship.status} />
                    </div>
                  )}
                  <Link to={`/committee/requests/${req.id}`} className="btn btn-secondary btn-sm" style={{ marginTop: 8 }}>
                    View Details
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .profile-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border); gap: 12px; }
        .profile-row:last-child { border-bottom: none; }
        .profile-label { font-size: 0.78rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.4px; }
        .profile-value { font-size: 0.875rem; color: var(--text-primary); text-align: right; }
      `}</style>
    </>
  );
}
