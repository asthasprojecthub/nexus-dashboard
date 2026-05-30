// ─────────────────────────────────────────────────────────────────────────────
// InquiriesPage.jsx  (updated — replaces frontend/src/pages/InquiriesPage.jsx)
//
// Changes from original:
//  1. "Add Inquiry" button → navigate('/inquiries/new')  [mandatory form gate]
//  2. Edit button → navigate(`/inquiries/${row._id}/edit`)
//  3. View detail modal retained as-is
//  4. Delete modal retained as-is
//  5. Convert to project retained as-is
//  6. Added panel type chips in table (panelTypes[] field from new schema)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Edit2, Trash2, Eye, ArrowRightCircle,
  RefreshCw, X, FileText,
} from 'lucide-react';

import API from '../api/axios';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

import Table       from '../components/common/Table';
import StatusBadge from '../components/common/StatusBadge';
import Modal       from '../components/common/Modal';

import { Button, Select, Card } from '../components/common/FormComponents';

const STATUSES = [
  'New', 'Under Discussion', 'Quotation Submit',
  'Negotiation', 'Order Recieved', 'Inquiry Hold', 'Inq. Lost',
];

const PRODUCTS = ['MCC', 'PCC', 'APFC', 'VFD', 'PLC', 'AMF', 'VFD_PANEL', 'PLC_PANEL', 'PLC_MCC', 'BUSDUCT', 'OTHER'];

