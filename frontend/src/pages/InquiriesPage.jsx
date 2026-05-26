import React, {
  useState,
  useEffect,
  useCallback,
} from 'react';

import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  ArrowRightCircle,
  RefreshCw,
  X,
} from 'lucide-react';

import API from '../api/axios';

import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

import Table from '../components/common/Table';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';

import InquiryForm from '../components/inquiry/InquiryForm';

import {
  Button,
  Select,
  Card,
} from '../components/common/FormComponents';

// UPDATED STATUS
const STATUSES = [
  'New',
  'Under Discussion',
  'Quotation Submit',
  'Negotiation',
  'Order Recieved',
  'Inquiry Hold',
  'Inq. Lost',
];

const PRODUCTS = [
  'MCC',
  'PCC',
  'APFC',
  'VFD',
  'PLC',
  'OTHER',
];

const InquiriesPage = () => {
  const toast = useToast();
  const { isManager } = useAuth();

  const [inquiries, setInquiries] =
    useState([]);

  const [pagination, setPagination] =
    useState({
      page: 1,
      pages: 1,
      total: 0,
      limit: 10,
    });

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  // Filters
  const [search, setSearch] =
    useState('');

  const [filterStatus, setFilterStatus] =
    useState('');

  const [filterProduct, setFilterProduct] =
    useState('');

  const [page, setPage] = useState(1);

  // Modals
  const [addModal, setAddModal] =
    useState(false);

  const [editModal, setEditModal] =
    useState(false);

  const [detailModal, setDetailModal] =
    useState(false);

  const [deleteModal, setDeleteModal] =
    useState(false);

  const [selected, setSelected] =
    useState(null);

  // Fetch Inquiries
  const fetchInquiries = useCallback(
    async () => {
      setLoading(true);

      try {
        const params = {
          page,
          limit: 10,
        };

        if (search) {
          params.search = search;
        }

        if (filterStatus) {
          params.status =
            filterStatus;
        }

        if (filterProduct) {
          params.productType =
            filterProduct;
        }

        const { data } =
          await API.get(
            '/inquiries',
            {
              params,
            }
          );

        setInquiries(data.data);

        setPagination(
          data.pagination
        );
      } catch (error) {
        toast.error(
          'Failed to load inquiries'
        );
      } finally {
        setLoading(false);
      }
    },
    [
      page,
      search,
      filterStatus,
      filterProduct,
    ]
  );

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  useEffect(() => {
    setPage(1);
  }, [
    search,
    filterStatus,
    filterProduct,
  ]);

  // Add Inquiry
  const handleAdd = async (
    formData
  ) => {
    setSubmitting(true);

    try {
      await API.post(
        '/inquiries',
        formData
      );

      toast.success(
        'Inquiry created successfully'
      );

      setAddModal(false);

      fetchInquiries();
    } catch (err) {
      toast.error(
        err.response?.data
          ?.message ||
          'Failed to create inquiry'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Edit Inquiry
  const handleEdit = async (
    formData
  ) => {
    setSubmitting(true);

    try {
      await API.put(
        `/inquiries/${selected._id}`,
        formData
      );

      toast.success(
        'Inquiry updated successfully'
      );

      setEditModal(false);

      setSelected(null);

      fetchInquiries();
    } catch (err) {
      toast.error(
        err.response?.data
          ?.message ||
          'Failed to update inquiry'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Inquiry
  const handleDelete = async () => {
    try {
      await API.delete(
        `/inquiries/${selected._id}`
      );

      toast.success(
        'Inquiry deleted successfully'
      );

      setDeleteModal(false);

      setSelected(null);

      fetchInquiries();
    } catch (err) {
      toast.error(
        err.response?.data
          ?.message ||
          'Failed to delete inquiry'
      );
    }
  };

  // Convert To Project
  const handleConvert = async (
    inquiry
  ) => {
    try {
      await API.post(
        `/projects/convert/${inquiry._id}`
      );

      toast.success(
        'Inquiry converted to project'
      );

      fetchInquiries();
    } catch (err) {
      toast.error(
        err.response?.data
          ?.message ||
          'Conversion failed'
      );
    }
  };

  // Table Columns
  const columns = [
    {
      key: 'inquiryId',
      label: 'ID',
      width: '120px',

      render: (value) => (
        <span className="font-mono text-xs font-semibold text-blue-700">
          {value}
        </span>
      ),
    },

    {
      key: 'inquiryDate',
      label: 'Date',
      width: '110px',

      render: (value) =>
        new Date(
          value
        ).toLocaleDateString(
          'en-IN'
        ),
    },

    {
      key: 'customerName',
      label: 'Customer',

      render: (
        value,
        row
      ) => (
        <div>
          <p className="font-medium text-gray-800">
            {value}
          </p>

          <p className="text-xs text-gray-400">
            {row.companyName}
          </p>
        </div>
      ),
    },

    {
      key: 'mobileNumber',
      label: 'Mobile',
      width: '130px',
    },

    {
      key: 'location',
      label: 'Location',
      width: '140px',

      render: (value) =>
        value || '—',
    },

    {
      key: 'productType',
      label: 'Product',
      width: '100px',

      render: (value) => (
        <span className="rounded bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">
          {value}
        </span>
      ),
    },

    {
      key: 'estimatedValue',
      label: 'Budget Value',
      width: '130px',

      render: (value) =>
        value
          ? `₹${Number(
              value
            ).toLocaleString(
              'en-IN'
            )}`
          : '—',
    },

    {
      key: 'priority',
      label: 'Priority',
      width: '90px',

      render: (value) => (
        <StatusBadge
          status={value}
          size="xs"
        />
      ),
    },

    {
      key: 'status',
      label: 'Status',
      width: '150px',

      render: (value) => (
        <StatusBadge
          status={value}
        />
      ),
    },

    {
      key: 'nextFollowUpDate',
      label: 'Follow-up',
      width: '120px',

      render: (value) => {
        if (!value)
          return '—';

        const date =
          new Date(value);

        const isOverdue =
          date < new Date();

        return (
          <span
            className={`text-xs ${
              isOverdue
                ? 'font-semibold text-red-600'
                : 'text-gray-600'
            }`}
          >
            {date.toLocaleDateString(
              'en-IN'
            )}

            {isOverdue &&
              ' ⚠'}
          </span>
        );
      },
    },

    {
      key: '_id',
      label: 'Actions',
      width: '150px',

      render: (_, row) => (
        <div className="flex items-center gap-1">

          {/* View */}
          <button
            onClick={() => {
              setSelected(
                row
              );

              setDetailModal(
                true
              );
            }}
            className="rounded p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
          >
            <Eye size={14} />
          </button>

          {/* Edit */}
          <button
            onClick={() => {
              setSelected(
                row
              );

              setEditModal(
                true
              );
            }}
            className="rounded p-1.5 text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-600"
          >
            <Edit2 size={14} />
          </button>

          {/* Delete */}
          {isManager && (
            <button
              onClick={() => {
                setSelected(
                  row
                );

                setDeleteModal(
                  true
                );
              }}
              className="rounded p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 size={14} />
            </button>
          )}

          {/* Convert */}
          {row.status ===
            'Order Recieved' &&
            !row.convertedToProject && (
              <button
                onClick={() =>
                  handleConvert(
                    row
                  )
                }
                className="rounded p-1.5 text-gray-400 transition-colors hover:bg-green-50 hover:text-green-600"
              >
                <ArrowRightCircle size={14} />
              </button>
            )}
        </div>
      ),
    },
  ];

  return (
    <div className="fade-in space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">

        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            All Inquiries
          </h2>

          <p className="text-sm text-gray-500">
            {
              pagination.total
            }{' '}
            total records
          </p>
        </div>

        <Button
          onClick={() =>
            setAddModal(
              true
            )
          }
        >
          <Plus size={16} />
          Add Inquiry
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap items-center gap-3 p-4">

          {/* Search */}
          <div className="relative min-w-[220px] flex-1">

            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              placeholder="Search customer, company, location..."
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {search && (
              <button
                onClick={() =>
                  setSearch('')
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <Select
            value={
              filterStatus
            }
            onChange={(e) =>
              setFilterStatus(
                e.target.value
              )
            }
            className="w-48"
          >
            <option value="">
              All Statuses
            </option>

            {STATUSES.map(
              (status) => (
                <option
                  key={status}
                >
                  {status}
                </option>
              )
            )}
          </Select>

          {/* Product Filter */}
          <Select
            value={
              filterProduct
            }
            onChange={(e) =>
              setFilterProduct(
                e.target.value
              )
            }
            className="w-40"
          >
            <option value="">
              All Products
            </option>

            {PRODUCTS.map(
              (
                product
              ) => (
                <option
                  key={
                    product
                  }
                >
                  {product}
                </option>
              )
            )}
          </Select>

          {/* Clear */}
          {(search ||
            filterStatus ||
            filterProduct) && (
            <button
              onClick={() => {
                setSearch(
                  ''
                );

                setFilterStatus(
                  ''
                );

                setFilterProduct(
                  ''
                );
              }}
              className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700"
            >
              <X size={14} />
              Clear
            </button>
          )}

          {/* Refresh */}
          <button
            onClick={
              fetchInquiries
            }
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
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
          pagination={
            pagination
          }
          onPageChange={
            setPage
          }
          emptyMessage="No inquiries found"
        />
      </Card>

      {/* Add Modal */}
      <Modal
        isOpen={addModal}
        onClose={() =>
          setAddModal(
            false
          )
        }
        title="Add Inquiry"
        size="lg"
      >
        <InquiryForm
          onSubmit={
            handleAdd
          }
          loading={
            submitting
          }
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={editModal}
        onClose={() => {
          setEditModal(
            false
          );

          setSelected(
            null
          );
        }}
        title="Edit Inquiry"
        size="lg"
      >
        {selected && (
          <InquiryForm
            initialData={
              selected
            }
            onSubmit={
              handleEdit
            }
            loading={
              submitting
            }
          />
        )}
      </Modal>

      {/* Details Modal */}
      <Modal
        isOpen={
          detailModal
        }
        onClose={() => {
          setDetailModal(
            false
          );

          setSelected(
            null
          );
        }}
        title="Inquiry Details"
        size="md"
      >
        {selected && (
          <div className="space-y-3 text-sm">

            <div className="grid grid-cols-2 gap-3">

              {[
                [
                  'Inquiry ID',
                  selected.inquiryId,
                ],

                [
                  'Date',
                  new Date(
                    selected.inquiryDate
                  ).toLocaleDateString(
                    'en-IN'
                  ),
                ],

                [
                  'Customer',
                  selected.customerName,
                ],

                [
                  'Company',
                  selected.companyName,
                ],

                [
                  'Contact',
                  selected.contactPerson,
                ],

                [
                  'Mobile',
                  selected.mobileNumber,
                ],

                [
                  'Email',
                  selected.email,
                ],

                [
                  'Location',
                  selected.location,
                ],

                [
                  'Product',
                  selected.productType,
                ],

                [
                  'Project',
                  selected.projectName,
                ],

                [
                  'Budget Value',
                  selected.estimatedValue
                    ? `₹${Number(
                        selected.estimatedValue
                      ).toLocaleString(
                        'en-IN'
                      )}`
                    : '—',
                ],

                [
                  'Follow-up',
                  selected.nextFollowUpDate
                    ? new Date(
                        selected.nextFollowUpDate
                      ).toLocaleDateString(
                        'en-IN'
                      )
                    : '—',
                ],
              ].map(
                ([
                  label,
                  value,
                ]) => (
                  <div
                    key={
                      label
                    }
                    className="rounded-lg bg-gray-50 p-3"
                  >
                    <p className="mb-0.5 text-xs text-gray-500">
                      {
                        label
                      }
                    </p>

                    <p className="font-medium text-gray-800">
                      {value ||
                        '—'}
                    </p>
                  </div>
                )
              )}
            </div>

            {/* Status & Priority */}
            <div className="flex gap-2">

              <div className="flex-1 rounded-lg bg-gray-50 p-3">
                <p className="mb-1 text-xs text-gray-500">
                  Status
                </p>

                <StatusBadge
                  status={
                    selected.status
                  }
                />
              </div>

              <div className="flex-1 rounded-lg bg-gray-50 p-3">
                <p className="mb-1 text-xs text-gray-500">
                  Priority
                </p>

                <StatusBadge
                  status={
                    selected.priority
                  }
                />
              </div>
            </div>

            {/* Remarks */}
            {selected.remarks && (
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="mb-1 text-xs text-gray-500">
                  Remarks
                </p>

                <p className="text-gray-800">
                  {
                    selected.remarks
                  }
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={
          deleteModal
        }
        onClose={() => {
          setDeleteModal(
            false
          );

          setSelected(
            null
          );
        }}
        title="Delete Inquiry"
        size="sm"
      >
        <div className="space-y-4 text-center">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <Trash2
              size={24}
              className="text-red-500"
            />
          </div>

          <div>
            <p className="font-medium text-gray-900">
              Are you sure?
            </p>

            <p className="mt-1 text-sm text-gray-500">
              This will
              permanently
              delete inquiry{' '}
              <strong>
                {
                  selected?.inquiryId
                }
              </strong>
            </p>
          </div>

          <div className="flex gap-3">

            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setDeleteModal(
                  false
                );

                setSelected(
                  null
                );
              }}
            >
              Cancel
            </Button>

            <Button
              variant="danger"
              className="flex-1"
              onClick={
                handleDelete
              }
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InquiriesPage;