import React, {
  useState,
  useEffect,
} from 'react';

import {
  FormField,
  Input,
  Select,
  Textarea,
  Button,
} from '../common/FormComponents';

import API from '../../api/axios';

// UPDATED PANEL TYPES
const PANEL_TYPES = [
  'MCC',
  'PCC',
  'APFC',
  'VFD',
  'PLC',
  'OTHER',
];

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

const PRODUCTION_STATUSES = [
  'Not Started',
  'In Progress',
  'Completed',
];

// UPDATED
const DISPATCH_STATUSES = [
  'Not Delivered',
  'Delivered',
];

const INSTALL_STATUSES = [
  'Not Started',
  'In Progress',
  'Completed',
];

// REMOVED PAYMENT STATUS

const defaultForm = {
  customerName: '',
  companyName: '',
  projectName: '',

  panelType: 'MCC',

  // REMOVED ORDER VALUE

  orderDate:
    new Date()
      .toISOString()
      .split('T')[0],

  expectedDeliveryDate: '',

  projectStatus: 'Planning',

  productionStatus:
    'Not Started',

  dispatchStatus:
    'Not Delivered',

  installationStatus:
    'Not Started',

  completionPercentage: 0,

  assignedTo: '',

  notes: '',
};

const ProjectForm = ({
  initialData,
  onSubmit,
  loading,
}) => {
  const [form, setForm] =
    useState(defaultForm);

  const [users, setUsers] =
    useState([]);

  // Edit Mode
  useEffect(() => {
    if (initialData) {
      setForm({
        ...defaultForm,
        ...initialData,

        orderDate:
          initialData.orderDate
            ? new Date(
                initialData.orderDate
              )
                .toISOString()
                .split('T')[0]
            : defaultForm.orderDate,

        expectedDeliveryDate:
          initialData.expectedDeliveryDate
            ? new Date(
                initialData.expectedDeliveryDate
              )
                .toISOString()
                .split('T')[0]
            : '',

        assignedTo:
          initialData
            .assignedTo?._id ||
          initialData.assignedTo ||
          '',

        completionPercentage:
          initialData.completionPercentage ||
          0,
      });
    }
  }, [initialData]);

  // Fetch Users
  useEffect(() => {
    API.get('/users')
      .then(({ data }) =>
        setUsers(data.data)
      )
      .catch(() => {});
  }, []);

  // Handle Change
  const set =
    (field) => (e) =>
      setForm((prev) => ({
        ...prev,
        [field]:
          e.target.value,
      }));

  // Submit
  const handleSubmit = (
    e
  ) => {
    e.preventDefault();

    const payload = {
      ...form,
    };

    if (
      payload
        .completionPercentage
    ) {
      payload.completionPercentage =
        Number(
          payload.completionPercentage
        );
    }

    if (
      !payload.assignedTo
    ) {
      delete payload.assignedTo;
    }

    if (
      !payload.expectedDeliveryDate
    ) {
      delete payload.expectedDeliveryDate;
    }

    onSubmit(payload);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >

      {/* Row 1 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

        <FormField
          label="Customer Name"
          required
        >
          <Input
            placeholder="Customer name"
            value={
              form.customerName
            }
            onChange={set(
              'customerName'
            )}
            required
          />
        </FormField>

        <FormField label="Company Name">
          <Input
            placeholder="Company name"
            value={
              form.companyName
            }
            onChange={set(
              'companyName'
            )}
          />
        </FormField>

        <FormField
          label="Project Name"
          required
        >
          <Input
            placeholder="Project name"
            value={
              form.projectName
            }
            onChange={set(
              'projectName'
            )}
            required
          />
        </FormField>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

        <FormField label="Panel Type">
          <Select
            value={
              form.panelType
            }
            onChange={set(
              'panelType'
            )}
          >
            {PANEL_TYPES.map(
              (panel) => (
                <option
                  key={panel}
                >
                  {panel}
                </option>
              )
            )}
          </Select>
        </FormField>

        <FormField label="Assigned To">
          <Select
            value={
              form.assignedTo
            }
            onChange={set(
              'assignedTo'
            )}
          >
            <option value="">
              -- Unassigned --
            </option>

            {users.map(
              (user) => (
                <option
                  key={
                    user._id
                  }
                  value={
                    user._id
                  }
                >
                  {user.name} (
                  {user.role})
                </option>
              )
            )}
          </Select>
        </FormField>
      </div>

      {/* Row 3 - Dates */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

        <FormField label="Order Date">
          <Input
            type="date"
            value={
              form.orderDate
            }
            onChange={set(
              'orderDate'
            )}
          />
        </FormField>

        {/* UPDATED */}
        <FormField label="Delivery Date">
          <Input
            type="date"
            value={
              form.expectedDeliveryDate
            }
            onChange={set(
              'expectedDeliveryDate'
            )}
          />
        </FormField>
      </div>

      {/* Row 4 - Status */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

        <FormField label="Project Status">
          <Select
            value={
              form.projectStatus
            }
            onChange={set(
              'projectStatus'
            )}
          >
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
        </FormField>

        <FormField label="Production Status">
          <Select
            value={
              form.productionStatus
            }
            onChange={set(
              'productionStatus'
            )}
          >
            {PRODUCTION_STATUSES.map(
              (status) => (
                <option
                  key={status}
                >
                  {status}
                </option>
              )
            )}
          </Select>
        </FormField>

        {/* UPDATED */}
        <FormField label="Delivery Status">
          <Select
            value={
              form.dispatchStatus
            }
            onChange={set(
              'dispatchStatus'
            )}
          >
            {DISPATCH_STATUSES.map(
              (status) => (
                <option
                  key={status}
                >
                  {status}
                </option>
              )
            )}
          </Select>
        </FormField>

        <FormField label="Installation Status">
          <Select
            value={
              form.installationStatus
            }
            onChange={set(
              'installationStatus'
            )}
          >
            {INSTALL_STATUSES.map(
              (status) => (
                <option
                  key={status}
                >
                  {status}
                </option>
              )
            )}
          </Select>
        </FormField>
      </div>

      {/* Completion */}
      <FormField
        label={`Completion: ${form.completionPercentage}%`}
      >
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={
            form.completionPercentage
          }
          onChange={set(
            'completionPercentage'
          )}
          className="w-full accent-blue-600"
        />

        <div className="mt-1 flex justify-between text-xs text-gray-400">

          <span>0%</span>

          <span>50%</span>

          <span>100%</span>
        </div>
      </FormField>

      {/* Notes */}
      <FormField label="Notes">
        <Textarea
          placeholder="Project notes..."
          value={form.notes}
          onChange={set(
            'notes'
          )}
          rows={3}
        />
      </FormField>

      {/* Actions */}
      <div className="flex justify-end gap-3 border-t border-gray-100 pt-2">

        <Button
          type="submit"
          loading={loading}
        >
          {initialData
            ? 'Update Project'
            : 'Create Project'}
        </Button>
      </div>
    </form>
  );
};

export default ProjectForm;