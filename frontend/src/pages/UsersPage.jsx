import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Eye, EyeOff, RefreshCw, UserCheck, UserX } from 'lucide-react';
import API from '../api/axios';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import Table from '../components/common/Table';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import { Button, Card, FormField, Input, Select } from '../components/common/FormComponents';

const ROLES = ['admin', 'manager', 'salesperson'];

const defaultForm = { name: '', email: '', password: '', role: 'salesperson', phone: '', isActive: true };

const UserForm = ({ initialData, onSubmit, loading }) => {
  const [form, setForm] = useState(defaultForm);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (initialData) {
      setForm({ ...defaultForm, ...initialData, password: '' });
    }
  }, [initialData]);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...form };
    if (!payload.password) delete payload.password;
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Full Name" required>
          <Input placeholder="Full name" value={form.name} onChange={set('name')} required />
        </FormField>
        <FormField label="Email" required>
          <Input type="email" placeholder="Email address" value={form.email} onChange={set('email')} required />
        </FormField>
        <FormField label={initialData ? 'New Password (leave blank to keep)' : 'Password'} required={!initialData}>
          <div className="relative">
            <Input
              type={showPass ? 'text' : 'password'}
              placeholder={initialData ? 'Leave blank to keep current' : 'Min 6 characters'}
              value={form.password}
              onChange={set('password')}
              required={!initialData}
              minLength={!initialData ? 6 : undefined}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </FormField>
        <FormField label="Phone">
          <Input placeholder="Phone number" value={form.phone} onChange={set('phone')} />
        </FormField>
        <FormField label="Role">
          <Select value={form.role} onChange={set('role')}>
            {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </Select>
        </FormField>
        <FormField label="Status">
          <Select value={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.value === 'true' }))}>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Select>
        </FormField>
      </div>
      <div className="flex justify-end pt-2 border-t border-gray-100">
        <Button type="submit" loading={loading}>
          {initialData ? 'Update User' : 'Create User'}
        </Button>
      </div>
    </form>
  );
};

const UsersPage = () => {
  const toast = useToast();
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [selected, setSelected] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/users');
      setUsers(data.data);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleAdd = async (formData) => {
    setSubmitting(true);
    try {
      await API.post('/users', formData);
      toast.success('User created successfully');
      setAddModal(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (formData) => {
    setSubmitting(true);
    try {
      await API.put(`/users/${selected._id}`, formData);
      toast.success('User updated successfully');
      setEditModal(false);
      setSelected(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await API.delete(`/users/${selected._id}`);
      toast.success('User deleted');
      setDeleteModal(false);
      setSelected(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (v, row) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {v?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-gray-800">{v}</p>
            <p className="text-xs text-gray-400">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      width: '130px',
      render: (v) => v || '—',
    },
    {
      key: 'role',
      label: 'Role',
      width: '110px',
      render: (v) => <StatusBadge status={v} />,
    },
    {
      key: 'isActive',
      label: 'Status',
      width: '90px',
      render: (v) => (
        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
          v ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {v ? <UserCheck size={12} /> : <UserX size={12} />}
          {v ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Joined',
      width: '110px',
      render: (v) => new Date(v).toLocaleDateString('en-IN'),
    },
    {
      key: '_id',
      label: 'Actions',
      width: '100px',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setSelected(row); setEditModal(true); }}
            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded"
            title="Edit"
          >
            <Edit2 size={14} />
          </button>
          {currentUser?._id !== row._id && (
            <button
              onClick={() => { setSelected(row); setDeleteModal(true); }}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ),
    },
  ];

  // Role summary cards
  const admins = users.filter((u) => u.role === 'admin').length;
  const managers = users.filter((u) => u.role === 'manager').length;
  const salespeople = users.filter((u) => u.role === 'salesperson').length;

  return (
    <div className="space-y-4 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
          <p className="text-sm text-gray-500">{users.length} total users</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchUsers} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"><RefreshCw size={15} /></button>
          <Button onClick={() => setAddModal(true)}><Plus size={16} /> Add User</Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Admins', count: admins, color: 'bg-purple-50 border-purple-200', text: 'text-purple-700' },
          { label: 'Managers', count: managers, color: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
          { label: 'Salespeople', count: salespeople, color: 'bg-green-50 border-green-200', text: 'text-green-700' },
        ].map(({ label, count, color, text }) => (
          <div key={label} className={`rounded-xl p-4 border ${color} text-center`}>
            <p className={`text-2xl font-bold ${text}`}>{count}</p>
            <p className="text-sm text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <Card>
        <Table
          columns={columns}
          data={users}
          loading={loading}
          emptyMessage="No users found."
        />
      </Card>

      {/* Add Modal */}
      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="Add New User" size="md">
        <UserForm onSubmit={handleAdd} loading={submitting} />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={editModal} onClose={() => { setEditModal(false); setSelected(null); }} title="Edit User" size="md">
        {selected && <UserForm initialData={selected} onSubmit={handleEdit} loading={submitting} />}
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={deleteModal} onClose={() => { setDeleteModal(false); setSelected(null); }} title="Delete User" size="sm">
        <div className="text-center space-y-4">
          <div className="bg-red-50 rounded-full h-14 w-14 flex items-center justify-center mx-auto">
            <Trash2 size={24} className="text-red-500" />
          </div>
          <p className="font-medium text-gray-900">Delete <strong>{selected?.name}</strong>?</p>
          <p className="text-sm text-gray-400">This action cannot be undone.</p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => { setDeleteModal(false); setSelected(null); }}>Cancel</Button>
            <Button variant="danger" className="flex-1" onClick={handleDelete}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UsersPage;
