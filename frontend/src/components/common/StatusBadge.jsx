import React from 'react';

const statusColors = {
  // Inquiry statuses
  New: 'bg-blue-100 text-blue-800',
  'Under Discussion': 'bg-orange-100 text-orange-800',
  'Quotation Sent': 'bg-purple-100 text-purple-800',
  Negotiation: 'bg-yellow-100 text-yellow-800',
  'Order Confirmed': 'bg-green-100 text-green-800',
  Hold: 'bg-gray-100 text-gray-800',
  Lost: 'bg-red-100 text-red-800',
  Completed: 'bg-emerald-100 text-emerald-800',
  // Project statuses
  Planning: 'bg-blue-100 text-blue-800',
  Design: 'bg-indigo-100 text-indigo-800',
  Production: 'bg-orange-100 text-orange-800',
  Testing: 'bg-yellow-100 text-yellow-800',
  Dispatch: 'bg-cyan-100 text-cyan-800',
  Installation: 'bg-purple-100 text-purple-800',
  // Priority
  High: 'bg-red-100 text-red-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  Low: 'bg-green-100 text-green-800',
  // Payment
  Pending: 'bg-orange-100 text-orange-800',
  Partial: 'bg-blue-100 text-blue-800',
  // Roles
  admin: 'bg-purple-100 text-purple-800',
  manager: 'bg-blue-100 text-blue-800',
  salesperson: 'bg-green-100 text-green-800',
};

const StatusBadge = ({ status, size = 'sm' }) => {
  const color = statusColors[status] || 'bg-gray-100 text-gray-800';
  const sizeClass = size === 'xs' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span className={`inline-flex items-center font-medium rounded-full ${color} ${sizeClass} whitespace-nowrap`}>
      {status}
    </span>
  );
};

export default StatusBadge;
