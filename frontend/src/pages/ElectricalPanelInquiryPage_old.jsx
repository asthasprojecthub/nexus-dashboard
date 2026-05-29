// ─────────────────────────────────────────────────────────────────────────────
// ElectricalPanelInquiryPage.jsx
// Route: /inquiries/new  and  /inquiries/:id/edit
// Drop into: frontend/src/pages/ElectricalPanelInquiryPage.jsx
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Building2, User, Phone, Mail, MapPin, FolderOpen, Factory, Zap,
  Settings, Cpu, Shield, FileText, ChevronLeft, Save, Send, Eye,
  AlertCircle, CheckCircle2, ClipboardCheck, UploadCloud, Info,
} from 'lucide-react';

import API from '../api/axios';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/common/Spinner';

// Extended components (FormComponents.extended.jsx)
import {
  FormField, Input, Select, Textarea, Button, Card,
  SectionCard, AutocompleteInput, SearchableSelect, MultiCheckSelect,
  DynamicLoadTable, ControlMatrixTable, DocumentUploader,
  FormDivider, InlineToggle, StepProgressBar,
} from '../components/common/FormComponents.extended';

// Master data
import {
  PANEL_TYPES, INDUSTRY_TYPES, OFFER_TYPES, VOLTAGE_OPTIONS,
  FREQUENCY_OPTIONS, IP_RATINGS, INSTALLATION_TYPES,
  SHORT_CIRCUIT_OPTIONS, PANEL_MOUNTING_TYPES, ENCLOSURE_STANDARDS,
  CONTROL_COMPONENTS, PRIORITY_OPTIONS, DEFAULT_LOAD_ROW,
  RATING_UNITS, DELIVERY_TERMS, PAYMENT_TERMS, CONTROL_TYPE_OPTIONS,
} from '../data/masterData';

// ─── Default form state ───────────────────────────────────────────────────────
const defaultForm = () => ({
  // Section 1 — Client Info
  inquiryDate:    new Date().toISOString().split('T')[0],
  rfqNumber:      '',
  companyName:    '',
  contactPerson:  '',
  designation:    '',
  mobileNumber:   '',
  alternatePhone: '',
  email:          '',
  siteAddress:    '',
  city:           '',

  // Section 2 — Project Details
  projectName:    '',
  industryType:   '',
  offerType:      '',
  priority:       'Medium',
  estimatedValue: '',

  // Section 3 — Panel Type
  panelTypes:     [],           // MultiCheckSelect → string[]
  applicationDescription: '',

  // Section 4 — Technical Specs
  supplyVoltage:      '',
  frequency:          '50 Hz',
  panelAreaClass:     '',
  ipRating:           '',
  installationType:   '',
  shortCircuitCapacity: '',
  ambientTemp:        '30–45°C',
  busbarMaterial:     'Aluminium',
  enclosureStandard:  '',

  // Section 5 — Load Details
  loadDetails: [DEFAULT_LOAD_ROW()],

  // Section 6 — Control & Monitoring
  controlType:    'Automatic',
  controlMatrix:  {},           // { [componentKey]: { required, brand, model } }

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

  // Section 8 — Additional Notes / Internal Review
  additionalNotes:   '',
  internalRemarks:   '',
  preparedBy:        '',

  // Meta
  status:    'New',
  productType: '',   // legacy field — auto-derived from panelTypes[0]
  customerName: '',  // auto-derived from companyName for legacy compat
  nextFollowUpDate: '',
});

