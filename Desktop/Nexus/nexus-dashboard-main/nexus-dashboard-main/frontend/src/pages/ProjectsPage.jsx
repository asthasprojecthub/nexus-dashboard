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
  RefreshCw,
  X,
} from 'lucide-react';

import API from '../api/axios';

import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

import Table from '../components/common/Table';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';

import ProjectForm from '../components/project/ProjectForm';

import {
  Button,
  Select,
  Card,
} from '../components/common/FormComponents';

// UPDATED STATUS
const PROJECT_STATUSES = [
  'Planning',
  'Design',
  'Production',
  'Testing',
  'Delivered',
  'Installation',
  'Completed',
];

const ProjectsPage = () => {
  const toast = useToast();

  const { isAdmin } = useAuth();

  const [projects, setProjects] =
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

  const [page, setPage] =
    useState(1);

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

  // Fetch Projects
  const fetchProjects = useCallback(
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
          params.projectStatus =
            filterStatus;
        }

        const { data } =
          await API.get(
            '/projects',
            { params }
          );

        setProjects(data.data);

        setPagination(
          data.pagination
        );
      } catch {
        toast.error(
          'Failed to load projects'
        );
      } finally {
        setLoading(false);
      }
    },
    [page, search, filterStatus]
  );

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    setPage(1);
  }, [search, filterStatus]);

  // Add Project
  const handleAdd = async (
    formData
  ) => {
    setSubmitting(true);

    try {
      await API.post(
        '/projects',
        formData
      );

      toast.success(
        'Project created successfully'
      );

      setAddModal(false);

      fetchProjects();
    } catch (err) {
      toast.error(
        err.response?.data
          ?.message ||
          'Failed to create project'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Edit Project
  const handleEdit = async (
    formData
  ) => {
    setSubmitting(true);

    try {
      await API.put(
        `/projects/${selected._id}`,
        formData
      );

      toast.success(
        'Project updated successfully'
      );

      setEditModal(false);

      setSelected(null);

      fetchProjects();
    } catch (err) {
      toast.error(
        err.response?.data
          ?.message ||
          'Failed to update project'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Project
  const handleDelete = async () => {
    try {
      await API.delete(
        `/projects/${selected._id}`
      );

      toast.success(
        'Project deleted'
      );

      setDeleteModal(false);

      setSelected(null);

      fetchProjects();
    } catch (err) {
      toast.error(
        err.response?.data
          ?.message ||
          'Failed to delete'
      );
    }
  };

  // TABLE COLUMNS
  const columns = [
    {
      key: 'projectId',
      label: 'ID',
      width: '130px',

      render: (value) => (
        <span className="font-mono text-xs font-semibold text-blue-700">
          {value}
        </span>
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
            {row.projectName}
          </p>
        </div>
      ),
    },

    {
      key: 'panelType',
      label: 'Panel',
      width: '90px',

      render: (value) => (
        <span className="rounded bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">
          {value}
        </span>
      ),
    },

    // REMOVED ORDER VALUE

    {
      key: 'projectStatus',
      label: 'Status',
      width: '140px',

      render: (value) => (
        <StatusBadge
          status={value}
        />
      ),
    },

    // REMOVED PAYMENT STATUS

    {
      key:
        'completionPercentage',

      label: 'Progress',
      width: '120px',

      render: (value) => (
        <div className="flex items-center gap-2">

          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">

            <div
              className="h-full rounded-full bg-blue-500"
              style={{
                width: `${
                  value || 0
                }%`,
              }}
            />
          </div>

          <span className="w-8 text-xs text-gray-500">
            {value || 0}%
          </span>
        </div>
      ),
    },

    {
      key:
        'expectedDeliveryDate',

      // UPDATED
      label: 'Delivery Date',

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
          </span>
        );
      },
    },

    {
      key: '_id',
      label: 'Actions',
      width: '110px',

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
            className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
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
            className="rounded p-1.5 text-gray-400 hover:bg-amber-50 hover:text-amber-600"
          >
            <Edit2 size={14} />
          </button>

          {/* Delete */}
          {isAdmin && (
            <button
              onClick={() => {
                setSelected(
                  row
                );

                setDeleteModal(
                  true
                );
              }}
              className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 size={14} />
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
            All Projects
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
          Add Project
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap items-center gap-3 p-4">

          {/* Search */}
          <div className="relative min-w-[200px] flex-1">

            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              placeholder="Search project, customer..."
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

            {PROJECT_STATUSES.map(
              (status) => (
                <option
                  key={status}
                >
                  {status}
                </option>
              )
            )}
          </Select>

          {/* Clear */}
          {(search ||
            filterStatus) && (
            <button
              onClick={() => {
                setSearch('');

                setFilterStatus(
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
              fetchProjects
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
          data={projects}
          loading={loading}
          pagination={
            pagination
          }
          onPageChange={
            setPage
          }
          emptyMessage="No projects found. Add your first project!"
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
        title="Add New Project"
        size="lg"
      >
        <ProjectForm
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
        title="Edit Project"
        size="lg"
      >
        {selected && (
          <ProjectForm
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
        title="Project Details"
        size="md"
      >
        {selected && (
          <div className="space-y-3 text-sm">

            <div className="grid grid-cols-2 gap-3">

              {[
                [
                  'Project ID',
                  selected.projectId,
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
                  'Project Name',
                  selected.projectName,
                ],

                [
                  'Panel Type',
                  selected.panelType,
                ],

                [
                  'Order Date',
                  selected.orderDate
                    ? new Date(
                        selected.orderDate
                      ).toLocaleDateString(
                        'en-IN'
                      )
                    : '—',
                ],

                // UPDATED
                [
                  'Delivery Date',
                  selected.expectedDeliveryDate
                    ? new Date(
                        selected.expectedDeliveryDate
                      ).toLocaleDateString(
                        'en-IN'
                      )
                    : '—',
                ],

                [
                  'Assigned To',
                  selected.assignedTo
                    ?.name ||
                    '—',
                ],

                [
                  'Production',
                  selected.productionStatus,
                ],

                // UPDATED
                [
                  'Delivered',
                  selected.dispatchStatus,
                ],

                [
                  'Installation',
                  selected.installationStatus,
                ],
              ].map(
                ([label, value]) => (
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

            {/* Status */}
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="mb-1 text-xs text-gray-500">
                Project Status
              </p>

              <StatusBadge
                status={
                  selected.projectStatus
                }
              />
            </div>

            {/* Completion */}
            <div className="rounded-lg bg-gray-50 p-3">

              <p className="mb-2 text-xs text-gray-500">
                Completion
              </p>

              <div className="flex items-center gap-3">

                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-200">

                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{
                      width: `${
                        selected.completionPercentage ||
                        0
                      }%`,
                    }}
                  />
                </div>

                <span className="font-semibold text-gray-800">
                  {
                    selected.completionPercentage ||
                    0
                  }
                  %
                </span>
              </div>
            </div>

            {/* Notes */}
            {selected.notes && (
              <div className="rounded-lg bg-gray-50 p-3">

                <p className="mb-1 text-xs text-gray-500">
                  Notes
                </p>

                <p className="text-gray-800">
                  {
                    selected.notes
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
        title="Delete Project"
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
              delete project{' '}
              <strong>
                {
                  selected?.projectId
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

export default ProjectsPage;