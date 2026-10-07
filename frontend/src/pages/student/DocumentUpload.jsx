// src/pages/student/DocumentUpload.jsx
import React, { useEffect, useState, useRef } from 'react';
import Navbar from '../../components/common/Navbar';
import api from '../../api/axios';

const DOC_TYPES = [
  { value: 'OFFER_LETTER',           label: 'Offer Letter',           desc: 'Official offer letter from your company' },
  { value: 'COMPLETION_CERTIFICATE', label: 'Completion Certificate', desc: 'Certificate confirming internship completion' },
  { value: 'RECOMMENDATION_LETTER', label: 'Recommendation Letter',  desc: 'Letter of recommendation from supervisor' },
];

// ✅ FIX 1: Use absolute backend URL so the browser opens the file directly
// instead of routing through React Router (which caused page reload).
const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export default function DocumentUpload() {
  const [docs, setDocs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [docType, setDocType]     = useState('OFFER_LETTER');
  const [file, setFile]           = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage]     = useState('');
  const [error, setError]         = useState('');
  const fileRef                   = useRef();

  const fetchDocs = () =>
    api.get('/documents/my').then(res => setDocs(res.data)).catch(console.error);

  useEffect(() => {
    fetchDocs().finally(() => setLoading(false));
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return setError('Please select a file');
    setError(''); setMessage(''); setUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', docType);

    try {
      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage('Document uploaded successfully!');
      setFile(null);
      fileRef.current.value = '';
      fetchDocs();
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await api.delete(`/documents/${id}`);
      setDocs(d => d.filter(x => x.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed');
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getLabelForType = (type) => DOC_TYPES.find(d => d.value === type)?.label || type;

  return (
    <>
      <Navbar />
      <div className="page-container">
        <h1 className="page-title">Documents</h1>

        <div className="grid-2" style={{ alignItems: 'start', gap: 24 }}>
          {/* Upload form */}
          <div className="card">
            <div className="card-header"><h3>Upload Document</h3></div>
            <div className="card-body">
              <div className="alert alert-info" style={{ marginBottom: 20 }}>
                Only PDF files are accepted. Maximum file size: 10 MB.
              </div>

              {message && <div className="alert alert-success">{message}</div>}
              {error   && <div className="alert alert-error">{error}</div>}

              <form onSubmit={handleUpload}>
                <div className="form-group">
                  <label>Document Type</label>
                  <select value={docType} onChange={e => setDocType(e.target.value)}>
                    {DOC_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <small style={{ color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                    {DOC_TYPES.find(t => t.value === docType)?.desc}
                  </small>
                </div>

                <div className="form-group">
                  <label>Select PDF File</label>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    ref={fileRef}
                    onChange={e => setFile(e.target.files[0])}
                    required
                    style={{ padding: '8px 0', border: 'none', cursor: 'pointer' }}
                  />
                </div>

                <button type="submit" className="btn btn-primary" disabled={uploading}>
                  {uploading ? 'Uploading…' : 'Upload Document'}
                </button>
              </form>
            </div>
          </div>

          {/* Uploaded docs list */}
          <div className="card">
            <div className="card-header"><h3>Uploaded Documents ({docs.length})</h3></div>
            <div className="card-body" style={{ padding: loading ? 24 : 0 }}>
              {loading ? (
                <div className="spinner" />
              ) : docs.length === 0 ? (
                <div className="empty-state" style={{ padding: '30px 20px' }}>
                  <p>No documents uploaded yet.</p>
                </div>
              ) : (
                <div>
                  {docs.map(doc => (
                    <div key={doc.id} className="doc-item">
                      <div className="doc-icon">📄</div>
                      <div className="doc-info">
                        <div className="doc-type">{getLabelForType(doc.documentType)}</div>
                        <div className="doc-meta">
                          {doc.fileName} · {formatSize(doc.fileSize)}
                        </div>
                        <div className="doc-date">
                          {new Date(doc.uploadedAt).toLocaleDateString('en-GB', {
                            day: '2-digit', month: 'short', year: 'numeric'
                          })}
                        </div>
                      </div>
                      <div className="doc-actions">
                        {/* ✅ FIX: Absolute URL with backend port — opens in new tab correctly */}
                        <a
                          href={`${BACKEND_URL}/uploads/${doc.filePath}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary btn-sm"
                        >
                          View
                        </a>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(doc.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .doc-item {
          display: flex; align-items: center; gap: 12px;
          padding: 14px 20px; border-bottom: 1px solid var(--border);
        }
        .doc-item:last-child { border-bottom: none; }
        .doc-icon { font-size: 1.8rem; flex-shrink: 0; }
        .doc-info { flex: 1; min-width: 0; }
        .doc-type { font-weight: 700; font-size: 0.875rem; color: var(--primary); }
        .doc-meta { font-size: 0.78rem; color: var(--text-muted); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .doc-date { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }
        .doc-actions { display: flex; gap: 6px; flex-shrink: 0; }
      `}</style>
    </>
  );
}
