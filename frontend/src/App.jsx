// src/App.jsx
// CHANGED: added /student/supervisor and /evaluation/:token routes
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Auth pages
import LoginPage    from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Student pages
import StudentDashboard  from './pages/student/StudentDashboard';
import StudentProfile    from './pages/student/StudentProfile';
import InternshipRequest from './pages/student/InternshipRequest';
import MyRequests        from './pages/student/MyRequests';
import DocumentUpload    from './pages/student/DocumentUpload';
import SupervisorForm    from './pages/student/SupervisorForm';   // NEW

// Committee pages
import CommitteeDashboard  from './pages/committee/CommitteeDashboard';
import StudentsList        from './pages/committee/StudentsList';
import StudentDetail       from './pages/committee/StudentDetail';
import RequestsList        from './pages/committee/RequestsList';
import RequestDetail       from './pages/committee/RequestDetail';
import MembersManagement   from './pages/committee/MembersManagement';
import ImportStudents      from './pages/committee/ImportStudents';
import EmailLogs           from './pages/committee/EmailLogs';

// Public pages (no auth)
import EvaluationPage from './pages/EvaluationPage';             // NEW

function ProtectedRoute({ children, allowedRole }) {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="spinner" style={{ marginTop: 80 }} />;
  if (!user)   return <Navigate to="/login" replace />;
  if (allowedRole && role !== allowedRole) {
    return <Navigate to={role === 'STUDENT' ? '/student' : '/committee'} replace />;
  }
  return children;
}

function RootRedirect() {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="spinner" style={{ marginTop: 80 }} />;
  if (!user)   return <Navigate to="/login" replace />;
  return <Navigate to={role === 'STUDENT' ? '/student' : '/committee'} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* NEW: public evaluation page — no auth needed */}
      <Route path="/evaluation/:token" element={<EvaluationPage />} />

      {/* Student routes */}
      <Route path="/student" element={
        <ProtectedRoute allowedRole="STUDENT"><StudentDashboard /></ProtectedRoute>
      } />
      <Route path="/student/profile" element={
        <ProtectedRoute allowedRole="STUDENT"><StudentProfile /></ProtectedRoute>
      } />
      <Route path="/student/request/new" element={
        <ProtectedRoute allowedRole="STUDENT"><InternshipRequest /></ProtectedRoute>
      } />
      <Route path="/student/requests" element={
        <ProtectedRoute allowedRole="STUDENT"><MyRequests /></ProtectedRoute>
      } />
      <Route path="/student/documents" element={
        <ProtectedRoute allowedRole="STUDENT"><DocumentUpload /></ProtectedRoute>
      } />
      {/* NEW */}
      <Route path="/student/supervisor" element={
        <ProtectedRoute allowedRole="STUDENT"><SupervisorForm /></ProtectedRoute>
      } />

      {/* Committee routes */}
      <Route path="/committee" element={
        <ProtectedRoute allowedRole="COMMITTEE_MEMBER"><CommitteeDashboard /></ProtectedRoute>
      } />
      <Route path="/committee/students" element={
        <ProtectedRoute allowedRole="COMMITTEE_MEMBER"><StudentsList /></ProtectedRoute>
      } />
      <Route path="/committee/students/:studentId" element={
        <ProtectedRoute allowedRole="COMMITTEE_MEMBER"><StudentDetail /></ProtectedRoute>
      } />
      <Route path="/committee/requests" element={
        <ProtectedRoute allowedRole="COMMITTEE_MEMBER"><RequestsList /></ProtectedRoute>
      } />
      <Route path="/committee/requests/:id" element={
        <ProtectedRoute allowedRole="COMMITTEE_MEMBER"><RequestDetail /></ProtectedRoute>
      } />
      <Route path="/committee/members" element={
        <ProtectedRoute allowedRole="COMMITTEE_MEMBER"><MembersManagement /></ProtectedRoute>
      } />
      <Route path="/committee/import" element={
        <ProtectedRoute allowedRole="COMMITTEE_MEMBER"><ImportStudents /></ProtectedRoute>
      } />
      <Route path="/committee/email-logs" element={
        <ProtectedRoute allowedRole="COMMITTEE_MEMBER"><EmailLogs /></ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
