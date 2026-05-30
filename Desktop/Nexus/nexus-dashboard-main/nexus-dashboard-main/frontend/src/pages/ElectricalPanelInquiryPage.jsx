// ─────────────────────────────────────────────────────────────────────────────
// ElectricalPanelInquiryPage.jsx
// Route: /inquiries/new  and  /inquiries/:id/edit
// Drop into: frontend/src/pages/ElectricalPanelInquiryPage.jsx
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Building2, FolderOpen, Zap, Settings, Cpu, Shield,
  FileText, ChevronLeft, AlertCircle, CheckCircle2,
  ClipboardCheck, Info, Plus, Trash2, User,
  Paperclip, X, Download, FileIcon,
} from 'lucide-react';

import API from '../api/axios';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/common/Spinner';

import {
  FormField, Input, Textarea, Button,
  SectionCard, AutocompleteInput, SearchableSelect, MultiCheckSelect,
  DynamicLoadTable, ControlMatrixTable,
  FormDivider, InlineToggle, StepProgressBar,
} from '../components/common/FormComponents.extended';

import {
  PANEL_TYPES, INDUSTRY_TYPES, OFFER_TYPES, VOLTAGE_OPTIONS,
  FREQUENCY_OPTIONS, IP_RATINGS, INSTALLATION_TYPES,
  SHORT_CIRCUIT_OPTIONS, PANEL_MOUNTING_TYPES, ENCLOSURE_STANDARDS,
  CONTROL_COMPONENTS, PRIORITY_OPTIONS, DEFAULT_LOAD_ROW,
  DELIVERY_TERMS, PAYMENT_TERMS, CONTROL_TYPE_OPTIONS,
  BUSBAR_MATERIALS, DESIGNATION_OPTIONS,
} from '../data/masterData';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_CONTACT = () => ({
  id: Date.now() + Math.random(),
  name: '',
  phone: '',
  email: '',
  designation: '',
});

const defaultForm = () => ({
  // Section 1 — Client Info
  inquiryDate:    new Date().toISOString().split('T')[0],
  rfqNumber:      '',
  companyName:    '',
  contacts:       [DEFAULT_CONTACT()],
  siteAddress:    '',
  city:           '',

  // Section 2 — Project Details  (Budget + Priority removed — managed by estimator)
  projectName:          '',
  industryType:         '',
  customIndustryType:   '',   // shown when industryType === 'Other'
  offerType:            '',
  previousOrderRef: '',

  // Section 3 — Panel Type
  panelTypes:             [],
  customPanelType:        '',   // shown when panelTypes includes 'OTHER'
  applicationDescription: '',

  // Section 4 — Technical Specs
  supplyVoltage:        '',
  customVoltage:        '',     // shown when supplyVoltage === 'Custom'
  frequency:            '50 Hz',
  panelAreaClass:       '',
  ipRating:             '',
  ipRatingCustom:       '',     // shown when ipRating === 'OTHER'
  installationType:     '',
  shortCircuitCapacity: '',
  busbarMaterial:       'Aluminium',
  enclosureStandard:    '',

  // Section 5 — Load Details
  loadDetails: [DEFAULT_LOAD_ROW()],

  // Section 6 — Control & Monitoring
  controlType:   'Automatic',
  controlMatrix: {},

  // Section 7 — Standards & Compliance
  panelMounting:         '',
  certificationRequired: false,
  certificationDetails:  '',
  drawingsAttached:      false,
  deliveryDate:          '',
  deliveryTerms:         '',
  programmingScope:      'Customer Scope',
  onsiteSupport:         false,
  paymentTerms:          '',

  // Section 8 — Notes & Review
  additionalNotes:  '',
  internalRemarks:  '',
  preparedBy:       '',

  // Meta (kept for backend compat — not editable by salesperson)
  status:           'New',
  productType:      '',
  customerName:     '',
  nextFollowUpDate: '',
  reviewStatus:     '',
});

const SECTIONS = [
  'Client Info', 'Project', 'Panel Type', 'Tech Specs',
  'Load Details', 'Control', 'Standards', 'Notes',
];

// ─── File utility helpers ──────────────────────────────────────────────────────

