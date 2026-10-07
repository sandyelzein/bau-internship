// src/pages/EvaluationPage.jsx  — NEW FILE (public, no auth)
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';

const SCORES = [1, 2, 3, 4, 5];
const SCORE_LABELS = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent' };

const QUESTIONS = [
  { key: 'professionalism',      label: 'Professionalism' },
  { key: 'technicalSkills',      label: 'Technical Skills' },
  { key: 'communicationSkills',  label: 'Communication Skills' },
  { key: 'teamwork',             label: 'Teamwork' },
  { key: 'attendanceCommitment', label: 'Attendance & Commitment' },
  { key: 'overallPerformance',   label: 'Overall Performance' },
];

function ScoreSelector({ questionKey, value, onChange }) {
  return (
    <div className="score-row">
      {SCORES.map(n => (
        <button
          key={n}
          type="button"
          className={`score-btn ${value === n ? 'selected' : ''}`}
          onClick={() => onChange(questionKey, n)}
          title={SCORE_LABELS[n]}
        >
          {n}
        </button>
      ))}
      {value && (
        <span className="score-label-text">{SCORE_LABELS[value]}</span>
      )}
    </div>
  );
}

export default function EvaluationPage() {
  const { token } = useParams();

  const [context, setContext]   = useState(null);   // { supervisorName, studentName, … }
  const [loading, setLoading]   = useState(true);
  const [tokenError, setTokenError] = useState(''); // invalid / expired / used

  const [form, setForm] = useState({
    professionalism:      0,
    technicalSkills:      0,
    communicationSkills:  0,
    teamwork:             0,
    attendanceCommitment: 0,
    overallPerformance:   0,
    comments:             '',
    wouldRecommend:       null, // true | false
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Load evaluation context using the raw token
  useEffect(() => {
    api.get(`/evaluation/${token}`)
      .then(res => setContext(res.data))
      .catch(err => {
        setTokenError(
          err.response?.data?.error || 'This evaluation link is invalid.'
        );
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleScore = (key, val) =>
    setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    // Validate all scores filled
    const missing = QUESTIONS.filter(q => !form[q.key]);
    if (missing.length > 0) {
      return setSubmitError(
        `Please rate all categories: ${missing.map(q => q.label).join(', ')}`
      );
    }
    if (form.wouldRecommend === null) {
      return setSubmitError('Please answer the recommendation question');
    }

    setSubmitting(true);
    try {
      await api.post(`/evaluation/${token}/submit`, form);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render states ─────────────────────────────────────────

  if (loading) {
    return (
      <div className="eval-page">
        <div className="eval-card" style={{ textAlign: 'center', padding: 60 }}>
          <div className="spinner" />
          <p style={{ color: 'var(--text-muted)', marginTop: 16 }}>Loading evaluation…</p>
        </div>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="eval-page">
        <EvalHeader />
        <div className="eval-card">
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>⚠️</div>
            <h2 style={{ color: 'var(--danger)', marginBottom: 12 }}>Link Unavailable</h2>
            <p style={{ color: 'var(--text-secondary)' }}>{tokenError}</p>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="eval-page">
        <EvalHeader />
        <div className="eval-card">
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>✅</div>
            <h2 style={{ color: 'var(--success)', marginBottom: 12 }}>
              Evaluation Submitted
            </h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: 400, margin: '0 auto' }}>
              Thank you for completing the evaluation for <strong>{context?.studentName}</strong>.
              Your feedback has been submitted to Beirut Arab University.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="eval-page">
      <EvalHeader />

      <div className="eval-card">
        {/* Context info */}
        <div className="eval-context">
          <div className="eval-context-row">
            <span className="eval-context-label">Supervisor</span>
            <span className="eval-context-value">{context.supervisorName}</span>
          </div>
          <div className="eval-context-row">
            <span className="eval-context-label">Student</span>
            <span className="eval-context-value">{context.studentName}</span>
          </div>
          <div className="eval-context-row">
            <span className="eval-context-label">Company</span>
            <span className="eval-context-value">{context.companyName}</span>
          </div>
          <div className="eval-context-row">
            <span className="eval-context-label">Role</span>
            <span className="eval-context-value">{context.role}</span>
          </div>
        </div>

        <div className="eval-divider" />

        <form onSubmit={handleSubmit}>
          {/* Rating questions */}
          <h3 className="eval-section-title">Performance Ratings</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 20 }}>
            Rate each category from 1 (Poor) to 5 (Excellent).
          </p>

          {QUESTIONS.map(q => (
            <div key={q.key} className="eval-question">
              <label className="eval-question-label">{q.label}</label>
              <ScoreSelector
                questionKey={q.key}
                value={form[q.key]}
                onChange={handleScore}
              />
            </div>
          ))}

          <div className="eval-divider" />

          {/* Comments */}
          <h3 className="eval-section-title">Additional Comments</h3>
          <div className="form-group">
            <textarea
              value={form.comments}
              onChange={e => setForm(f => ({ ...f, comments: e.target.value }))}
              placeholder="Any additional observations about the student's performance…"
              rows={4}
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 6, fontFamily: 'inherit', fontSize: '0.9rem', resize: 'vertical' }}
            />
          </div>

          {/* Recommendation */}
          <div className="eval-divider" />
          <h3 className="eval-section-title">Recommendation</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
            Would you recommend this student to future employers?
          </p>
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <button
              type="button"
              className={`recommend-btn ${form.wouldRecommend === true ? 'yes' : ''}`}
              onClick={() => setForm(f => ({ ...f, wouldRecommend: true }))}
            >
              👍 Yes, I would recommend
            </button>
            <button
              type="button"
              className={`recommend-btn ${form.wouldRecommend === false ? 'no' : ''}`}
              onClick={() => setForm(f => ({ ...f, wouldRecommend: false }))}
            >
              👎 No, I would not recommend
            </button>
          </div>

          {submitError && (
            <div className="alert alert-error" style={{ marginBottom: 16 }}>{submitError}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%', padding: '14px', background: 'var(--primary)',
              color: 'white', border: 'none', borderRadius: 8,
              fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Submitting…' : 'Submit Evaluation'}
          </button>

          <p style={{ textAlign: 'center', marginTop: 12, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            This evaluation can only be submitted once.
            Link expires: {new Date(context.expiresAt).toLocaleDateString()}.
          </p>
        </form>
      </div>

      <style>{`
        :root {
          --primary:#003571; --primary-pale:#e8eef7; --border:#dde3ed;
          --text-primary:#1a1a2e; --text-secondary:#555; --text-muted:#888;
          --danger:#dc3545; --danger-light:#fff0f1;
          --success:#28a745; --success-light:#f0fff4;
          --bg-page:#f4f7fc; --radius-md:10px;
        }
        * { box-sizing:border-box; margin:0; padding:0; }
        body { font-family:'Segoe UI',system-ui,sans-serif; background:var(--bg-page); }
        .eval-page { min-height:100vh; background:var(--bg-page); padding:24px 16px 60px; }
        .eval-card { background:white; border-radius:var(--radius-md); box-shadow:0 4px 16px rgba(0,53,113,0.1); max-width:640px; margin:0 auto; padding:32px; }
        .eval-context { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .eval-context-row { display:flex; flex-direction:column; gap:2px; }
        .eval-context-label { font-size:0.72rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; }
        .eval-context-value { font-size:0.95rem; font-weight:600; color:var(--text-primary); }
        .eval-divider { border:none; border-top:1px solid var(--border); margin:24px 0; }
        .eval-section-title { font-size:1rem; font-weight:700; color:var(--primary); margin-bottom:12px; }
        .eval-question { margin-bottom:20px; }
        .eval-question-label { display:block; font-size:0.875rem; font-weight:600; color:var(--text-primary); margin-bottom:8px; }
        .score-row { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .score-btn { width:44px; height:44px; border-radius:8px; border:2px solid var(--border); background:white; font-size:1rem; font-weight:700; cursor:pointer; transition:all 0.15s; color:var(--text-secondary); }
        .score-btn:hover  { border-color:var(--primary); color:var(--primary); }
        .score-btn.selected { background:var(--primary); border-color:var(--primary); color:white; }
        .score-label-text { font-size:0.8rem; color:var(--text-muted); margin-left:4px; }
        .recommend-btn { flex:1; padding:12px; border:2px solid var(--border); background:white; border-radius:8px; font-size:0.9rem; font-weight:600; cursor:pointer; transition:all 0.15s; }
        .recommend-btn:hover { border-color:var(--primary); }
        .recommend-btn.yes { background:#f0fff4; border-color:#28a745; color:#155724; }
        .recommend-btn.no  { background:#fff0f1; border-color:#dc3545; color:#721c24; }
        .alert { padding:12px 16px; border-radius:6px; font-size:0.875rem; }
        .alert-error { background:var(--danger-light); color:#721c24; border-left:4px solid var(--danger); }
        .spinner { width:36px; height:36px; border:3px solid var(--border); border-top-color:var(--primary); border-radius:50%; animation:spin 0.7s linear infinite; margin:0 auto; }
        @keyframes spin { to { transform:rotate(360deg); } }
        @media (max-width:480px) {
          .eval-card { padding:20px; }
          .eval-context { grid-template-columns:1fr; }
          .recommend-btn { font-size:0.8rem; padding:10px 6px; }
        }
      `}</style>
    </div>
  );
}

function EvalHeader() {
  return (
    <div style={{ background:'#003571', padding:'20px', textAlign:'center', marginBottom:24 }}>
      <h1 style={{ color:'white', margin:0, fontSize:'1.2rem' }}>BAU Internship System</h1>
      <p style={{ color:'rgba(255,255,255,0.7)', margin:'4px 0 0', fontSize:'0.8rem' }}>
        Faculty of Sciences – CS Department · Internship Evaluation
      </p>
    </div>
  );
}
