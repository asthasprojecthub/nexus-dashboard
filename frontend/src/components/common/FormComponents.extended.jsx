// ─────────────────────────────────────────────────────────────────────────────
// FormComponents.extended.jsx
// Drop into: frontend/src/components/common/FormComponents.extended.jsx
//
// Adds ERP-grade input primitives on top of the existing FormComponents.jsx.
// Import these alongside the existing exports — nothing in FormComponents.jsx
// is changed or broken.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, X, Check, Search, Plus, Trash2, AlertCircle } from 'lucide-react';

// ─── Re-export base primitives so consumers need only one import ──────────────
export {
  Input, Select, Textarea, Button, Card, CardHeader, CardBody,
} from './FormComponents';

// ─────────────────────────────────────────────────────────────────────────────
// SectionCard  — coloured section header + card body used in multi-step forms
// ─────────────────────────────────────────────────────────────────────────────
export const SectionCard = ({ number, title, subtitle, icon: Icon, color = 'blue', children, className = '' }) => {
  const colors = {
    blue:   { ring: 'border-blue-200',   header: 'from-blue-50 to-indigo-50',   badge: 'bg-blue-600',    text: 'text-blue-700'   },
    orange: { ring: 'border-orange-200', header: 'from-orange-50 to-amber-50',  badge: 'bg-orange-500',  text: 'text-orange-700' },
    green:  { ring: 'border-green-200',  header: 'from-green-50 to-emerald-50', badge: 'bg-green-600',   text: 'text-green-700'  },
    purple: { ring: 'border-purple-200', header: 'from-purple-50 to-violet-50', badge: 'bg-purple-600',  text: 'text-purple-700' },
    cyan:   { ring: 'border-cyan-200',   header: 'from-cyan-50 to-sky-50',      badge: 'bg-cyan-600',    text: 'text-cyan-700'   },
    rose:   { ring: 'border-rose-200',   header: 'from-rose-50 to-pink-50',     badge: 'bg-rose-600',    text: 'text-rose-700'   },
    slate:  { ring: 'border-slate-200',  header: 'from-slate-50 to-gray-50',    badge: 'bg-slate-600',   text: 'text-slate-700'  },
    amber:  { ring: 'border-amber-200',  header: 'from-amber-50 to-yellow-50',  badge: 'bg-amber-600',   text: 'text-amber-700'  },
  };
  const c = colors[color] || colors.blue;

  return (
    <div className={`bg-white rounded-xl border ${c.ring} shadow-sm overflow-hidden ${className}`}>
      {/* Section Header */}
      <div className={`bg-gradient-to-r ${c.header} px-6 py-4 border-b ${c.ring} flex items-center gap-3`}>
        <div className={`${c.badge} text-white rounded-lg w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0`}>
          {number}
        </div>
        <div>
          <h3 className={`font-semibold ${c.text} text-sm`}>{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {Icon && <Icon size={18} className={`ml-auto ${c.text} opacity-40`} />}
      </div>
      {/* Body */}
      <div className="p-6">{children}</div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FormField  (extended — wraps label + error same as base but exported here)
// ─────────────────────────────────────────────────────────────────────────────
export const FormField = ({ label, error, required, hint, children, className = '' }) => (
  <div className={`flex flex-col gap-1 ${className}`}>
    {label && (
      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
    )}
    {children}
    {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
    {error && (
      <p className="text-xs text-red-500 flex items-center gap-1">
        <AlertCircle size={11} /> {error}
      </p>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// AutocompleteInput  — text input with dropdown suggestion list
// Props:
//   value, onChange(string), suggestions: string[], placeholder, error
// ─────────────────────────────────────────────────────────────────────────────
export const AutocompleteInput = ({
  value = '',
  onChange,
  suggestions = [],
  placeholder = '',
  error,
  className = '',
  disabled = false,
  ...rest
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const wrapRef = useRef(null);

  // Sync external value changes (e.g. auto-fill from extraction)
  useEffect(() => { setQuery(value); }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = query.length >= 1
    ? suggestions.filter(s => s.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : [];

  const handleInput = (e) => {
    setQuery(e.target.value);
    onChange(e.target.value);
    setOpen(true);
  };

  const pick = (s) => {
    setQuery(s);
    onChange(s);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={handleInput}
        onFocus={() => filtered.length > 0 && setOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white placeholder-gray-400 disabled:bg-gray-50 disabled:text-gray-500
          ${error ? 'border-red-400 focus:ring-red-400' : 'border-gray-300'}
          ${className}`}
        {...rest}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-52 overflow-y-auto text-sm">
          {filtered.map((s, i) => (
            <li
              key={i}
              onMouseDown={() => pick(s)}
              className="px-3 py-2 cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-2"
            >
              <Search size={12} className="text-gray-300 flex-shrink-0" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SearchableSelect  — filterable dropdown replacing native <select>
// Props:
//   value, onChange(value), options: [{value, label}] | string[], placeholder
// ─────────────────────────────────────────────────────────────────────────────
export const SearchableSelect = ({
  value = '',
  onChange,
  options = [],
  placeholder = 'Select…',
  error,
  className = '',
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapRef = useRef(null);
  const searchRef = useRef(null);

  const normalised = options.map(o =>
    typeof o === 'string' ? { value: o, label: o } : o
  );

  const selectedLabel = normalised.find(o => o.value === value)?.label || '';

  const filtered = normalised.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus();
  }, [open]);

  const pick = (v) => { onChange(v); setSearch(''); setOpen(false); };

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400 text-left
          ${error ? 'border-red-400' : 'border-gray-300'}
          ${!selectedLabel ? 'text-gray-400' : 'text-gray-800'}`}
      >
        <span className="truncate">{selectedLabel || placeholder}</span>
        <ChevronDown size={15} className={`text-gray-400 flex-shrink-0 ml-2 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
          {/* Search inside dropdown */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          <ul className="max-h-52 overflow-y-auto text-sm">
            <li onMouseDown={() => pick('')} className="px-3 py-2 cursor-pointer text-gray-400 hover:bg-gray-50 italic text-xs">
              {placeholder}
            </li>
            {filtered.map(o => (
              <li
                key={o.value}
                onMouseDown={() => pick(o.value)}
                className={`px-3 py-2 cursor-pointer hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2
                  ${value === o.value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
              >
                {value === o.value && <Check size={13} className="flex-shrink-0" />}
                <span>{o.label}</span>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-3 text-center text-xs text-gray-400">No results</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MultiCheckSelect  — select multiple options as pill tags (panel types, etc.)
// Props:
//   value: string[], onChange(string[]), options: [{value, label}] | string[]
// ─────────────────────────────────────────────────────────────────────────────
export const MultiCheckSelect = ({
  value = [],
  onChange,
  options = [],
  placeholder = 'Select options…',
  error,
  maxSelect,
}) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const normalised = options.map(o =>
    typeof o === 'string' ? { value: o, label: o } : o
  );

  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (v) => {
    if (value.includes(v)) {
      onChange(value.filter(x => x !== v));
    } else {
      if (maxSelect && value.length >= maxSelect) return;
      onChange([...value, v]);
    }
  };

  const remove = (v, e) => { e.stopPropagation(); onChange(value.filter(x => x !== v)); };

  return (
    <div ref={wrapRef} className="relative">
      <div
        onClick={() => setOpen(!open)}
        className={`min-h-[38px] w-full px-3 py-1.5 text-sm border rounded-lg bg-white cursor-pointer focus-within:ring-2 focus-within:ring-blue-500 flex flex-wrap gap-1 items-center
          ${error ? 'border-red-400' : 'border-gray-300'}`}
      >
        {value.length === 0 && (
          <span className="text-gray-400 text-sm py-0.5">{placeholder}</span>
        )}
        {value.map(v => {
          const label = normalised.find(o => o.value === v)?.label || v;
          return (
            <span key={v} className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
              {label}
              <button type="button" onMouseDown={(e) => remove(v, e)} className="hover:text-blue-600">
                <X size={11} />
              </button>
            </span>
          );
        })}
        <ChevronDown size={14} className={`ml-auto text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-64 overflow-y-auto text-sm">
          {normalised.map(o => {
            const selected = value.includes(o.value);
            return (
              <div
                key={o.value}
                onMouseDown={() => toggle(o.value)}
                className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-blue-50 transition-colors
                  ${selected ? 'bg-blue-50' : ''}`}
              >
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors
                  ${selected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                  {selected && <Check size={11} className="text-white" strokeWidth={3} />}
                </div>
                <span className={selected ? 'text-blue-700 font-medium' : 'text-gray-700'}>{o.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DynamicLoadTable  — add/remove rows for Load Details section
// Props:
//   rows: LoadRow[], onChange(rows), ratingUnits: string[]
// ─────────────────────────────────────────────────────────────────────────────
export const DynamicLoadTable = ({ rows = [], onChange, ratingUnits = ['kW', 'HP', 'kVA', 'A'] }) => {
  const addRow = () => {
    onChange([...rows, {
      id: Date.now() + Math.random(),
      srNo: rows.length + 1,
      loadDescription: '',
      qty: '',
      rating: '',
      unit: 'kW',
      remarks: '',
    }]);
  };

  const updateRow = (id, field, val) => {
    onChange(rows.map(r => r.id === id ? { ...r, [field]: val } : r));
  };

  const removeRow = (id) => {
    const updated = rows.filter(r => r.id !== id).map((r, i) => ({ ...r, srNo: i + 1 }));
    onChange(updated);
  };

  const tdClass = 'px-2 py-1';
  const inputClass = 'w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white';

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="px-3 py-2.5 text-left font-semibold w-12">Sr.</th>
              <th className="px-3 py-2.5 text-left font-semibold">Load Description</th>
              <th className="px-3 py-2.5 text-left font-semibold w-20">Qty</th>
              <th className="px-3 py-2.5 text-left font-semibold w-24">Rating</th>
              <th className="px-3 py-2.5 text-left font-semibold w-24">Unit</th>
              <th className="px-3 py-2.5 text-left font-semibold">Remarks</th>
              <th className="px-3 py-2.5 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-400 italic text-xs">
                  No loads added. Click "Add Load" below.
                </td>
              </tr>
            )}
            {rows.map((row, idx) => (
              <tr key={row.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className={tdClass}>
                  <span className="font-mono text-gray-400 text-xs">{String(idx + 1).padStart(2, '0')}</span>
                </td>
                <td className={tdClass}>
                  <input
                    type="text"
                    value={row.loadDescription}
                    onChange={e => updateRow(row.id, 'loadDescription', e.target.value)}
                    placeholder="e.g. Main Motor, Pump, Conveyor…"
                    className={inputClass}
                  />
                </td>
                <td className={tdClass}>
                  <input
                    type="number"
                    value={row.qty}
                    onChange={e => updateRow(row.id, 'qty', e.target.value)}
                    placeholder="0"
                    min="0"
                    className={inputClass}
                  />
                </td>
                <td className={tdClass}>
                  <input
                    type="text"
                    value={row.rating}
                    onChange={e => updateRow(row.id, 'rating', e.target.value)}
                    placeholder="0"
                    className={inputClass}
                  />
                </td>
                <td className={tdClass}>
                  <select
                    value={row.unit}
                    onChange={e => updateRow(row.id, 'unit', e.target.value)}
                    className={inputClass}
                  >
                    {ratingUnits.map(u => <option key={u}>{u}</option>)}
                  </select>
                </td>
                <td className={tdClass}>
                  <input
                    type="text"
                    value={row.remarks}
                    onChange={e => updateRow(row.id, 'remarks', e.target.value)}
                    placeholder="Notes…"
                    className={inputClass}
                  />
                </td>
                <td className={tdClass}>
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Remove row"
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={addRow}
        className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors border border-dashed border-blue-300 hover:border-blue-500"
      >
        <Plus size={13} /> Add Load Row
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ControlMatrixTable  — checkbox + brand + model per component
// ─────────────────────────────────────────────────────────────────────────────
export const ControlMatrixTable = ({ components, value = {}, onChange }) => {
  const update = (key, field, val) => {
    onChange({
      ...value,
      [key]: { ...(value[key] || { required: false, brand: '', model: '' }), [field]: val },
    });
  };

  const thClass = 'px-3 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-wide';
  const tdClass = 'px-3 py-2 align-middle';
  const inputClass = 'w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white';

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-800">
            <th className={thClass} style={{ width: '220px' }}>Component</th>
            <th className={thClass} style={{ width: '90px' }}>Required</th>
            <th className={thClass}>Preferred Brand</th>
            <th className={thClass}>Suggested Model</th>
          </tr>
        </thead>
        <tbody>
          {components.map((comp, idx) => {
            const row = value[comp.key] || { required: false, brand: '', model: '' };
            return (
              <tr key={comp.key} className={`border-t border-gray-100 transition-colors ${row.required ? 'bg-blue-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                <td className={tdClass}>
                  <span className={`font-medium ${row.required ? 'text-blue-800' : 'text-gray-700'}`}>
                    {comp.label}
                  </span>
                </td>
                <td className={tdClass}>
                  <label className="flex items-center justify-center cursor-pointer">
                    <div
                      onClick={() => update(comp.key, 'required', !row.required)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                        ${row.required ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'}`}
                    >
                      {row.required && <Check size={12} className="text-white" strokeWidth={3} />}
                    </div>
                  </label>
                </td>
                <td className={tdClass}>
                  {row.required ? (
                    <AutocompleteInput
                      value={row.brand}
                      onChange={v => update(comp.key, 'brand', v)}
                      suggestions={comp.brands}
                      placeholder="Select or type brand…"
                    />
                  ) : (
                    <span className="text-gray-300 italic text-xs px-2">—</span>
                  )}
                </td>
                <td className={tdClass}>
                  {row.required ? (
                    <input
                      type="text"
                      value={row.model}
                      onChange={e => update(comp.key, 'model', e.target.value)}
                      placeholder="Model / part number…"
                      className={inputClass}
                    />
                  ) : (
                    <span className="text-gray-300 italic text-xs px-2">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DocumentUploader  — drag-and-drop + file button + extraction status
// Props:
//   onExtract(file): called when user triggers extraction
//   extracting: bool, extractedFields: {fieldName: value}
// ─────────────────────────────────────────────────────────────────────────────
export const DocumentUploader = ({ onExtract, extracting = false, extractedCount = 0 }) => {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const ACCEPT = '.pdf,.docx,.xlsx,.xls,.doc';
  const MAX_MB = 10;

  const handleFile = (f) => {
    if (!f) return;
    if (f.size > MAX_MB * 1024 * 1024) {
      alert(`File too large. Max ${MAX_MB} MB.`);
      return;
    }
    setFile(f);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const ext = file?.name.split('.').pop()?.toLowerCase();
  const extColor = { pdf: 'bg-red-100 text-red-700', docx: 'bg-blue-100 text-blue-700', doc: 'bg-blue-100 text-blue-700', xlsx: 'bg-green-100 text-green-700', xls: 'bg-green-100 text-green-700' }[ext] || 'bg-gray-100 text-gray-700';

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
          ${dragging ? 'border-blue-500 bg-blue-50 scale-[1.01]' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/40'}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={e => handleFile(e.target.files[0])}
        />

        {/* Icon */}
        <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
          <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>

        {file ? (
          <div className="space-y-1">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase ${extColor}`}>
              .{ext}
            </span>
            <p className="text-sm font-medium text-gray-800 mt-2 truncate max-w-xs mx-auto">{file.name}</p>
            <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} KB · Click to replace</p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-gray-600">Drop your RFQ / inquiry document here</p>
            <p className="text-xs text-gray-400 mt-1">PDF, Word (.docx), Excel (.xlsx) · Max {MAX_MB} MB</p>
          </div>
        )}
      </div>

      {/* Actions */}
      {file && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onExtract(file)}
            disabled={extracting}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {extracting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Extracting…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Auto-Extract Fields
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => { setFile(null); }}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Clear
          </button>

          {extractedCount > 0 && !extracting && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
              <Check size={13} />
              {extractedCount} fields auto-filled
            </span>
          )}
        </div>
      )}

      {/* Helper */}
      <p className="text-xs text-gray-400 leading-relaxed">
        AI extraction reads your document and pre-fills the form. Review all fields before submitting — always verify extracted data.
      </p>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FormDivider  — visual horizontal section separator
// ─────────────────────────────────────────────────────────────────────────────
export const FormDivider = ({ label }) => (
  <div className="flex items-center gap-3 my-2">
    <div className="flex-1 h-px bg-gray-100" />
    {label && <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{label}</span>}
    <div className="flex-1 h-px bg-gray-100" />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// InlineToggle  — Yes / No toggle chip pair
// ─────────────────────────────────────────────────────────────────────────────
export const InlineToggle = ({ value, onChange, yesLabel = 'Yes', noLabel = 'No' }) => (
  <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
    <button
      type="button"
      onClick={() => onChange(true)}
      className={`px-3 py-1.5 transition-colors ${value === true ? 'bg-green-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
    >
      {yesLabel}
    </button>
    <button
      type="button"
      onClick={() => onChange(false)}
      className={`px-3 py-1.5 border-l border-gray-200 transition-colors ${value === false ? 'bg-red-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
    >
      {noLabel}
    </button>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// StepProgressBar  — shows which section the user is on
// ─────────────────────────────────────────────────────────────────────────────
export const StepProgressBar = ({ steps, currentStep }) => (
  <div className="flex items-center gap-1 flex-wrap">
    {steps.map((step, i) => {
      const done = i < currentStep;
      const active = i === currentStep;
      return (
        <React.Fragment key={i}>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all
            ${done ? 'bg-emerald-100 text-emerald-700' : active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs
              ${done ? 'bg-emerald-500 text-white' : active ? 'bg-white text-blue-600' : 'bg-gray-300 text-white'}`}>
              {done ? <Check size={10} strokeWidth={3} /> : i + 1}
            </span>
            <span className="hidden sm:inline">{step}</span>
          </div>
          {i < steps.length - 1 && <div className={`h-px w-4 flex-shrink-0 ${done ? 'bg-emerald-300' : 'bg-gray-200'}`} />}
        </React.Fragment>
      );
    })}
  </div>
);
