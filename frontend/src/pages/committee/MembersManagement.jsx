// src/pages/committee/MembersManagement.jsx
import React, { useEffect, useState } from 'react';
import Navbar from '../../components/common/Navbar';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

function MemberModal({ member, onClose, onSaved }) {
  const isEdit = Boolean(member?.id);
  const [form, setForm] = useState({
    fullName: member?.fullName || '',
    email:    member?.user?.email || '',
    password: '',
    isAdmin:  member?.isAdmin || false,
    isActive: member?.user?.isActive ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      if (isEdit) {
        const payload = { fullName: form.fullName, isAdmin: form.isAdmin, isActive: form.isActive };
        if (form.password) payload.password = form.password;
        await api.patch(`/committee/members/${member.id}`, payload);
      } else {
        await api.post('/committee/members', form);
      }
      onSaved();
      onClose();
    } catch (err) {
      setErr(err.response?.data?.error || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{isEdit ? 'Edit Member' : 'Add Committee Member'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {err && <div className="alert alert-error">{err}</div>}
          <form onSubmit={handleSubmit} id="member-form">
            <div className="form-group">
              <label>Full Name *</label>
              <input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} required />
            </div>
            {!isEdit && (
              <div className="form-group">
                <label>Email *</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
            )}
            <div className="form-group">
              <label>{isEdit ? 'New Password (leave blank to keep)' : 'Password *'}</label>
              <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                minLength={isEdit ? 0 : 8} required={!isEdit} placeholder="Min. 8 characters" />
            </div>
            <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
                <input type="checkbox" checked={form.isAdmin} onChange={e => setForm(f => ({ ...f, isAdmin: e.target.checked }))} />
                Admin Privileges
              </label>
              {isEdit && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
                  Active Account
                </label>
              )}
            </div>
          </form>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button form="member-form" type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Member'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MembersManagement() {
  const { user: currentUser } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null); // null | 'add' | member object
  const [msg, setMsg]         = useState('');

  const fetchMembers = () =>
    api.get('/committee/members')
      .then(res => setMembers(res.data))
      .catch(console.error);

  useEffect(() => { fetchMembers().finally(() => setLoading(false)); }, []);

  const handleDeactivate = async (member) => {
    if (!window.confirm(`Deactivate ${member.fullName}? They will lose access.`)) return;
    try {
      await api.delete(`/committee/members/${member.id}`);
      setMsg('Member deactivated.');
      fetchMembers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  return (
    <>
      <Navbar />
      <div className="page-container">
        <div className="flex-between mb-24">
          <h1 className="page-title" style={{ margin: 0 }}>Committee Members</h1>
          <button className="btn btn-primary" onClick={() => setModal('add')}>+ Add Member</button>
        </div>

        {msg && <div className="alert alert-success mb-16">{msg}</div>}

        <div className="card">
          {loading ? (
            <div className="spinner" />
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Reviews</th>
                    <th>Joined</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(m => (
                    <tr key={m.id}>
                      <td style={{ fontWeight: 600 }}>
                        {m.fullName}
                        {m.user?.email === currentUser?.email && (
                          <span style={{ marginLeft: 8, fontSize: '0.72rem', background: 'var(--primary-pale)', color: 'var(--primary)', padding: '1px 8px', borderRadius: 20, fontWeight: 700 }}>You</span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{m.user?.email}</td>
                      <td>
                        {m.isAdmin
                          ? <span className="badge badge-approved">Admin</span>
                          : <span className="badge badge-not-started">Member</span>}
                      </td>
                      <td>
                        {m.user?.isActive
                          ? <span className="badge badge-approved">Active</span>
                          : <span className="badge badge-rejected">Inactive</span>}
                      </td>
                      <td>{m._count?.reviewedRequests ?? 0}</td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {new Date(m.user?.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => setModal(m)}>Edit</button>
                          {m.user?.email !== currentUser?.email && m.user?.isActive && (
                            <button className="btn btn-danger btn-sm" onClick={() => handleDeactivate(m)}>Deactivate</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <MemberModal
          member={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { fetchMembers(); setMsg(modal === 'add' ? 'Member added successfully.' : 'Member updated.'); }}
        />
      )}
    </>
  );
}
