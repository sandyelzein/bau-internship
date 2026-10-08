import React, { useEffect, useState } from 'react';
import Navbar from '../../components/common/Navbar';
import StatusBadge from '../../components/common/StatusBadge';
import api from '../../api/axios';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const scoreFields = [
  ['professionalism', 'Professionalism'], ['technicalSkills', 'Technical Skills'],
  ['communicationSkills', 'Communication Skills'], ['teamwork', 'Teamwork'],
  ['attendanceCommitment', 'Attendance & Commitment'], ['overallPerformance', 'Overall Performance'],
];

const blankEvaluation = () => ({
  professionalism: 0, technicalSkills: 0, communicationSkills: 0,
  teamwork: 0, attendanceCommitment: 0, overallPerformance: 0,
  grade: '', comments: '', wouldRecommend: '',
});

export default function SupervisorDashboard() {
  const [internships, setInternships] = useState([]);
  const [forms, setForms] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = () => api.get('/supervisor/internships').then(res => setInternships(res.data));
  useEffect(() => { load().catch(console.error).finally(() => setLoading(false)); }, []);

  const updateForm = (id, key, value) => setForms(current => ({
    ...current,
    [id]: { ...(current[id] || blankEvaluation()), [key]: value },
  }));

  const submit = async (event, id) => {
    event.preventDefault();
    setMessage(''); setError('');
    try {
      await api.post(`/supervisor/internships/${id}/evaluation`, forms[id] || blankEvaluation());
      setMessage('Evaluation and grade submitted successfully.');
      await load();
    } catch (err) { setError(err.response?.data?.error || 'Evaluation submission failed'); }
  };

  return (
    <><Navbar /><div className="page-container">
      <h1 className="page-title">My Students & Internships</h1>
      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}
      {loading ? <div className="spinner" /> : internships.length === 0 ? (
        <div className="card"><div className="empty-state"><p>No internships are assigned to your account yet.</p></div></div>
      ) : internships.map(item => {
        const form = forms[item.id] || blankEvaluation();
        return <div className="card mb-24" key={item.id}>
          <div className="card-header"><h3>{item.request.student.fullName} · {item.request.companyName}</h3><StatusBadge status={item.status} /></div>
          <div className="card-body">
            <div className="grid-2 mb-24">
              <div><strong>Student ID:</strong> {item.request.student.studentId}<br/><strong>Email:</strong> {item.request.student.universityEmail}<br/><strong>Campus:</strong> {item.request.student.campus || '—'}</div>
              <div><strong>Position:</strong> {item.request.role}<br/><strong>Dates:</strong> {new Date(item.request.startDate).toLocaleDateString()} – {new Date(item.request.endDate).toLocaleDateString()}<br/><strong>Tasks:</strong> {item.request.tasks}</div>
            </div>
            <h3 className="section-title">Completion Certificate</h3>
            {item.documents.length ? item.documents.map(doc => <a key={doc.id} className="btn btn-secondary btn-sm mb-16" href={`${BACKEND_URL}/uploads/${doc.filePath}`} target="_blank" rel="noreferrer">View {doc.fileName}</a>) : <p className="mb-16" style={{ color: 'var(--text-muted)' }}>No completion certificate uploaded.</p>}
            <h3 className="section-title">Evaluation</h3>
            {item.evaluation ? (
              <div className="alert alert-success">Submitted · Grade: <strong>{item.evaluation.grade || '—'}</strong></div>
            ) : (
              <form onSubmit={e => submit(e, item.id)}>
                <div className="grid-2">
                  {scoreFields.map(([key, label]) => <div className="form-group" key={key}><label>{label} (1–5)</label><select value={form[key]} onChange={e => updateForm(item.id, key, Number(e.target.value))} required><option value="">Select</option>{[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}</select></div>)}
                </div>
                <div className="form-group"><label>Grade</label><input value={form.grade} onChange={e => updateForm(item.id, 'grade', e.target.value)} placeholder="Enter the final grade" required /></div>
                <div className="form-group"><label>Comments</label><textarea value={form.comments} onChange={e => updateForm(item.id, 'comments', e.target.value)} /></div>
                <div className="form-group"><label>Would you recommend this student?</label><select value={form.wouldRecommend} onChange={e => updateForm(item.id, 'wouldRecommend', e.target.value)} required><option value="">Select</option><option value="true">Yes</option><option value="false">No</option></select></div>
                <button className="btn btn-primary">Submit Evaluation & Grade</button>
              </form>
            )}
          </div>
        </div>;
      })}
    </div></>
  );
}
