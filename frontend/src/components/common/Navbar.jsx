// src/components/common/Navbar.jsx
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { user, role, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname.startsWith(path);

  const studentLinks = [
    { to: '/student', label: 'Dashboard', exact: true },
    { to: '/student/requests', label: 'My Requests' },
    { to: '/student/request/new', label: 'New Request' },
    { to: '/student/documents', label: 'My Internships' },
    { to: '/student/profile', label: 'Profile' },
  ];

  const committeeLinks = [
    { to: '/committee', label: 'Dashboard', exact: true },
    { to: '/committee/students', label: 'Students' },
    { to: '/committee/requests', label: 'Requests' },
    ...(isAdmin ? [
      { to: '/committee/import', label: 'Import' },
      { to: '/committee/members', label: 'Members' },
      { to: '/committee/email-logs', label: 'Email Logs' },
    ] : []),
  ];

  const supervisorLinks = [
    { to: '/supervisor', label: 'My Students', exact: true },
  ];

  const links = role === 'STUDENT' ? studentLinks : role === 'SUPERVISOR' ? supervisorLinks : committeeLinks;
  const homePath = role === 'STUDENT' ? '/student' : role === 'SUPERVISOR' ? '/supervisor' : '/committee';

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Brand */}
        <Link to={homePath} className="navbar-brand">
          <div className="navbar-logo">
            <span className="navbar-logo-text">BAU</span>
          </div>
          <div className="navbar-brand-text">
            <span className="navbar-title">Internship System</span>
            <span className="navbar-subtitle">Faculty of Sciences – CS Dept.</span>
          </div>
        </Link>

        {/* Desktop links */}
        <ul className="navbar-links">
          {links.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                className={`navbar-link ${
                  link.exact
                    ? location.pathname === link.to ? 'active' : ''
                    : isActive(link.to) && location.pathname !== '/committee' && location.pathname !== '/student'
                      ? 'active'
                      : link.exact === undefined && location.pathname === link.to ? 'active' : ''
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* User info + logout */}
        <div className="navbar-user">
          <span className="navbar-user-name">{user?.fullName}</span>
          <span className={`navbar-role-badge ${role === 'STUDENT' ? 'student' : 'committee'}`}>
            {role === 'STUDENT' ? 'Student' : role === 'SUPERVISOR' ? 'Supervisor' : isAdmin ? 'Admin' : 'Committee'}
          </span>
          <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
            Logout
          </button>
        </div>

        {/* Mobile hamburger */}
        <button className="navbar-hamburger" onClick={() => setMenuOpen(!menuOpen)}>
          <span /><span /><span />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="navbar-mobile-menu">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="navbar-mobile-link"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <button className="btn btn-secondary btn-sm" onClick={handleLogout} style={{ margin: '8px 16px' }}>
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