const InquiriesPage = () => {
  const toast     = useToast();
  const { isManager } = useAuth();
  const navigate  = useNavigate();

  const [inquiries,   setInquiries]   = useState([]);
  const [pagination,  setPagination]  = useState({ page: 1, pages: 1, total: 0, limit: 10 });
  const [loading,     setLoading]     = useState(true);
  const [submitting,  setSubmitting]  = useState(false);

  const [search,         setSearch]         = useState('');
  const [filterStatus,   setFilterStatus]   = useState('');
  const [filterProduct,  setFilterProduct]  = useState('');
  const [page,           setPage]           = useState(1);

  const [detailModal, setDetailModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [selected,    setSelected]    = useState(null);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchInquiries = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (search)        params.search      = search;
      if (filterStatus)  params.status      = filterStatus;
      if (filterProduct) params.productType = filterProduct;

      const { data } = await API.get('/inquiries', { params });
      setInquiries(data.data);
      setPagination(data.pagination);
    } catch {
      toast.error('Failed to load inquiries');
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus, filterProduct]);

  useEffect(() => { fetchInquiries(); }, [fetchInquiries]);
  useEffect(() => { setPage(1); }, [search, filterStatus, filterProduct]);

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    try {
      await API.delete(`/inquiries/${selected._id}`);
      toast.success('Inquiry deleted successfully');
      setDeleteModal(false);
      setSelected(null);
      fetchInquiries();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete inquiry');
    }
  };

  // ── Convert ───────────────────────────────────────────────────────────────
  const handleConvert = async (inquiry) => {
    try {
      await API.post(`/projects/convert/${inquiry._id}`);
      toast.success('Inquiry converted to project');
      fetchInquiries();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Conversion failed');
    }
  };

  // ── Table columns ─────────────────────────────────────────────────────────
  const columns = [
    {
      key: 'inquiryId', label: 'ID', width: '100px',
      render: v => <span className="font-mono text-xs font-semibold text-blue-700">{v}</span>,
    },
    {
      key: 'inquiryDate', label: 'Date', width: '100px',
      render: v => new Date(v).toLocaleDateString('en-IN'),
    },
    {
      key: 'customerName', label: 'Customer',
      render: (v, row) => (
        <div>
          <p className="font-medium text-gray-800 text-sm">{row.companyName || v}</p>
          <p className="text-xs text-gray-400">{v !== row.companyName ? v : row.contactPerson}</p>
        </div>
      ),
    },
    { key: 'mobileNumber', label: 'Mobile', width: '120px' },
    {
      key: 'panelTypes', label: 'Panel Type', width: '140px',
      render: (v, row) => {
        const types = Array.isArray(v) && v.length ? v : (row.productType ? [row.productType] : []);
        return (
          <div className="flex flex-wrap gap-1">
            {types.slice(0, 2).map(t => (
              <span key={t} className="rounded bg-indigo-50 px-1.5 py-0.5 text-xs font-semibold text-indigo-700">{t}</span>
            ))}
            {types.length > 2 && <span className="text-xs text-gray-400">+{types.length - 2}</span>}
          </div>
        );
      },
    },
    {
      key: 'estimatedValue', label: 'Budget', width: '120px',
      render: v => v ? `₹${Number(v).toLocaleString('en-IN')}` : '—',
    },
    {
      key: 'priority', label: 'Priority', width: '80px',
      render: v => <StatusBadge status={v} size="xs" />,
    },
    {
      key: 'status', label: 'Status', width: '150px',
      render: v => <StatusBadge status={v} />,
    },
    {
      key: 'nextFollowUpDate', label: 'Follow-up', width: '110px',
      render: v => {
        if (!v) return '—';
        const d = new Date(v);
        const overdue = d < new Date();
        return (
          <span className={`text-xs ${overdue ? 'font-semibold text-red-600' : 'text-gray-600'}`}>
            {d.toLocaleDateString('en-IN')}{overdue && ' ⚠'}
          </span>
        );
      },
    },
    {
      key: '_id', label: 'Actions', width: '130px',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          {/* View */}
          <button
            onClick={() => { setSelected(row); setDetailModal(true); }}
            className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
            title="View details"
          >
            <Eye size={14} />
          </button>
          {/* Edit — goes to full form page */}
          <button
            onClick={() => navigate(`/inquiries/${row._id}/edit`)}
            className="rounded p-1.5 text-gray-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"
            title="Edit inquiry"
          >
            <Edit2 size={14} />
          </button>
          {/* Delete */}
          {isManager && (
            <button
              onClick={() => { setSelected(row); setDeleteModal(true); }}
              className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
              title="Delete inquiry"
            >
              <Trash2 size={14} />
            </button>
          )}
          {/* Convert to project */}
          {row.status === 'Order Recieved' && !row.convertedToProject && (
            <button
              onClick={() => handleConvert(row)}
              className="rounded p-1.5 text-gray-400 hover:bg-green-50 hover:text-green-600 transition-colors"
              title="Convert to project"
            >
              <ArrowRightCircle size={14} />
            </button>
          )}
        </div>
      ),
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="fade-in space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">All Inquiries</h2>
          <p className="text-sm text-gray-500">{pagination.total} total records</p>
        </div>
        {/* ── KEY CHANGE: navigate to full form page ── */}
        <Button onClick={() => navigate('/inquiries/new')}>
          <Plus size={16} />
          New Inquiry
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap items-center gap-3 p-4">
          {/* Search */}
          <div className="relative min-w-[220px] flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search customer, company, ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <X size={14} />
              </button>
            )}
          </div>

          <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-48">
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </Select>

          <Select value={filterProduct} onChange={e => setFilterProduct(e.target.value)} className="w-40">
            <option value="">All Products</option>
            {PRODUCTS.map(p => <option key={p}>{p}</option>)}
          </Select>

          {(search || filterStatus || filterProduct) && (
            <button
              onClick={() => { setSearch(''); setFilterStatus(''); setFilterProduct(''); }}
              className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700"
            >
              <X size={14} /> Clear
            </button>
          )}

          <button
            onClick={fetchInquiries}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            title="Refresh"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          data={inquiries}
          loading={loading}
          pagination={pagination}
          onPageChange={setPage}
          emptyMessage="No inquiries found. Click 'New Inquiry' to add one."
        />
      </Card>

      {/* ── View Detail Modal ──────────────────────────────────────────────── */}
      <Modal isOpen={detailModal} onClose={() => { setDetailModal(false); setSelected(null); }} title="Inquiry Details" size="lg">
        {selected && (
          <div className="space-y-4 text-sm max-h-[70vh] overflow-y-auto pr-1">

            {/* Meta row */}
            <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
              <span className="font-mono text-sm font-bold text-blue-700">#{selected.inquiryId}</span>
              <StatusBadge status={selected.status} />
              <StatusBadge status={selected.priority} size="xs" />
              <span className="ml-auto text-xs text-gray-400">{new Date(selected.inquiryDate).toLocaleDateString('en-IN')}</span>
            </div>

            {/* Two-column grid of all key fields */}
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Company',      selected.companyName],
                ['Contact',      selected.contactPerson],
                ['Designation',  selected.designation],
                ['Mobile',       selected.mobileNumber],
                ['Email',        selected.email],
                ['City / Site',  selected.city || selected.siteAddress || selected.location],
                ['Project',      selected.projectName],
                ['Industry',     selected.industryType],
                ['Offer Type',   selected.offerType],
                ['Supply Voltage', selected.supplyVoltage],
                ['Frequency',    selected.frequency],
                ['IP Rating',    selected.ipRating],
                ['Ambient Temp', selected.ambientTemp],
                ['Budget',       selected.estimatedValue ? `₹${Number(selected.estimatedValue).toLocaleString('en-IN')}` : '—'],
                ['Follow-up',    selected.nextFollowUpDate ? new Date(selected.nextFollowUpDate).toLocaleDateString('en-IN') : '—'],
                ['Prepared By',  selected.preparedBy],
              ].map(([label, val]) => (
                <div key={label} className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                  <p className="font-medium text-gray-800 text-sm">{val || '—'}</p>
                </div>
              ))}
            </div>

            {/* Panel types */}
            {(selected.panelTypes?.length > 0) && (
              <div className="rounded-lg bg-indigo-50 p-3">
                <p className="text-xs text-gray-400 mb-1">Panel Types</p>
                <div className="flex flex-wrap gap-1">
                  {selected.panelTypes.map(t => (
                    <span key={t} className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Load Details */}
            {selected.loadDetails?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Load Details</p>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-800 text-white">
                      <tr>
                        {['Sr.', 'Description', 'Qty', 'Rating', 'Unit', 'Remarks'].map(h => (
                          <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selected.loadDetails.map((l, i) => (
                        <tr key={i} className={i % 2 ? 'bg-gray-50' : 'bg-white'}>
                          <td className="px-3 py-2 text-gray-400 font-mono">{i + 1}</td>
                          <td className="px-3 py-2 text-gray-800">{l.loadDescription}</td>
                          <td className="px-3 py-2 text-gray-700">{l.qty}</td>
                          <td className="px-3 py-2 text-gray-700">{l.rating}</td>
                          <td className="px-3 py-2 text-gray-700">{l.unit}</td>
                          <td className="px-3 py-2 text-gray-400">{l.remarks || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Notes */}
            {selected.additionalNotes && (
              <div className="rounded-lg bg-amber-50 p-3 border border-amber-100">
                <p className="text-xs text-gray-400 mb-1">Additional Notes</p>
                <p className="text-gray-800">{selected.additionalNotes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Delete Modal ──────────────────────────────────────────────────── */}
      <Modal isOpen={deleteModal} onClose={() => { setDeleteModal(false); setSelected(null); }} title="Delete Inquiry" size="sm">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <Trash2 size={24} className="text-red-500" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Are you sure?</p>
            <p className="mt-1 text-sm text-gray-500">
              This will permanently delete inquiry <strong>#{selected?.inquiryId}</strong>
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => { setDeleteModal(false); setSelected(null); }}>
              Cancel
            </Button>
            <Button variant="danger" className="flex-1" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InquiriesPage;
