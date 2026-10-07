// src/components/common/StatusBadge.jsx
import React from 'react';

const CONFIG = {
  // Request statuses
  PENDING:       { label: 'Pending',        cls: 'badge-pending' },
  APPROVED:      { label: 'Approved',       cls: 'badge-approved' },
  REJECTED:      { label: 'Rejected',       cls: 'badge-rejected' },
  // Internship statuses
  IN_PROGRESS:   { label: 'In Progress',    cls: 'badge-progress' },
  COMPLETED:     { label: 'Completed',      cls: 'badge-completed' },
  NOT_COMPLETED: { label: 'Not Completed',  cls: 'badge-not-completed' },
  NOT_STARTED:   { label: 'Not Started',    cls: 'badge-not-started' },
  // Graduation
  GRADUATED:     { label: 'Graduated',      cls: 'badge-approved' },
  NOT_GRADUATED: { label: 'Not Graduated',  cls: 'badge-not-started' },
};

export default function StatusBadge({ status }) {
  const cfg = CONFIG[status] || { label: status, cls: 'badge-not-started' };
  return <span className={`badge ${cfg.cls}`}>{cfg.label}</span>;
}
