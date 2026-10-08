// src/pages/committee/StudentsList.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import StatusBadge from '../../components/common/StatusBadge';
import api from '../../api/axios';

const INTERNSHIP_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'NOT_COMPLETED'];
const GRADUATION_STATUSES  = ['NOT_GRADUATED', 'GRADUATED'];
const ACADEMIC_YEARS       = [1, 2, 3, 4];
const formatYear = value => value ? (/year/i.test(String(value)) ? value : `Year ${value}`) : '—';

export default function StudentsList() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    search:           searchParams.get('search')           || '',
    academicYear:     searchParams.get('academicYear')     || '',
    internshipStatus: searchParams.get('internshipStatus') || '',
    graduationStatus: searchParams.get('graduationStatus') || '',
    hasAccount:       searchParams.get('hasAccount')       || '',
    hasRequest:       searchParams.get('hasRequest')       || '',
    page: 1,
  });

  const fetchStudents = useCallback(() => {
    setLoading(true);
    const params = {};
    Object.entries(filters).forEach(([k, v]) => { if (v !== '') params[k] = v; });

    api.get('/students', { params })
      .then(res => { setStudents(res.data.students); setPagination(res.data.pagination); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const handleFilterChange = (key, value) => {
    setFilters(f => ({ ...f, [key]: value, page: 1 }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchStudents();
  };

  return (
    <>
      <Navbar />
      <div className="page-container">
        <div className="flex-between mb-24">
          <h1 className="page-title" style={{ margin: 0 }}>Students</h1>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {pagination.total ?? 0} total
          </span>
        </div>

        {/* Filters */}
        <div className="card mb-24">
          <div className="card-body" style={{ padding: 16 }}>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 200px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Search</label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={e => handleFilterChange('search', e.target.value)}
                  placeholder="Name, ID, or email…"
                  style={{ padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 6, width: '100%', fontSize: '0.875rem' }}
                />
              </div>

              {[
                { key: 'academicYear', label: 'Year', options: ACADEMIC_YEARS.map(y => ({ value: y, label: `Year ${y}` })) },
                { key: 'internshipStatus', label: 'Internship', options: INTERNSHIP_STATUSES.map(s => ({ value: s, label: s.replace(/_/g, ' ') })) },
                { key: 'graduationStatus', label: 'Graduation', options: GRADUATION_STATUSES.map(s => ({ value: s, label: s.replace(/_/g, ' ') })) },
                { key: 'hasAccount', label: 'Account', options: [{ value: 'true', label: 'Has Account' }, { value: 'false', label: 'No Account' }] },
              ].map(({ key, label, options }) => (
                <div key={key} style={{ flex: '0 0 auto' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{label}</label>
                  <select
                    value={filters[key]}
                    onChange={e => handleFilterChange(key, e.target.value)}
                    style={{ padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: 6, fontSize: '0.875rem', background: 'white' }}
                  >
                    <option value="">All</option>
                    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              ))}

              <button type="submit" className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-end' }}>
                Search
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ alignSelf: 'flex-end' }}
                onClick={() => setFilters({ search: '', academicYear: '', internshipStatus: '', graduationStatus: '', hasAccount: '', hasRequest: '', page: 1 })}
              >
                Clear
              </button>
            </form>
          </div>
        </div>

        {/* Table */}
        <div className="card">
          {loading ? (
            <div className="spinner" />
          ) : students.length === 0 ? (
            <div className="empty-state"><p>No students found.</p></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Campus</th>
                    <th>Year</th>
                    <th>GPA</th>
                    <th>Credits</th>
                    <th>Internship</th>
                    <th>Account</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.studentId}>
                      <td><code style={{ fontSize: '0.8rem' }}>{s.studentId}</code></td>
                      <td style={{ fontWeight: 600 }}>{s.fullName}</td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{s.universityEmail}</td>
                      <td>{s.campus || '—'}</td>
                      <td>{formatYear(s.academicYear)}</td>
                      <td>{s.gpa?.toFixed(2) ?? '—'}</td>
                      <td>{s.completedCredits ?? '—'}</td>
                      <td><StatusBadge status={s.internshipRequests?.[0]?.internship?.status || 'NOT_STARTED'} /></td>
                      <td>
                        {s.userId
                          ? <span className="badge badge-approved">Active</span>
                          : <span className="badge badge-not-started">None</span>}
                      </td>
                      <td>
                        <Link to={`/committee/students/${s.studentId}`} className="btn btn-secondary btn-sm">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button disabled={filters.page <= 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>←</button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} className={filters.page === p ? 'active' : ''} onClick={() => setFilters(f => ({ ...f, page: p }))}>
                  {p}
                </button>
              ))}
              <button disabled={filters.page >= pagination.totalPages} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>→</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
