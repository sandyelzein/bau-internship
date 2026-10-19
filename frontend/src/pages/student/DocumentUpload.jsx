import React, { useEffect, useRef, useState } from 'react';
import Navbar from '../../components/common/Navbar';
import StatusBadge from '../../components/common/StatusBadge';
import api from '../../api/axios';

const CERTIFICATE_TYPE = 'COMPLETION_CERTIFICATE';
const CERTIFICATE_LABEL = 'Completion Certificate';
const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export default function DocumentUpload() {
  const [internships, setInternships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef();

  const load = () => api.get('/documents/my-internships').then(res => {
    setInternships(res.data);
    const firstAvailable = res.data.find(item => item.status === 'COMPLETED')
      || res.data.find(item => item.status === 'IN_PROGRESS');
    setSelectedId(current => current || (firstAvailable ? String(firstAvailable.id) : ''));
  });
  useEffect(() => { load().catch(console.error).finally(() => setLoading(false)); }, []);

  const upload = async (event) => {
    event.preventDefault();
    if (!selectedId || !file) return setError('Select an internship and PDF file');
    const selectedInternship = internships.find(item => String(item.id) === selectedId);
    const payload = new FormData();
    payload.append('documentType', CERTIFICATE_TYPE); payload.append('internshipId', selectedId); payload.append('file', file);
    setUploading(true); setError(''); setMessage('');
    try {
      await api.post('/documents/upload', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMessage('Document uploaded successfully.'); setFile(null); fileRef.current.value = ''; await load();
    } catch (err) { setError(err.response?.data?.error || 'Upload failed'); }
    finally { setUploading(false); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this document?')) return;
    try { await api.delete(`/documents/${id}`); await load(); }
    catch (err) { setError(err.response?.data?.error || 'Delete failed'); }
  };

  const availableInternships = internships.filter(item => ['IN_PROGRESS', 'COMPLETED'].includes(item.status));
  const selectedInternship = internships.find(item => String(item.id) === selectedId);

  return <><Navbar /><div className="page-container">
    <h1 className="page-title">My Internships</h1>
    <div className="alert alert-info">Upload the completion certificate for an internship in progress. The administrator will review it before marking the internship complete.</div>
    {message && <div className="alert alert-success">{message}</div>}
    {error && <div className="alert alert-error">{error}</div>}

    {loading ? <div className="spinner" /> : internships.length === 0 ? (
      <div className="card"><div className="empty-state"><p>No approved internships yet.</p></div></div>
    ) : <>
      {internships.map(item => <div className="card mb-24" key={item.id}>
        <div className="card-header"><h3>{item.request.companyName} · {item.request.role}</h3><StatusBadge status={item.status} /></div>
        <div className="card-body">
          <p><strong>Request:</strong> {item.request.requestCode}</p>
          <p><strong>Dates:</strong> {new Date(item.request.startDate).toLocaleDateString()} – {new Date(item.request.endDate).toLocaleDateString()}</p>
          <p style={{ marginBottom: 14 }}><strong>Supervisor:</strong> {item.supervisor ? `${item.supervisor.name}${item.supervisor.position ? ` · ${item.supervisor.position}` : ''}` : 'Not added'}</p>
          {item.documents.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No documents uploaded for this internship.</p> : item.documents.map(doc => <div key={doc.id} className="flex-between" style={{ borderTop: '1px solid var(--border)', padding: '10px 0', gap: 12 }}>
            <div><strong>{DOC_TYPES.find(type => type.value === doc.documentType)?.label || doc.documentType}</strong><div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>{doc.fileName}</div></div>
            <div className="flex gap-8"><a className="btn btn-secondary btn-sm" href={`${BACKEND_URL}/uploads/${doc.filePath}`} target="_blank" rel="noreferrer">View</a><button className="btn btn-danger btn-sm" onClick={() => remove(doc.id)}>Delete</button></div>
          </div>)}
        </div>
      </div>)}

      <div className="card" style={{ maxWidth: 640 }}>
            <div className="card-header"><h3>Upload Completion Certificate</h3></div>
        <div className="card-body">
          {!availableInternships.length ? <div className="alert alert-warning">There are no in-progress or completed internships available for document upload.</div> : <form onSubmit={upload}>
            <div className="form-group"><label>Internship</label><select value={selectedId} onChange={e => {
              const nextInternship = internships.find(item => String(item.id) === e.target.value);
              setSelectedId(e.target.value);
              if (nextInternship?.status === 'IN_PROGRESS') setDocType('COMPLETION_CERTIFICATE');
            }} required><option value="">Select</option>{availableInternships.map(item => <option value={item.id} key={item.id}>{item.request.companyName} · {item.request.requestCode} · {item.status === 'COMPLETED' ? 'Completed' : 'In Progress'}</option>)}</select></div>
            <div className="form-group"><label>Completion Certificate (PDF)</label><input ref={fileRef} type="file" accept=".pdf,application/pdf" onChange={e => setFile(e.target.files[0])} required /></div>
            <button className="btn btn-primary" disabled={uploading}>{uploading ? 'Uploading…' : 'Upload Document'}</button>
          </form>}
        </div>
      </div>
    </>}
  </div></>;
}
