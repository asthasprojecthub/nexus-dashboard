import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, Eye, RefreshCw, X, Building2, Phone, Mail, MapPin } from 'lucide-react';
import API from '../api/axios';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import Table from '../components/common/Table';
import Modal from '../components/common/Modal';
import CustomerForm from '../components/customer/CustomerForm';
import StatusBadge from '../components/common/StatusBadge';
import { Button, Card } from '../components/common/FormComponents';

const CustomersPage = () => {
  const toast = useToast();
  const { isAdmin } = useAuth();

  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 10 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [customerDetail, setCustomerDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (search) params.search = search;
      const { data } = await API.get('/customers', { params });
      setCustomers(data.data);
      setPagination(data.pagination);
    } catch {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);
  useEffect(() => { setPage(1); }, [search]);

  const openDetail = async (customer) => {
    setSelected(customer);
    setDetailModal(true);
    setDetailLoading(true);
    try {
      const { data } = await API.get(`/customers/${customer._id}`);
      setCustomerDetail(data.data);
    } catch {
      toast.error('Failed to load customer details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAdd = async (formData) => {
    setSubmitting(true);
    try {
      await API.post('/customers', formData);
      toast.success('Customer added successfully');
      setAddModal(false);
      fetchCustomers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add customer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (formData) => {
    setSubmitting(true);
    try {
      await API.put(`/customers/${selected._id}`, formData);
      toast.success('Customer updated successfully');
      setEditModal(false);
      setSelected(null);
      fetchCustomers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await API.delete(`/customers/${selected._id}`);
      toast.success('Customer deleted');
      setDeleteModal(false);
      setSelected(null);
      fetchCustomers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const columns = [
    {
      key: 'customerId',
      label: 'ID',
      width: '100px',
      render: (v) => <span className="font-mono text-xs text-blue-700 font-semibold">{v}</span>,
    },
    {
      key: 'customerName',
      label: 'Customer',
      render: (v, row) => (
        <div>
          <p className="font-medium text-gray-800">{v}</p>
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <Building2 size={11} /> {row.companyName || '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'mobileNumber',
      label: 'Contact',
      render: (v, row) => (
        <div>
          <p className="text-sm text-gray-700 flex items-center gap-1"><Phone size={11} className="text-gray-400" /> {v || '—'}</p>
          <p className="text-xs text-gray-400 flex items-center gap-1"><Mail size={11} /> {row.email || '—'}</p>
        </div>
      ),
    },
    {
      key: 'city',
      label: 'City',
      width: '100px',
      render: (v) => v ? <span className="flex items-center gap-1 text-sm"><MapPin size={11} className="text-gray-400" />{v}</span> : '—',
    },
    {
      key: 'totalProjects',
      label: 'Projects',
      width: '80px',
      render: (v) => (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
          {v || 0}
        </span>
      ),
    },
    {
      key: 'totalBusinessValue',
      label: 'Business Value',
      width: '130px',
      render: (v) => (
        <span className="font-semibold text-green-700">
          ₹{v ? Number(v).toLocaleString('en-IN') : 0}
        </span>
      ),
    },
    {
      key: 'pendingPayments',
      label: 'Pending',
      width: '110px',
      render: (v) => (
        <span className={`font-semibold ${v > 0 ? 'text-red-600' : 'text-gray-400'}`}>
          ₹{v ? Number(v).toLocaleString('en-IN') : 0}
        </span>
      ),
    },
    {
      key: '_id',
      label: 'Actions',
      width: '100px',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openDetail(row)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="View"><Eye size={14} /></button>
          <button onClick={() => { setSelected(row); setEditModal(true); }} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded" title="Edit"><Edit2 size={14} /></button>
          {isAdmin && (
            <button onClick={() => { setSelected(row); setDeleteModal(true); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 size={14} /></button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Customers</h2>
          <p className="text-sm text-gray-500">{pagination.total} total records</p>
        </div>
        <Button onClick={() => setAddModal(true)}><Plus size={16} /> Add Customer</Button>
      </div>

      <Card>
        <div className="p-4 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X size={14} /></button>}
          </div>
          <button onClick={fetchCustomers} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"><RefreshCw size={15} /></button>
        </div>
      </Card>

      <Card>
        <Table columns={columns} data={customers} loading={loading} pagination={pagination} onPageChange={setPage} emptyMessage="No customers found." />
      </Card>

      {/* Add */}
      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="Add Customer" size="md">
        <CustomerForm onSubmit={handleAdd} loading={submitting} />
      </Modal>

      {/* Edit */}
      <Modal isOpen={editModal} onClose={() => { setEditModal(false); setSelected(null); }} title="Edit Customer" size="md">
        {selected && <CustomerForm initialData={selected} onSubmit={handleEdit} loading={submitting} />}
      </Modal>

      {/* Detail */}
      <Modal isOpen={detailModal} onClose={() => { setDetailModal(false); setSelected(null); setCustomerDetail(null); }} title="Customer Details" size="lg">
        {detailLoading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full border-2 border-gray-200 border-t-blue-600 h-8 w-8" /></div>
        ) : customerDetail && (
          <div className="space-y-5">
            {/* Customer info */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              {[
                ['Customer ID', customerDetail.customer.customerId],
                ['Name', customerDetail.customer.customerName],
                ['Company', customerDetail.customer.companyName],
                ['Contact', customerDetail.customer.contactPerson],
                ['Mobile', customerDetail.customer.mobileNumber],
                ['Email', customerDetail.customer.email],
                ['City', customerDetail.customer.city],
                ['GST', customerDetail.customer.gstNumber],
                ['Total Projects', customerDetail.customer.totalProjects],
              ].map(([label, val]) => (
                <div key={label} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="font-medium text-gray-800 mt-0.5">{val || '—'}</p>
                </div>
              ))}
            </div>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <p className="text-xs text-green-600 mb-1">Total Business</p>
                <p className="text-xl font-bold text-green-800">₹{Number(customerDetail.customer.totalBusinessValue || 0).toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-red-50 rounded-xl p-4 text-center">
                <p className="text-xs text-red-600 mb-1">Pending Payments</p>
                <p className="text-xl font-bold text-red-800">₹{Number(customerDetail.customer.pendingPayments || 0).toLocaleString('en-IN')}</p>
              </div>
            </div>
            {/* Recent inquiries */}
            {customerDetail.inquiries?.length > 0 && (
              <div>
                <p className="font-semibold text-gray-800 mb-2 text-sm">Recent Inquiries</p>
                <div className="space-y-2">
                  {customerDetail.inquiries.map((inq) => (
                    <div key={inq._id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                      <span className="font-mono text-xs text-blue-700">{inq.inquiryId}</span>
                      <span className="text-gray-600">{inq.productType}</span>
                      <StatusBadge status={inq.status} size="xs" />
                      <span className="text-gray-500 text-xs">{inq.estimatedValue ? `₹${Number(inq.estimatedValue).toLocaleString('en-IN')}` : '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Recent projects */}
            {customerDetail.projects?.length > 0 && (
              <div>
                <p className="font-semibold text-gray-800 mb-2 text-sm">Recent Projects</p>
                <div className="space-y-2">
                  {customerDetail.projects.map((proj) => (
                    <div key={proj._id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                      <span className="font-mono text-xs text-blue-700">{proj.projectId}</span>
                      <span className="text-gray-600 truncate max-w-[140px]">{proj.projectName}</span>
                      <StatusBadge status={proj.projectStatus} size="xs" />
                      <span className="text-gray-500 text-xs">{proj.orderValue ? `₹${Number(proj.orderValue).toLocaleString('en-IN')}` : '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete */}
      <Modal isOpen={deleteModal} onClose={() => { setDeleteModal(false); setSelected(null); }} title="Delete Customer" size="sm">
        <div className="text-center space-y-4">
          <div className="bg-red-50 rounded-full h-14 w-14 flex items-center justify-center mx-auto">
            <Trash2 size={24} className="text-red-500" />
          </div>
          <p className="font-medium text-gray-900">Delete <strong>{selected?.customerName}</strong>?</p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => { setDeleteModal(false); setSelected(null); }}>Cancel</Button>
            <Button variant="danger" className="flex-1" onClick={handleDelete}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CustomersPage;