const formatBytes = (bytes = 0) => {
  if (!bytes) return '';
  if (bytes < 1024)           return `${bytes} B`;
  if (bytes < 1024 * 1024)    return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fileEmoji = (mimeType = '', name = '') => {
  const ext = (name || '').split('.').pop()?.toLowerCase();
  if (mimeType.includes('pdf')   || ext === 'pdf')                          return '📄';
  if (mimeType.includes('image') || ['jpg','jpeg','png','gif','webp'].includes(ext)) return '🖼️';
  if (mimeType.includes('excel') || ['xls','xlsx'].includes(ext))           return '📊';
  if (mimeType.includes('word')  || ['doc','docx'].includes(ext))           return '📝';
  if (ext === 'zip' || mimeType.includes('zip'))                            return '🗜️';
  return '📎';
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const ElectricalPanelInquiryPage = () => {
  const navigate = useNavigate();
  const { id }   = useParams();
  const toast    = useToast();
  const { user } = useAuth();

  const isEdit = Boolean(id);

  const [form,        setForm]        = useState(defaultForm());
  const [errors,      setErrors]      = useState({});
  const [submitting,  setSubmitting]  = useState(false);
  const [pageLoading, setPageLoading] = useState(isEdit);

  // ── Attachment state ─────────────────────────────────────────────────────────
  // stagedFiles   : File objects selected by user, not yet on server
  // savedAttachments : attachment sub-docs already persisted on the server
  const [stagedFiles,      setStagedFiles]      = useState([]);
  const [savedAttachments, setSavedAttachments] = useState([]);
  const fileInputRef = useRef(null);

  // Autocomplete suggestion pools
  const [companySuggestions,     setCompanySuggestions]     = useState([]);
  const [contactNameSuggestions, setContactNameSuggestions] = useState([]);
  const [citySuggestions,        setCitySuggestions]        = useState([]);

  // Past inquiries for "Repeat Order" selector
  const [pastInquiries, setPastInquiries] = useState([]);

  // Step progress scroll tracking
  const [activeSection, setActiveSection] = useState(0);
  const sectionRefs = useRef([]);

  // ── Load existing inquiry (edit mode) ──────────────────────────────────────
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const { data } = await API.get(`/inquiries/${id}`);
        const d = data.data;

        // Normalise contacts: old single-contact records → array
        let contacts = d.contacts && d.contacts.length
          ? d.contacts.map(c => ({ ...c, id: c.id || Date.now() + Math.random() }))
          : [{ id: Date.now(), name: d.contactPerson || '', phone: d.mobileNumber || '', email: d.email || '', designation: d.designation || '' }];

        // Resolve "Other/Custom" back-fill for edit mode
        // If supplyVoltage stored is not in VOLTAGE_OPTIONS, it was a custom value
        const knownVoltages = Array.isArray(VOLTAGE_OPTIONS)
          ? VOLTAGE_OPTIONS.map(o => (typeof o === 'string' ? o : o.value))
          : [];
        const isCustomVoltage = d.supplyVoltage && !knownVoltages.includes(d.supplyVoltage) && d.supplyVoltage !== 'Custom';
        const displayVoltage  = isCustomVoltage ? 'Custom' : (d.supplyVoltage || '');
        const customVoltage   = isCustomVoltage ? (d.supplyVoltage || '') : '';

        // If panelTypes includes a value not in PANEL_TYPES list — treat as OTHER
        const knownPanelTypes = Array.isArray(PANEL_TYPES)
          ? PANEL_TYPES.map(o => (typeof o === 'string' ? o : o.value))
          : [];
        const rawPanelTypes = d.panelTypes || (d.productType ? [d.productType] : []);
        const customPanelType = rawPanelTypes.find(pt => !knownPanelTypes.includes(pt) && pt !== 'OTHER') || d.customPanelType || '';
        const panelTypes      = customPanelType
          ? [...rawPanelTypes.filter(pt => knownPanelTypes.includes(pt)), 'OTHER']
          : rawPanelTypes;

        // Resolve industryType "Other" back-fill for edit mode.
        // If the stored value is not in the known INDUSTRY_TYPES list (excluding 'Other'),
        // it was a custom value saved as industryType — restore it into customIndustryType.
        const knownIndustryTypes = ['Automotive','Chemical & Pharma','Construction','Data Centre',
          'Food & Beverage','Infrastructure','Metal & Fabrication','Mining','Oil & Gas',
          'Paper & Pulp','Power Generation','Renewable Energy','Sugar & Distillery',
          'Textile','Water Treatment','Other'];
        const isCustomIndustry    = d.industryType && !knownIndustryTypes.includes(d.industryType);
        const displayIndustryType = isCustomIndustry ? 'Other' : (d.industryType || '');
        const customIndustryType  = isCustomIndustry ? d.industryType : (d.customIndustryType || '');

        setForm(prev => ({
          ...prev,
          ...d,
          inquiryDate:      d.inquiryDate      ? new Date(d.inquiryDate).toISOString().split('T')[0]      : prev.inquiryDate,
          deliveryDate:     d.deliveryDate      ? new Date(d.deliveryDate).toISOString().split('T')[0]     : '',
          nextFollowUpDate: d.nextFollowUpDate  ? new Date(d.nextFollowUpDate).toISOString().split('T')[0] : '',
          loadDetails:      d.loadDetails?.length ? d.loadDetails : [DEFAULT_LOAD_ROW()],
          controlMatrix:    d.controlMatrix || {},
          panelTypes,
          customPanelType,
          supplyVoltage:    displayVoltage,
          customVoltage,
          industryType:     displayIndustryType,
          customIndustryType,
          contacts,
          // Ensure budget/priority not displayed (remove from loaded data)
          estimatedValue: undefined,
          priority:        undefined,
        }));

        // Load already-saved attachments (back-filled by controller)
        setSavedAttachments(
          (d.attachments || []).filter(a => a && (a.storedName || a.originalName))
        );
      } catch {
        toast.error('Failed to load inquiry');
        navigate('/inquiries');
      } finally {
        setPageLoading(false);
      }
    })();
  }, [id, isEdit]);

  // ── Customer suggestions ────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data } = await API.get('/customers?limit=200&select=companyName,contactPerson,city');
        const customers = data.data || [];
        setCompanySuggestions([...new Set(customers.map(c => c.companyName).filter(Boolean))]);
        setContactNameSuggestions([...new Set(customers.map(c => c.contactPerson).filter(Boolean))]);
        setCitySuggestions([...new Set(customers.map(c => c.city).filter(Boolean))]);
      } catch { /* non-fatal */ }
    })();
  }, []);

  // ── Past inquiries (for Repeat Order selector) ─────────────────────────────
  useEffect(() => {
    if (form.offerType !== 'repeat') return;
    if (pastInquiries.length > 0) return;
    (async () => {
      try {
        const { data } = await API.get('/inquiries?limit=100&status=Order Recieved&select=inquiryId,projectName,companyName');
        setPastInquiries(data.data || []);
      } catch { /* non-fatal */ }
    })();
  }, [form.offerType]);

  // ── Section scroll tracker ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => {
      const offsets = sectionRefs.current.map(r => r?.getBoundingClientRect().top ?? Infinity);
      const idx = offsets.reduce((best, top, i) => top < 120 && top > offsets[best] ? i : best, 0);
      setActiveSection(idx);
    };
    const main = document.querySelector('main');
    main?.addEventListener('scroll', handler, { passive: true });
    return () => main?.removeEventListener('scroll', handler);
  }, []);

  // ── Generic field setter ────────────────────────────────────────────────────
  const set = useCallback((field) => (val) => {
    const value = val?.target !== undefined ? val.target.value : val;
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  }, []);

  // ── Contacts helpers ────────────────────────────────────────────────────────
  const addContact = () => {
    setForm(prev => ({ ...prev, contacts: [...prev.contacts, DEFAULT_CONTACT()] }));
  };

  const removeContact = (cid) => {
    setForm(prev => ({
      ...prev,
      contacts: prev.contacts.filter(c => c.id !== cid),
    }));
  };

  const updateContact = (cid, field, val) => {
    setForm(prev => ({
      ...prev,
      contacts: prev.contacts.map(c => c.id === cid ? { ...c, [field]: val } : c),
    }));
    setErrors(prev => ({ ...prev, [`contact_${cid}_${field}`]: '' }));
  };

  // ── File attachment helpers ─────────────────────────────────────────────────
  const handleFileSelect = (e) => {
    const newFiles = Array.from(e.target.files || []);
    if (newFiles.length === 0) return;
    const totalCount = savedAttachments.length + stagedFiles.length + newFiles.length;
    if (totalCount > 10) {
      toast.error('Maximum 10 attachments allowed');
      return;
    }
    setStagedFiles(prev => [...prev, ...newFiles]);
    // Reset input so same file can be re-added after removal
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeStagedFile = (index) => {
    setStagedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeSavedAttachment = (index) => {
    setSavedAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.companyName.trim())     e.companyName  = 'Company name is required';
    if (!form.projectName.trim())     e.projectName  = 'Project name is required';
    if (!form.industryType)           e.industryType = 'Industry type is required';
    if (form.panelTypes.length === 0) e.panelTypes   = 'Select at least one panel type';
    if (!form.supplyVoltage)          e.supplyVoltage = 'Supply voltage is required';

    // Dynamic Other field validations
    if (form.industryType === 'Other' && !form.customIndustryType?.trim())
      e.customIndustryType = 'Please specify the industry type';
    if (form.supplyVoltage === 'Custom' && !form.customVoltage?.trim())
      e.customVoltage = 'Please specify the custom voltage';
    if (form.panelTypes.includes('OTHER') && !form.customPanelType?.trim())
      e.customPanelType = 'Please describe the custom panel type';

    // Validate first contact (required)
    const primary = form.contacts[0];
    if (!primary || !primary.name.trim()) e.contact_primary_name = 'Contact name is required';
    if (primary?.phone && !/^\d{10}$/.test(primary.phone.replace(/\s/g, '')))
      e.contact_primary_phone = 'Enter a valid 10-digit number';
    if (primary?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(primary.email))
      e.contact_primary_email = 'Invalid email address';

    // Validate additional contacts (optional, validate format if value given)
    form.contacts.slice(1).forEach((c, i) => {
      if (c.phone && !/^\d{10}$/.test(c.phone.replace(/\s/g, '')))
        e[`contact_${i + 1}_phone`] = 'Invalid number';
      if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email))
        e[`contact_${i + 1}_email`] = 'Invalid email';
    });

    return e;
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      toast.error('Please fix the highlighted errors');
      return;
    }
    setSubmitting(true);
    try {
      // Strip transient UI-only `id` field from each contact before sending
      const cleanContacts = form.contacts
        .filter(c => c.name || c.phone || c.email)
        .map(({ id, ...rest }) => rest);

      // Resolve "Other/Custom" field values before sending
      const resolvedIndustryType = form.industryType === 'Other' ? form.customIndustryType : form.industryType;
      const resolvedVoltage  = form.supplyVoltage === 'Custom' ? form.customVoltage  : form.supplyVoltage;
      const resolvedIpRating = form.ipRating      === 'OTHER'  ? form.ipRatingCustom : form.ipRating;

      // Build FormData so files can be sent alongside JSON fields
      const fd = new FormData();

      // Append new (staged) files under field name 'attachments' (multer array name)
      stagedFiles.forEach(f => fd.append('attachments', f));

      // Build JSON payload — all scalar/array fields
      const jsonPayload = {
        ...form,
        contacts:         cleanContacts,
        customerName:     form.companyName,
        productType:      form.panelTypes[0] || 'OTHER',
        location:         form.city || form.siteAddress,
        industryType:     resolvedIndustryType,
        supplyVoltage:    resolvedVoltage,
        ipRating:         resolvedIpRating,
        customPanelType:  form.panelTypes.includes('OTHER') ? form.customPanelType : undefined,
        previousOrderRef: form.previousOrderRef || undefined,
        // Strip transient / UI-only fields
        customIndustryType: undefined,
        customVoltage:    undefined,
        ipRatingCustom:   undefined,
        // Budget/Priority NOT included — managed by estimator only
        estimatedValue:   undefined,
        priority:         undefined,
        // Pass kept saved-attachment metadata so controller can merge
        keptAttachments:  savedAttachments,
      };
      fd.append('_json', JSON.stringify(jsonPayload));

      const headers = { 'Content-Type': 'multipart/form-data' };

      if (isEdit) {
        await API.put(`/inquiries/${id}`, fd, { headers });
        toast.success('Inquiry updated successfully');
      } else {
        const { data } = await API.post('/inquiries', fd, { headers });
        toast.success(`Inquiry #${data.data.inquiryId} created successfully`);
      }
      navigate('/inquiries');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save inquiry');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Page loading ───────────────────────────────────────────────────────────
  if (pageLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white placeholder-gray-400';

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="fade-in max-w-5xl mx-auto space-y-5 pb-16">

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button
            onClick={() => navigate('/inquiries')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-2 transition-colors"
          >
            <ChevronLeft size={16} /> Back to Inquiries
          </button>
          <h2 className="text-xl font-bold text-gray-900">
            {isEdit ? 'Edit Inquiry' : 'New Electrical Panel Inquiry'}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {isEdit ? 'Update the inquiry details below' : 'Complete all sections. Fields marked * are required.'}
          </p>
        </div>
        <div className="flex-1 flex justify-end">
          <StepProgressBar steps={SECTIONS} currentStep={activeSection} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>

        {/* ══════════════════════════════════════════════════════════════════════
            SECTION 1 — CLIENT INFORMATION
        ══════════════════════════════════════════════════════════════════════ */}
        <div ref={el => sectionRefs.current[0] = el}>
          <SectionCard number="1" title="Client Information" subtitle="Company, site address, and contact persons" icon={Building2} color="blue">

            {/* Row 1: Date + RFQ + Company */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField label="Inquiry Date" required>
                <Input type="date" value={form.inquiryDate} onChange={set('inquiryDate')} />
              </FormField>
              <FormField label="RFQ Number">
                <Input value={form.rfqNumber} onChange={set('rfqNumber')} placeholder="RFQ-2025-0001" />
              </FormField>
              <FormField label="Company Name" error={errors.companyName} required>
                <AutocompleteInput
                  value={form.companyName}
                  onChange={set('companyName')}
                  suggestions={companySuggestions}
                  placeholder="Start typing company name…"
                  error={errors.companyName}
                />
              </FormField>
            </div>

            {/* Row 2: City + Site Address */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mt-4">
              <FormField label="City">
                <AutocompleteInput
                  value={form.city}
                  onChange={set('city')}
                  suggestions={citySuggestions}
                  placeholder="e.g. Ahmedabad"
                />
              </FormField>
              <FormField label="Location / Site Address" className="sm:col-span-2">
                <Textarea
                  value={form.siteAddress}
                  onChange={set('siteAddress')}
                  placeholder="Full site address where panel will be installed…"
                  rows={2}
                />
              </FormField>
            </div>

            <FormDivider label="Contact Persons" />

            {/* Multiple Contact Persons */}
            <div className="space-y-3">
              {form.contacts.map((contact, idx) => {
                const isPrimary = idx === 0;
                const phoneErr  = errors[isPrimary ? 'contact_primary_phone' : `contact_${idx}_phone`];
                const emailErr  = errors[isPrimary ? 'contact_primary_email' : `contact_${idx}_email`];
                const nameErr   = isPrimary ? errors.contact_primary_name : null;

                return (
                  <div
                    key={contact.id}
                    className={`rounded-xl border p-4 space-y-3 ${isPrimary ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200 bg-gray-50/50'}`}
                  >
                    {/* Contact header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isPrimary ? 'bg-blue-600 text-white' : 'bg-gray-400 text-white'}`}>
                          {idx + 1}
                        </div>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          {isPrimary ? 'Primary Contact' : `Contact ${idx + 1}`}
                        </span>
                        {isPrimary && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Required</span>
                        )}
                      </div>
                      {!isPrimary && (
                        <button
                          type="button"
                          onClick={() => removeContact(contact.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove contact"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {/* Contact fields: name + designation + phone + email */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <FormField label="Name" required={isPrimary} error={nameErr}>
                        <AutocompleteInput
                          value={contact.name}
                          onChange={v => updateContact(contact.id, 'name', v)}
                          suggestions={contactNameSuggestions}
                          placeholder="e.g. Mr. Manoj Rupala"
                          error={nameErr}
                        />
                      </FormField>
                      <FormField label="Designation">
                        <AutocompleteInput
                          value={contact.designation}
                          onChange={v => updateContact(contact.id, 'designation', v)}
                          suggestions={DESIGNATION_OPTIONS}
                          placeholder="e.g. Director"
                        />
                      </FormField>
                      <FormField label="Phone" error={phoneErr}>
                        <input
                          type="tel"
                          value={contact.phone}
                          onChange={e => updateContact(contact.id, 'phone', e.target.value)}
                          placeholder="9712134007"
                          maxLength={10}
                          className={`${inputCls} ${phoneErr ? 'border-red-400' : ''}`}
                        />
                        {phoneErr && <p className="text-xs text-red-500 mt-0.5 flex items-center gap-1"><AlertCircle size={11} />{phoneErr}</p>}
                      </FormField>
                      <FormField label="Email" error={emailErr}>
                        <input
                          type="email"
                          value={contact.email}
                          onChange={e => updateContact(contact.id, 'email', e.target.value)}
                          placeholder="contact@company.com"
                          className={`${inputCls} ${emailErr ? 'border-red-400' : ''}`}
                        />
                        {emailErr && <p className="text-xs text-red-500 mt-0.5 flex items-center gap-1"><AlertCircle size={11} />{emailErr}</p>}
                      </FormField>
                    </div>
                  </div>
                );
              })}

              {/* Add contact button */}
              <button
                type="button"
                onClick={addContact}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-4 py-2 rounded-lg border border-dashed border-blue-300 hover:border-blue-500 transition-colors w-full justify-center"
              >
                <Plus size={14} />
                Add Another Contact Person
              </button>
            </div>
          </SectionCard>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            SECTION 2 — PROJECT DETAILS
            Budget + Priority removed — managed by estimation team only
        ══════════════════════════════════════════════════════════════════════ */}
        <div ref={el => sectionRefs.current[1] = el}>
          <SectionCard number="2" title="Project Details" subtitle="Project name, industry type, and offer type" icon={FolderOpen} color="orange">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Project Name / Reference" error={errors.projectName} required>
                <Input
                  value={form.projectName}
                  onChange={set('projectName')}
                  placeholder="e.g. Annealing Machine Panel"
                  error={errors.projectName}
                />
              </FormField>
              <FormField label="Industry Type" error={errors.industryType} required>
                <SearchableSelect
                  value={form.industryType}
                  onChange={(val) => {
                    setForm(prev => ({
                      ...prev,
                      industryType:       val,
                      // Clear custom value whenever a different option is chosen
                      customIndustryType: val === 'Other' ? prev.customIndustryType : '',
                    }));
                    setErrors(prev => ({ ...prev, industryType: undefined, customIndustryType: undefined }));
                  }}
                  options={INDUSTRY_TYPES}
                  placeholder="Select industry…"
                  error={errors.industryType}
                />
              </FormField>
            </div>

            {/* Dynamic "Other" industry type input */}
            {form.industryType === 'Other' && (
              <div className="mt-3">
                <FormField
                  label="Custom Industry Type"
                  error={errors.customIndustryType}
                  required
                  hint="Describe the industry not listed above"
                >
                  <Input
                    value={form.customIndustryType}
                    onChange={set('customIndustryType')}
                    placeholder="e.g. Defence, Aerospace, Marine…"
                    error={errors.customIndustryType}
                  />
                </FormField>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4">
              <FormField label="Offer Type">
                <SearchableSelect
                  value={form.offerType}
                  onChange={set('offerType')}
                  options={OFFER_TYPES}
                  placeholder="Select offer type…"
                />
              </FormField>
              {/* Budget and Priority removed from salesperson form — managed by estimator */}
            </div>

            {/* Repeat Order — previous inquiry selector */}
            {form.offerType === 'repeat' && (
              <div className="mt-4 p-4 rounded-xl border border-amber-200 bg-amber-50/50">
                <FormField
                  label="Previous Order / Inquiry Reference"
                  hint="Select the original inquiry this repeat order is based on"
                >
                  <SearchableSelect
                    value={form.previousOrderRef}
                    onChange={set('previousOrderRef')}
                    options={pastInquiries.map(inq => ({
                      value: String(inq.inquiryId),
                      label: `#${inq.inquiryId} — ${inq.companyName || ''} — ${inq.projectName || ''}`,
                    }))}
                    placeholder="Search past orders…"
                  />
                  {pastInquiries.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">Loading past orders…</p>
                  )}
                </FormField>
              </div>
            )}
          </SectionCard>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            SECTION 3 — PANEL TYPE & APPLICATION
        ══════════════════════════════════════════════════════════════════════ */}
        <div ref={el => sectionRefs.current[2] = el}>
          <SectionCard number="3" title="Panel Type & Application" subtitle="Select one or more panel types required for this project" icon={Zap} color="amber">
            <FormField label="Required Panel Type(s)" error={errors.panelTypes} required hint="You can select multiple panel types">
              <MultiCheckSelect
                value={form.panelTypes}
                onChange={set('panelTypes')}
                options={PANEL_TYPES}
                placeholder="Select panel type(s)…"
                error={errors.panelTypes}
              />
            </FormField>

            {/* Dynamic "Other / Custom" panel type field */}
            {form.panelTypes.includes('OTHER') && (
              <div className="mt-3">
                <FormField
                  label="Custom / Other Panel Type"
                  error={errors.customPanelType}
                  required
                  hint="Describe the panel type not listed above"
                >
                  <Input
                    value={form.customPanelType}
                    onChange={set('customPanelType')}
                    placeholder="e.g. Synchronisation Panel, Capacitor Panel, Changeover Panel…"
                    error={errors.customPanelType}
                  />
                </FormField>
              </div>
            )}

            <div className="mt-4">
              <FormField label="Application / Process Description">
                <Textarea
                  value={form.applicationDescription}
                  onChange={set('applicationDescription')}
                  placeholder="Describe the process or application. e.g. Steel wire annealing machine with servo-controlled tension…"
                  rows={3}
                />
              </FormField>
            </div>
          </SectionCard>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            SECTION 4 — TECHNICAL SPECIFICATIONS
        ══════════════════════════════════════════════════════════════════════ */}
        <div ref={el => sectionRefs.current[3] = el}>
          <SectionCard number="4" title="Technical Specifications" subtitle="Electrical parameters, protection class, and environment" icon={Settings} color="cyan">

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField label="Incoming Supply Voltage" error={errors.supplyVoltage} required>
                <SearchableSelect
                  value={form.supplyVoltage}
                  onChange={set('supplyVoltage')}
                  options={VOLTAGE_OPTIONS}
                  placeholder="Select voltage…"
                  error={errors.supplyVoltage}
                />
              </FormField>
              <FormField label="Frequency">
                <SearchableSelect
                  value={form.frequency}
                  onChange={set('frequency')}
                  options={FREQUENCY_OPTIONS}
                  placeholder="Select frequency…"
                />
              </FormField>
              <FormField label="Protection Class (IP Rating)">
                <SearchableSelect
                  value={form.ipRating}
                  onChange={set('ipRating')}
                  options={IP_RATINGS}
                  placeholder="Select IP rating…"
                />
              </FormField>
            </div>

            {/* Dynamic "Custom" voltage field */}
            {form.supplyVoltage === 'Custom' && (
              <div className="mt-3">
                <FormField
                  label="Custom Supply Voltage"
                  error={errors.customVoltage}
                  required
                  hint="e.g. 440V AC, 11kV, 690V 3Ph"
                >
                  <Input
                    value={form.customVoltage}
                    onChange={set('customVoltage')}
                    placeholder="Enter exact voltage specification…"
                    error={errors.customVoltage}
                  />
                </FormField>
              </div>
            )}

            {/* Conditional custom IP input */}
            {form.ipRating === 'OTHER' && (
              <div className="mt-3">
                <FormField label="Custom IP Rating" required hint="e.g. IP69K, NEMA 4X">
                  <Input
                    value={form.ipRatingCustom}
                    onChange={set('ipRatingCustom')}
                    placeholder="Enter custom IP / protection class…"
                  />
                </FormField>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mt-4">
              <FormField label="Installation Type">
                <SearchableSelect
                  value={form.installationType}
                  onChange={set('installationType')}
                  options={INSTALLATION_TYPES}
                  placeholder="Select installation…"
                />
              </FormField>
              <FormField label="Short Circuit Capacity">
                <SearchableSelect
                  value={form.shortCircuitCapacity}
                  onChange={set('shortCircuitCapacity')}
                  options={SHORT_CIRCUIT_OPTIONS}
                  placeholder="Select kA…"
                />
              </FormField>
              <FormField label="Panel Area Classification">
                <AutocompleteInput
                  value={form.panelAreaClass}
                  onChange={set('panelAreaClass')}
                  suggestions={['Non-Hazardous', 'Hazardous Zone 1', 'Hazardous Zone 2', 'Safe Area', 'Dusty Environment']}
                  placeholder="e.g. Non-Hazardous"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4">
              <FormField label="Busbar Material">
                <SearchableSelect
                  value={form.busbarMaterial}
                  onChange={set('busbarMaterial')}
                  options={BUSBAR_MATERIALS}
                  placeholder="Select busbar material…"
                />
              </FormField>
              <FormField label="Enclosure Standard">
                <SearchableSelect
                  value={form.enclosureStandard}
                  onChange={set('enclosureStandard')}
                  options={ENCLOSURE_STANDARDS}
                  placeholder="Select standard…"
                />
              </FormField>
            </div>
          </SectionCard>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            SECTION 5 — LOAD DETAILS
        ══════════════════════════════════════════════════════════════════════ */}
        <div ref={el => sectionRefs.current[4] = el}>
          <SectionCard number="5" title="Load Details" subtitle="List all loads — editing kW, HP, or Ampere auto-fills the other two" icon={FileText} color="green">
            <DynamicLoadTable
              rows={form.loadDetails}
              onChange={set('loadDetails')}
            />
            <p className="mt-2 text-xs text-gray-400 flex items-center gap-1">
              <Info size={12} /> Add all motors, drives, starters, and other loads. Include partial loads too.
            </p>
          </SectionCard>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            SECTION 6 — CONTROL & MONITORING
        ══════════════════════════════════════════════════════════════════════ */}
        <div ref={el => sectionRefs.current[5] = el}>
          <SectionCard number="6" title="Control & Monitoring Requirements" subtitle="Check all required components and specify preferred brands" icon={Cpu} color="purple">
            <div className="mb-4 flex items-center gap-4">
              <FormField label="Control Type">
                <SearchableSelect
                  value={form.controlType}
                  onChange={set('controlType')}
                  options={CONTROL_TYPE_OPTIONS}
                  placeholder="Select…"
                  className="w-48"
                />
              </FormField>
            </div>
            <ControlMatrixTable
              components={CONTROL_COMPONENTS}
              value={form.controlMatrix}
              onChange={set('controlMatrix')}
            />
          </SectionCard>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            SECTION 7 — STANDARDS & COMPLIANCE
        ══════════════════════════════════════════════════════════════════════ */}
        <div ref={el => sectionRefs.current[6] = el}>
          <SectionCard number="7" title="Standards, Compliance & Delivery" subtitle="Mounting type, certifications, delivery terms, and timeline" icon={Shield} color="rose">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField label="Panel Mounting Type">
                <SearchableSelect
                  value={form.panelMounting}
                  onChange={set('panelMounting')}
                  options={PANEL_MOUNTING_TYPES}
                  placeholder="Select mounting…"
                />
              </FormField>
              <FormField label="Certification Required">
                <div className="flex items-center gap-3 pt-1">
                  <InlineToggle value={form.certificationRequired} onChange={set('certificationRequired')} />
                </div>
              </FormField>
              <FormField label="Drawings / SLD Attached">
                <div className="flex items-center gap-3 pt-1">
                  <InlineToggle value={form.drawingsAttached} onChange={set('drawingsAttached')} />
                </div>
              </FormField>
            </div>

            {form.certificationRequired && (
              <div className="mt-4">
                <FormField label="Certification Details">
                  <Input
                    value={form.certificationDetails}
                    onChange={set('certificationDetails')}
                    placeholder="e.g. CE, BIS, ATEX, UL listing required…"
                  />
                </FormField>
              </div>
            )}

            <FormDivider label="Delivery & Commercial" />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField label="Required Delivery Date">
                <Input type="date" value={form.deliveryDate} onChange={set('deliveryDate')} />
              </FormField>
              <FormField label="Delivery Terms">
                <SearchableSelect
                  value={form.deliveryTerms}
                  onChange={set('deliveryTerms')}
                  options={DELIVERY_TERMS}
                  placeholder="Select delivery terms…"
                />
              </FormField>
              <FormField label="Payment Terms">
                <SearchableSelect
                  value={form.paymentTerms}
                  onChange={set('paymentTerms')}
                  options={PAYMENT_TERMS}
                  placeholder="Select payment terms…"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4">
              <FormField label="Programming / Development Scope">
                <SearchableSelect
                  value={form.programmingScope}
                  onChange={set('programmingScope')}
                  options={['In Our Scope', 'Customer Scope', 'Third Party', 'To Be Discussed']}
                  placeholder="Select…"
                />
              </FormField>
              <FormField label="On-site Support Required">
                <div className="flex items-center gap-3 pt-1">
                  <InlineToggle
                    value={form.onsiteSupport}
                    onChange={set('onsiteSupport')}
                    yesLabel="Required"
                    noLabel="Not Required"
                  />
                </div>
              </FormField>
            </div>

            <div className="mt-4">
              <FormField label="Next Follow-up Date">
                <Input type="date" value={form.nextFollowUpDate} onChange={set('nextFollowUpDate')} className="max-w-xs" />
              </FormField>
            </div>
          </SectionCard>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            SECTION 8 — ADDITIONAL NOTES, ATTACHMENTS & INTERNAL REVIEW
        ══════════════════════════════════════════════════════════════════════ */}
        <div ref={el => sectionRefs.current[7] = el}>
          <SectionCard number="8" title="Additional Notes & Attachments" subtitle="Comments, remarks, file uploads, and internal technical review" icon={ClipboardCheck} color="slate">

            {/* ── File Attachments ────────────────────────────────────────────── */}
            <FormField
              label="Attachments"
              hint="PDF, Word, Excel, images — max 15 MB per file, up to 10 files total"
            >
              {/* Drop zone / file picker */}
              <label
                htmlFor="inquiry-file-input"
                className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-xl p-6 cursor-pointer transition-colors bg-gray-50 hover:bg-blue-50/30 group"
              >
                <input
                  ref={fileInputRef}
                  id="inquiry-file-input"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.zip"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Paperclip size={22} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                <span className="text-sm font-medium text-gray-500 group-hover:text-blue-600">
                  Click to attach files
                </span>
                <span className="text-xs text-gray-400">PDF, Word, Excel, Image, ZIP</span>
              </label>

              {/* Already-saved attachments (edit mode) */}
              {savedAttachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    Saved files
                  </p>
                  {savedAttachments.map((att, i) => (
                    <div
                      key={att.storedName || `saved-${i}`}
                      className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2.5"
                    >
                      <span className="text-lg leading-none flex-shrink-0">{fileEmoji(att.mimeType, att.originalName)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{att.originalName || att.storedName}</p>
                        {att.sizeBytes > 0 && (
                          <p className="text-xs text-gray-400">{formatBytes(att.sizeBytes)}</p>
                        )}
                      </div>
                      {att.storagePath && (
                        <a
                          href={`/uploads/${att.storagePath}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                          title="Download file"
                          onClick={e => e.stopPropagation()}
                        >
                          <Download size={14} />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => removeSavedAttachment(i)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                        title="Remove attachment"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Staged (new) files — not yet uploaded */}
              {stagedFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                    Files to upload
                  </p>
                  {stagedFiles.map((file, i) => (
                    <div
                      key={`staged-${i}-${file.name}`}
                      className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5"
                    >
                      <span className="text-lg leading-none flex-shrink-0">{fileEmoji(file.type, file.name)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                        <p className="text-xs text-gray-400">{formatBytes(file.size)}</p>
                      </div>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                        New
                      </span>
                      <button
                        type="button"
                        onClick={() => removeStagedFile(i)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                        title="Remove file"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {savedAttachments.length === 0 && stagedFiles.length === 0 && (
                <p className="text-xs text-gray-400 mt-2 text-center">No attachments added yet</p>
              )}
            </FormField>

            <FormDivider label="Notes" />

            <div className="space-y-4">
              <FormField label="Additional Notes / Customer Comments">
                <Textarea
                  value={form.additionalNotes}
                  onChange={set('additionalNotes')}
                  placeholder="Any additional specifications, special requirements, or notes from the customer…"
                  rows={3}
                />
              </FormField>
              <FormField label="Prepared By">
                <Input
                  value={form.preparedBy || user?.name || ''}
                  onChange={set('preparedBy')}
                  placeholder="Your name"
                />
              </FormField>
            </div>

            <FormDivider label="Internal Use Only" />

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle size={14} className="text-amber-600" />
                <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Internal Technical Review Section</span>
              </div>

              <FormField label="Internal Remarks / Technical Notes">
                <Textarea
                  value={form.internalRemarks}
                  onChange={set('internalRemarks')}
                  placeholder="For estimation team: notes on complexity, BOM considerations, risks, standard/non-standard requirements…"
                  rows={3}
                />
              </FormField>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Inquiry Status">
                  <SearchableSelect
                    value={form.status}
                    onChange={set('status')}
                    options={['New', 'Under Discussion', 'Quotation Submit', 'Negotiation', 'Order Recieved', 'Inquiry Hold', 'Inq. Lost']}
                    placeholder="Select status…"
                  />
                </FormField>
                <FormField label="Review Status">
                  <SearchableSelect
                    value={form.reviewStatus || ''}
                    onChange={set('reviewStatus')}
                    options={['Pending Review', 'Under Review', 'Reviewed', 'Approved', 'Rejected']}
                    placeholder="Select review status…"
                  />
                </FormField>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* ── Sticky Submit Bar ─────────────────────────────────────────────── */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 shadow-lg rounded-xl px-6 py-4 flex items-center justify-between gap-4 z-30">
          <div className="flex items-center gap-2 text-sm">
            {Object.keys(errors).length > 0 ? (
              <>
                <AlertCircle size={16} className="text-red-500" />
                <span className="text-red-600 font-medium">{Object.keys(errors).length} error(s) to fix</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} className="text-emerald-500" />
                <span className="text-gray-400">
                  {stagedFiles.length > 0
                    ? `${stagedFiles.length} file(s) ready to upload`
                    : 'All sections ready to submit'}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={() => navigate('/inquiries')}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting} className="min-w-[160px]">
              {submitting
                ? (isEdit ? 'Updating…' : 'Submitting…')
                : (isEdit ? 'Update Inquiry' : 'Submit Inquiry')}
            </Button>
          </div>
        </div>

      </form>
    </div>
  );
};

export default ElectricalPanelInquiryPage;
