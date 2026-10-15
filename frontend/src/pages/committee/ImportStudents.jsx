// src/pages/committee/ImportStudents.jsx
import React, { useState, useRef } from 'react';
import Navbar from '../../components/common/Navbar';
import api from '../../api/axios';

export default function ImportStudents() {
  const [importType, setImportType] = useState('students');
  const [file, setFile]         = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [results, setResults]   = useState(null);
  const [error, setError]       = useState('');
  const fileRef                 = useRef();

  const handleFile = (f) => {
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls'].includes(ext)) {
      return setError('Only Excel files (.xlsx) are accepted.');
    }
    setError('');
    setFile(f);
    setResults(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return setError('Please select an Excel file first.');
    setError(''); setUploading(true); setResults(null);

    const formData = new FormData();
    formData.append('type', importType);
    formData.append('file', file);

    try {
      const res = await api.post('/committee/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResults(res.data.results);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      setError(err.response?.data?.error || 'Import failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="page-container">
        <h1 className="page-title">Import Students and Supervisors</h1>

        <div className="grid-2" style={{ alignItems: 'start', gap: 24 }}>
          {/* Upload panel */}
          <div>
            <div className="card mb-24">
              <div className="card-header"><h3>Upload Excel File</h3></div>
              <div className="card-body">
                <div className="form-group">
                  <label htmlFor="import-type">Import type</label>
                  <select id="import-type" value={importType} onChange={e => {
                    setImportType(e.target.value);
                    setFile(null);
                    setResults(null);
                    setError('');
                    if (fileRef.current) fileRef.current.value = '';
                  }}>
                    <option value="students">Students</option>
                    <option value="supervisors">Supervisors</option>
                  </select>
                </div>

                {/* Column reference */}
                <div className="alert alert-info" style={{ marginBottom: 20 }}>
                  <div>
                    <strong>Required Excel columns:</strong>
                    <div style={{ fontFamily: 'monospace', marginTop: 8, fontSize: '0.82rem', lineHeight: 2 }}>
                      {importType === 'students'
                        ? 'ID · ENGLISHNAME · EMAIL · CAMPUS · PHONE · CUMULATIVE_GPA · HOURS_EARNED · YEARDESC'
                        : 'NAME · EMAIL · POSITION · PHONE'}
                    </div>
                  </div>
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                {/* Drop zone */}
                <div
                  className={`drop-zone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                >
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    ref={fileRef}
                    onChange={e => handleFile(e.target.files[0])}
                    style={{ display: 'none' }}
                  />
                  <div className="drop-zone-icon">📊</div>
                  {file ? (
                    <div>
                      <div className="drop-zone-filename">{file.name}</div>
                      <div className="drop-zone-size">
                        {(file.size / 1024).toFixed(1)} KB · Click to change
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="drop-zone-text">Drag & drop your Excel file here</div>
                      <div className="drop-zone-subtext">or click to browse</div>
                    </div>
                  )}
                </div>

                <button
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: 16 }}
                  onClick={handleUpload}
                  disabled={!file || uploading}
                >
                  {uploading ? 'Importing…' : 'Start Import'}
                </button>
              </div>
            </div>

            {/* Processing rules info */}
            <div className="card">
              <div className="card-header"><h3>Import Logic</h3></div>
              <div className="card-body">
                <ul style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {importType === 'students' ? <>
                    <li>Rows with new Student IDs are created; existing IDs are updated.</li>
                    <li>Existing account links and statuses are preserved on updates.</li>
                    <li>Rows missing an ID, name, or email are skipped and reported.</li>
                    <li>Duplicate emails across different student IDs are rejected per row.</li>
                  </> : <>
                    <li>Rows with new email addresses create supervisor profiles; existing emails update the matching profile.</li>
                    <li>Existing account links and internship assignments are preserved.</li>
                    <li>Name and email are required; position and phone are optional.</li>
                    <li>Imported profiles can be selected when assigning a student's internship supervisor.</li>
                  </>}
                </ul>
              </div>
            </div>
          </div>

          {/* Results panel */}
          <div>
            {results && (
              <div className="card">
                <div className="card-header"><h3>Import Results</h3></div>
                <div className="card-body">
                  <div className="grid-2" style={{ marginBottom: 20 }}>
                    {[
                      { label: 'Total Rows',  value: results.total,    color: '#003571' },
                      { label: 'Inserted',    value: results.inserted, color: '#28a745' },
                      { label: 'Updated',     value: results.updated,  color: '#007bff' },
                      { label: 'Skipped',     value: results.skipped,  color: '#ffc107' },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{
                        background: 'var(--bg-page)', border: '1px solid var(--border)',
                        borderRadius: 8, padding: '14px', textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color }}>{value}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
                      </div>
                    ))}
                  </div>

                  {results.errors.length > 0 && (
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--danger)', marginBottom: 8, fontSize: '0.875rem' }}>
                        ⚠ {results.errors.length} error(s):
                      </div>
                      <div style={{
                        background: 'var(--danger-light)', border: '1px solid #f5c6cb',
                        borderRadius: 6, padding: 12, maxHeight: 240, overflowY: 'auto'
                      }}>
                        {results.errors.map((e, i) => (
                          <div key={i} style={{ fontSize: '0.8rem', color: '#721c24', padding: '3px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                            {e}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {results.errors.length === 0 && (
                    <div className="alert alert-success">
                      ✅ Import completed with no errors!
                    </div>
                  )}
                </div>
              </div>
            )}

            {!results && (
              <div className="card">
                <div className="card-body empty-state">
                  <div style={{ fontSize: '3rem', marginBottom: 12 }}>📥</div>
                  <p>Upload an Excel file to see {importType} import results here.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .drop-zone {
          border: 2px dashed var(--border); border-radius: var(--radius-md);
          padding: 36px 20px; text-align: center; cursor: pointer;
          transition: all 0.18s; background: var(--bg-page);
        }
        .drop-zone:hover { border-color: var(--primary); background: var(--primary-pale); }
        .drop-zone.dragging { border-color: var(--primary); background: var(--primary-pale); transform: scale(1.01); }
        .drop-zone.has-file  { border-color: var(--success); background: var(--success-light); }
        .drop-zone-icon      { font-size: 2.4rem; margin-bottom: 10px; }
        .drop-zone-text      { font-weight: 600; color: var(--text-primary); font-size: 0.95rem; }
        .drop-zone-subtext   { font-size: 0.82rem; color: var(--text-muted); margin-top: 4px; }
        .drop-zone-filename  { font-weight: 700; color: var(--success); font-size: 0.95rem; }
        .drop-zone-size      { font-size: 0.8rem; color: var(--text-muted); margin-top: 4px; }
      `}</style>
    </>
  );
}