// ─── Section scroll anchors ────────────────────────────────────────────────
const SECTIONS = [
  'Client Info', 'Project', 'Panel Type', 'Tech Specs',
  'Load Details', 'Control & Monitoring', 'Standards', 'Notes & Review',
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const ElectricalPanelInquiryPage = () => {
  const navigate    = useNavigate();
  const { id }      = useParams();           // present when editing
  const location    = useLocation();
  const toast       = useToast();
  const { user }    = useAuth();

  const isEdit = Boolean(id);

  // ── State ──────────────────────────────────────────────────────────────────
  const [form, setForm]               = useState(defaultForm());
  const [errors, setErrors]           = useState({});
  const [submitting, setSubmitting]   = useState(false);
  const [pageLoading, setPageLoading] = useState(isEdit);
  const [extracting, setExtracting]   = useState(false);
  const [extractedCount, setExtractedCount] = useState(0);

  // Customer / company name suggestions from existing Customer records
  const [companySuggestions, setCompanySuggestions] = useState([]);
  const [contactSuggestions, setContactSuggestions] = useState([]);
  const [citysuggestions,    setCitySuggestions]    = useState([]);

  // Scroll position tracking for step indicator
  const [activeSection, setActiveSection] = useState(0);
  const sectionRefs = useRef([]);

  // ── Load existing inquiry (edit mode) ─────────────────────────────────────
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const { data } = await API.get(`/inquiries/${id}`);
        const d = data.data;
        setForm(prev => ({
          ...prev,
          ...d,
          inquiryDate:  d.inquiryDate    ? new Date(d.inquiryDate).toISOString().split('T')[0]    : prev.inquiryDate,
          deliveryDate: d.deliveryDate   ? new Date(d.deliveryDate).toISOString().split('T')[0]   : '',
          nextFollowUpDate: d.nextFollowUpDate ? new Date(d.nextFollowUpDate).toISOString().split('T')[0] : '',
          loadDetails:  d.loadDetails?.length ? d.loadDetails : [DEFAULT_LOAD_ROW()],
          controlMatrix: d.controlMatrix || {},
          panelTypes:   d.panelTypes || (d.productType ? [d.productType] : []),
        }));
      } catch {
        toast.error('Failed to load inquiry');
        navigate('/inquiries');
      } finally {
        setPageLoading(false);
      }
    })();
  }, [id, isEdit]);

  // ── Fetch customer suggestions ────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data } = await API.get('/customers?limit=200&select=companyName,contactPerson,city');
        const customers = data.data || [];
        setCompanySuggestions([...new Set(customers.map(c => c.companyName).filter(Boolean))]);
        setContactSuggestions([...new Set(customers.map(c => c.contactPerson).filter(Boolean))]);
        setCitySuggestions([...new Set(customers.map(c => c.city).filter(Boolean))]);
      } catch { /* non-fatal */ }
    })();
  }, []);

  // ── Scroll section tracker ────────────────────────────────────────────────
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

  // ── Field helper ──────────────────────────────────────────────────────────
  const set = useCallback((field) => (val) => {
    const value = val?.target !== undefined ? val.target.value : val;
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  }, []);

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.companyName.trim())   e.companyName   = 'Company name is required';
    if (!form.contactPerson.trim()) e.contactPerson = 'Contact person is required';
    if (!form.mobileNumber.trim())  e.mobileNumber  = 'Mobile number is required';
    if (!/^\d{10}$/.test(form.mobileNumber.replace(/\s/g,''))) e.mobileNumber = 'Enter a valid 10-digit number';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email address';
    if (!form.projectName.trim())   e.projectName   = 'Project name is required';
    if (!form.industryType)         e.industryType  = 'Industry type is required';
    if (form.panelTypes.length === 0) e.panelTypes  = 'Select at least one panel type';
    if (!form.supplyVoltage)        e.supplyVoltage = 'Supply voltage is required';
    if (form.estimatedValue && isNaN(Number(form.estimatedValue))) e.estimatedValue = 'Must be a number';
    return e;
  };

  // ── AI Document Extraction ────────────────────────────────────────────────
  const handleExtract = async (file) => {
    setExtracting(true);
    setExtractedCount(0);
    try {
      const fd = new FormData();
      fd.append('document', file);
      const { data } = await API.post('/inquiries/extract-from-document', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const extracted = data.data || {};
      let count = 0;
      setForm(prev => {
        const next = { ...prev };
        const map = {
          companyName:    extracted.companyName,
          contactPerson:  extracted.contactPerson,
          designation:    extracted.designation,
          mobileNumber:   extracted.phone || extracted.mobileNumber,
          email:          extracted.email,
          siteAddress:    extracted.siteAddress || extracted.location,
          city:           extracted.city,
          rfqNumber:      extracted.rfqNumber,
          projectName:    extracted.projectName,
          industryType:   extracted.industryType,
          supplyVoltage:  extracted.supplyVoltage || extracted.voltage,
          frequency:      extracted.frequency,
          ipRating:       extracted.ipRating,
          installationType: extracted.installationType,
          ambientTemp:    extracted.ambientTemp,
          additionalNotes: extracted.remarks || extracted.additionalNotes,
          panelTypes:     extracted.panelTypes?.length ? extracted.panelTypes : prev.panelTypes,
          applicationDescription: extracted.applicationDescription || prev.applicationDescription,
        };
        Object.entries(map).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '') {
            next[k] = Array.isArray(v) ? v : String(v);
            count++;
          }
        });
        if (extracted.loadDetails?.length) {
          next.loadDetails = extracted.loadDetails.map((l, i) => ({ ...DEFAULT_LOAD_ROW(), ...l, id: Date.now() + i }));
          count++;
        }
        return next;
      });
      setExtractedCount(count);
      toast.success(`${count} fields extracted and auto-filled`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Document extraction failed');
    } finally {
      setExtracting(false);
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      // Scroll to first error
      const firstErrEl = document.querySelector('[data-error-field]');
      firstErrEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast.error('Please fix the highlighted errors');
      return;
    }

    setSubmitting(true);
    try {
      // Build legacy-compatible payload
      const payload = {
        ...form,
        customerName: form.companyName,
        productType:  form.panelTypes[0] || 'OTHER',
        location:     form.city || form.siteAddress,
        estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : 0,
      };

      if (isEdit) {
        await API.put(`/inquiries/${id}`, payload);
        toast.success('Inquiry updated successfully');
      } else {
        const { data } = await API.post('/inquiries', payload);
        toast.success(`Inquiry #${data.data.inquiryId} created successfully`);
      }
      navigate('/inquiries');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save inquiry');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Page loading ──────────────────────────────────────────────────────────
  if (pageLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  // ─── Scroll to section helper ──────────────────────────────────────────────
  const scrollTo = (i) => {
    sectionRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="fade-in max-w-5xl mx-auto space-y-5 pb-16">

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button
            onClick={() => navigate('/inquiries')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-2 transition-colors"
          >
            <ChevronLeft size={16} /> Back to Inquiries
          </button>
          <h2 className="text-xl font-bold text-gray-900">
            {isEdit ? `Edit Inquiry` : 'New Electrical Panel Inquiry'}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {isEdit
              ? 'Update the inquiry details below'
              : 'Complete all sections. Fields marked * are required.'}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex-1 flex justify-end">
          <StepProgressBar steps={SECTIONS} currentStep={activeSection} />
        </div>
      </div>

      {/* ── Document Upload Banner (create mode only) ────────────────────── */}
      {!isEdit && (
        <SectionCard
          number="AI"
          title="Auto-Fill from Document"
          subtitle="Upload an RFQ, Word form, or Excel sheet to extract fields automatically"
          icon={UploadCloud}
          color="purple"
        >
          <DocumentUploader
            onExtract={handleExtract}
            extracting={extracting}
            extractedCount={extractedCount}
          />
        </SectionCard>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>

        {/* ════════════════════════════════════════════════════════════════════
            SECTION 1 — CLIENT INFORMATION
        ════════════════════════════════════════════════════════════════════ */}
        <div ref={el => sectionRefs.current[0] = el}>
          <SectionCard number="1" title="Client Information" subtitle="Company details, contact person, and site address" icon={Building2} color="blue">

            {/* Row 1: Date + RFQ + Company */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField label="Inquiry Date" required>
                <Input type="date" value={form.inquiryDate} onChange={set('inquiryDate')} />
              </FormField>
              <FormField label="RFQ Number">
                <Input value={form.rfqNumber} onChange={set('rfqNumber')} placeholder="RFQ-2025-0001" />
              </FormField>
              <FormField label="Company Name" error={errors.companyName} required data-error-field>
                <AutocompleteInput
                  value={form.companyName}
                  onChange={set('companyName')}
                  suggestions={companySuggestions}
                  placeholder="Start typing company name…"
                  error={errors.companyName}
                />
              </FormField>
            </div>

            <FormDivider />

            {/* Row 2: Contact + Designation + Phone */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField label="Contact Person" error={errors.contactPerson} required>
                <AutocompleteInput
                  value={form.contactPerson}
                  onChange={set('contactPerson')}
                  suggestions={contactSuggestions}
                  placeholder="e.g. Mr. Manoj Rupala"
                  error={errors.contactPerson}
                />
              </FormField>
              <FormField label="Designation">
                <AutocompleteInput
                  value={form.designation}
                  onChange={set('designation')}
                  suggestions={['Director', 'Purchase Manager', 'Project Manager', 'Electrical Engineer', 'Plant Manager', 'CEO', 'GM', 'DGM', 'AGM']}
                  placeholder="e.g. Director"
                />
              </FormField>
              <FormField label="Mobile Number" error={errors.mobileNumber} required>
                <Input
                  type="tel"
                  value={form.mobileNumber}
                  onChange={set('mobileNumber')}
                  placeholder="9712134007"
                  maxLength={10}
                  error={errors.mobileNumber}
                />
              </FormField>
            </div>

            {/* Row 3: Alternate + Email + City */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mt-4">
              <FormField label="Alternate Phone">
                <Input type="tel" value={form.alternatePhone} onChange={set('alternatePhone')} placeholder="Optional" />
              </FormField>
              <FormField label="Email Address" error={errors.email}>
                <Input type="email" value={form.email} onChange={set('email')} placeholder="contact@company.com" />
              </FormField>
              <FormField label="City">
                <AutocompleteInput
                  value={form.city}
                  onChange={set('city')}
                  suggestions={citysuggestions}
                  placeholder="e.g. Ahmedabad"
                />
              </FormField>
            </div>

            {/* Row 4: Site Address */}
            <div className="mt-4">
              <FormField label="Location / Site Address">
                <Textarea
                  value={form.siteAddress}
                  onChange={set('siteAddress')}
                  placeholder="Full site address where panel will be installed…"
                  rows={2}
                />
              </FormField>
            </div>
          </SectionCard>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            SECTION 2 — PROJECT DETAILS
        ════════════════════════════════════════════════════════════════════ */}
        <div ref={el => sectionRefs.current[1] = el}>
          <SectionCard number="2" title="Project Details" subtitle="Project name, industry, offer type, and budget" icon={FolderOpen} color="orange">
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
                  onChange={set('industryType')}
                  options={INDUSTRY_TYPES}
                  placeholder="Select industry…"
                  error={errors.industryType}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mt-4">
              <FormField label="Offer Type">
                <SearchableSelect
                  value={form.offerType}
                  onChange={set('offerType')}
                  options={OFFER_TYPES}
                  placeholder="Select offer type…"
                />
              </FormField>
              <FormField label="Priority">
                <SearchableSelect
                  value={form.priority}
                  onChange={set('priority')}
                  options={PRIORITY_OPTIONS}
                  placeholder="Select priority…"
                />
              </FormField>
              <FormField label="Budget / Estimated Value (₹)" error={errors.estimatedValue}>
                <Input
                  type="number"
                  value={form.estimatedValue}
                  onChange={set('estimatedValue')}
                  placeholder="0"
                  min="0"
                />
              </FormField>
            </div>
          </SectionCard>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            SECTION 3 — PANEL TYPE & APPLICATION
        ════════════════════════════════════════════════════════════════════ */}
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

        {/* ════════════════════════════════════════════════════════════════════
            SECTION 4 — TECHNICAL SPECIFICATIONS
        ════════════════════════════════════════════════════════════════════ */}
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mt-4">
              <FormField label="Ambient Temperature">
                <AutocompleteInput
                  value={form.ambientTemp}
                  onChange={set('ambientTemp')}
                  suggestions={['0–35°C', '30–45°C', '35–50°C', '–10 to 55°C', '–20 to 60°C']}
                  placeholder="e.g. 30–45°C"
                />
              </FormField>
              <FormField label="Busbar Material">
                <SearchableSelect
                  value={form.busbarMaterial}
                  onChange={set('busbarMaterial')}
                  options={['Aluminium', 'Copper', 'Tinned Copper', 'Silver Plated Copper']}
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

        {/* ════════════════════════════════════════════════════════════════════
            SECTION 5 — LOAD DETAILS
        ════════════════════════════════════════════════════════════════════ */}
        <div ref={el => sectionRefs.current[4] = el}>
          <SectionCard number="5" title="Load Details" subtitle="List all loads to be connected to this panel" icon={FileText} color="green">
            <DynamicLoadTable
              rows={form.loadDetails}
              onChange={set('loadDetails')}
              ratingUnits={RATING_UNITS}
            />
            <p className="mt-2 text-xs text-gray-400 flex items-center gap-1">
              <Info size={12} /> Add all motors, drives, starters, and other loads. Include partial loads too.
            </p>
          </SectionCard>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            SECTION 6 — CONTROL & MONITORING REQUIREMENTS
        ════════════════════════════════════════════════════════════════════ */}
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

        {/* ════════════════════════════════════════════════════════════════════
            SECTION 7 — STANDARDS & COMPLIANCE
        ════════════════════════════════════════════════════════════════════ */}
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

        {/* ════════════════════════════════════════════════════════════════════
            SECTION 8 — ADDITIONAL NOTES & INTERNAL REVIEW
        ════════════════════════════════════════════════════════════════════ */}
        <div ref={el => sectionRefs.current[7] = el}>
          <SectionCard number="8" title="Additional Notes & Internal Review" subtitle="Comments, remarks, and internal technical review fields" icon={ClipboardCheck} color="slate">

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

            {/* Internal review — only for manager/admin or in edit mode */}
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
                    options={[
                      'New', 'Under Discussion', 'Quotation Submit',
                      'Negotiation', 'Order Recieved', 'Inquiry Hold', 'Inq. Lost',
                    ]}
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

        {/* ── Sticky Submit Bar ──────────────────────────────────────────────── */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 shadow-lg rounded-xl px-6 py-4 flex items-center justify-between gap-4 z-30">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {Object.keys(errors).length > 0 ? (
              <>
                <AlertCircle size={16} className="text-red-500" />
                <span className="text-red-600 font-medium">{Object.keys(errors).length} error(s) to fix</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} className="text-emerald-500" />
                <span className="text-gray-400">All sections ready to submit</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/inquiries')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={submitting}
              className="min-w-[160px]"
            >
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
