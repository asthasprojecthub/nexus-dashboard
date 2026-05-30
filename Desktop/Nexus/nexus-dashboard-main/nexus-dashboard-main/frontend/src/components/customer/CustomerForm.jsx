import React, { useState, useEffect } from 'react';
import { FormField, Input, Textarea, Button } from '../common/FormComponents';

const defaultForm = {
  customerName: '',
  companyName: '',
  contactPerson: '',
  email: '',
  mobileNumber: '',
  alternateNumber: '',
  city: '',
  address: '',
  gstNumber: '',
  notes: '',
};

const CustomerForm = ({ initialData, onSubmit, loading }) => {
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    if (initialData) setForm({ ...defaultForm, ...initialData });
  }, [initialData]);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Customer Name" required>
          <Input placeholder="Full name" value={form.customerName} onChange={set('customerName')} required />
        </FormField>
        <FormField label="Company Name">
          <Input placeholder="Company" value={form.companyName} onChange={set('companyName')} />
        </FormField>
        <FormField label="Contact Person">
          <Input placeholder="Contact person" value={form.contactPerson} onChange={set('contactPerson')} />
        </FormField>
        <FormField label="Mobile Number">
          <Input placeholder="Mobile" value={form.mobileNumber} onChange={set('mobileNumber')} />
        </FormField>
        <FormField label="Alternate Number">
          <Input placeholder="Alternate" value={form.alternateNumber} onChange={set('alternateNumber')} />
        </FormField>
        <FormField label="Email">
          <Input type="email" placeholder="Email" value={form.email} onChange={set('email')} />
        </FormField>
        <FormField label="City">
          <Input placeholder="City" value={form.city} onChange={set('city')} />
        </FormField>
        <FormField label="GST Number">
          <Input placeholder="GST number" value={form.gstNumber} onChange={set('gstNumber')} />
        </FormField>
      </div>
      <FormField label="Address">
        <Textarea placeholder="Full address" value={form.address} onChange={set('address')} rows={2} />
      </FormField>
      <FormField label="Notes">
        <Textarea placeholder="Additional notes" value={form.notes} onChange={set('notes')} rows={2} />
      </FormField>
      <div className="flex justify-end pt-2 border-t border-gray-100">
        <Button type="submit" loading={loading}>
          {initialData ? 'Update Customer' : 'Add Customer'}
        </Button>
      </div>
    </form>
  );
};

export default CustomerForm;
