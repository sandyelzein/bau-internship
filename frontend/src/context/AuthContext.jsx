// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [role, setRole]       = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, restore session from localStorage
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      api.get('/auth/me')
        .then(res => {
          setUser(res.data.profile);
          setRole(res.data.role);
        })
        .catch(() => {
          localStorage.removeItem('token');
          delete api.defaults.headers.common['Authorization'];
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token, role: userRole, profile } = res.data;

    localStorage.setItem('token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(profile);
    setRole(userRole);
    return userRole;
  };

  const register = async (studentId, email, password, gpa, fullName) => {
    const res = await api.post('/auth/register', { studentId, email, password, gpa, fullName });
    const { token, role: userRole, profile } = res.data;

    localStorage.setItem('token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(profile);
    setRole(userRole);
    return userRole;
  };

  const registerSupervisor = async (email, password) => {
    const res = await api.post('/auth/register-supervisor', { email, password });
    const { token, role: userRole, profile } = res.data;
    localStorage.setItem('token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(profile);
    setRole(userRole);
    return userRole;
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    setRole(null);
  };

  const isAdmin = role === 'COMMITTEE_MEMBER' && user?.isAdmin === true;

  return (
    <AuthContext.Provider value={{ user, role, loading, login, register, registerSupervisor, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
