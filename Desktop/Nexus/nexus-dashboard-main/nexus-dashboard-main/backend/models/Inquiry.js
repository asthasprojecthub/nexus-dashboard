// ─────────────────────────────────────────────────────────────────────────────
// backend/models/Inquiry.js  — FIXED (full replacement)
//
// Bug fixes applied:
//   [C2/H1] Added attachmentSchema sub-document (was completely missing).
//           Mongoose strict mode was silently discarding every uploaded file.
//   [H1]    Added all 25+ extended form fields that the new inquiry form sends:
//           rfqNumber, siteAddress, industryType, offerType, previousOrderRef,
//           panelTypes, customPanelType, applicationDescription,
//           supplyVoltage, frequency, panelAreaClass, ipRating,
//           installationType, shortCircuitCapacity, busbarMaterial,
//           enclosureStandard, loadDetails, controlType, controlMatrix,
//           panelMounting, certificationRequired, certificationDetails,
//           drawingsAttached, deliveryDate, deliveryTerms, programmingScope,
//           onsiteSupport, paymentTerms, additionalNotes, internalRemarks,
//           preparedBy, reviewStatus.
//           Without these the schema drops them all (strict mode default).
//
// Preserved unchanged:
//   contactSchema, contacts[], legacy flat contact fields, inquiryId counter,
//   productType, status, priority, estimatedValue, nextFollowUpDate, remarks,
//   createdBy, convertedToProject, projectReference, text indexes, pre-save hook.
// ─────────────────────────────────────────────────────────────────────────────

const mongoose = require('mongoose');
const Counter  = require('./Counter');

// ─── Contact sub-schema ───────────────────────────────────────────────────────
const contactSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    phone:       { type: String, trim: true, default: '' },
    email:       { type: String, trim: true, lowercase: true, default: '' },
    designation: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

// ─── Attachment sub-schema  [FIX C2] ─────────────────────────────────────────
// Previously missing entirely — caused every uploaded file to be silently dropped.
const attachmentSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true, trim: true },
    storedName:   { type: String, required: true, trim: true },
    storagePath:  { type: String, required: true, trim: true },  // relative: 'inquiry/<filename>'
    mimeType:     { type: String, trim: true, default: '' },
    sizeBytes:    { type: Number, default: 0 },
    uploadedAt:   { type: Date,   default: Date.now },
  },
  { _id: false }
);

// ─── Load-row sub-schema (for loadDetails table)  [FIX H1] ───────────────────
const loadRowSchema = new mongoose.Schema(
  {
    description:    { type: String, trim: true, default: '' },
    qty:            { type: Number, default: 0 },
    kw:             { type: Number, default: 0 },
    ampere:         { type: Number, default: 0 },
    startingMethod: { type: String, trim: true, default: '' },
    remarks:        { type: String, trim: true, default: '' },
  },
  { _id: false }
);

// ─── Main schema ──────────────────────────────────────────────────────────────
const inquirySchema = new mongoose.Schema(
  {
    // ── Auto-increment ID ─────────────────────────────────────────────────────
    inquiryId: {
      type:   Number,
      unique: true,
    },

    // ── Section 1 — Client Info ───────────────────────────────────────────────
    inquiryDate: {
      type:    Date,
      default: Date.now,
    },

    rfqNumber: {                          // [FIX H1] was missing
      type: String,
      trim: true,
    },

    customerName: {
      type:     String,
      required: [true, 'Customer name is required'],
      trim:     true,
    },

    companyName: {
      type: String,
      trim: true,
    },

    // Structured contacts array — contacts[0] is primary contact
    contacts: {
      type:    [contactSchema],
      default: [],
    },

    // Legacy flat contact fields — kept for backward compatibility.
    // Auto-populated from contacts[0] in pre-save hook.
    contactPerson: { type: String, trim: true },
    mobileNumber:  { type: String, trim: true },
    email:         { type: String, lowercase: true, trim: true },
    designation:   { type: String, trim: true },

    siteAddress: {                        // [FIX H1] was missing
      type: String,
      trim: true,
    },

    location: {                           // derived from city / siteAddress
      type: String,
      trim: true,
    },

    // ── Section 2 — Project Details ───────────────────────────────────────────
    projectName: {
      type: String,
      trim: true,
    },

    industryType: {                       // [FIX H1] was missing
      type: String,
      trim: true,
    },

    offerType: {                          // [FIX H1] was missing
      type: String,
      trim: true,
    },

    previousOrderRef: {                   // [FIX H1] was missing
      type: String,
      trim: true,
    },

    // ── Section 3 — Panel Type ────────────────────────────────────────────────
    panelTypes: {                         // [FIX H1] was missing — core field
      type:    [String],
      default: [],
    },

    customPanelType: {                    // [FIX H1] was missing
      type: String,
      trim: true,
    },

    applicationDescription: {            // [FIX H1] was missing
      type: String,
      trim: true,
    },

    // productType kept for backward compat / dashboard aggregations
    productType: {
      type: String,
      enum: ['MCC', 'PCC', 'APFC', 'VFD', 'PLC', 'OTHER',
             'AMF', 'VFD_PANEL', 'PLC_PANEL', 'PLC_MCC', 'BUSDUCT', 'SMDB', 'MLDB'],
      required: [true, 'Product type is required'],
    },

    // ── Section 4 — Technical Specs ───────────────────────────────────────────
    supplyVoltage: {                      // [FIX H1] was missing
      type: String,
      trim: true,
    },

    frequency: {                          // [FIX H1] was missing
      type:    String,
      trim:    true,
      default: '50 Hz',
    },

    panelAreaClass: {                     // [FIX H1] was missing
      type: String,
      trim: true,
    },

    ipRating: {                           // [FIX H1] was missing
      type: String,
      trim: true,
    },

    installationType: {                   // [FIX H1] was missing
      type: String,
      trim: true,
    },

    shortCircuitCapacity: {               // [FIX H1] was missing
      type: String,
      trim: true,
    },

    busbarMaterial: {                     // [FIX H1] was missing
      type:    String,
      trim:    true,
      default: 'Aluminium',
    },

    enclosureStandard: {                  // [FIX H1] was missing
      type: String,
      trim: true,
    },

    // ── Section 5 — Load Details ──────────────────────────────────────────────
    loadDetails: {                        // [FIX H1] was missing
      type:    [loadRowSchema],
      default: [],
    },

    // ── Section 6 — Control & Monitoring ─────────────────────────────────────
    controlType: {                        // [FIX H1] was missing
      type:    String,
      trim:    true,
      default: 'Automatic',
    },

    controlMatrix: {                      // [FIX H1] was missing — free-form object
      type:    mongoose.Schema.Types.Mixed,
      default: {},
    },

    // ── Section 7 — Standards & Compliance ───────────────────────────────────
    panelMounting: {                      // [FIX H1] was missing
      type: String,
      trim: true,
    },

    certificationRequired: {             // [FIX H1] was missing
      type:    Boolean,
      default: false,
    },

    certificationDetails: {              // [FIX H1] was missing
      type: String,
      trim: true,
    },

    drawingsAttached: {                   // [FIX H1] was missing
      type:    Boolean,
      default: false,
    },

    deliveryDate: {                       // [FIX H1] was missing
      type: Date,
    },

    deliveryTerms: {                      // [FIX H1] was missing
      type: String,
      trim: true,
    },

    programmingScope: {                   // [FIX H1] was missing
      type:    String,
      trim:    true,
      default: 'Customer Scope',
    },

    onsiteSupport: {                      // [FIX H1] was missing
      type:    Boolean,
      default: false,
    },

    paymentTerms: {                       // [FIX H1] was missing
      type: String,
      trim: true,
    },

    // ── Section 8 — Notes & Review ────────────────────────────────────────────
    additionalNotes: {                    // [FIX H1] was missing
      type: String,
      trim: true,
    },

    internalRemarks: {                    // [FIX H1] was missing
      type: String,
      trim: true,
    },

    preparedBy: {                         // [FIX H1] was missing
      type: String,
      trim: true,
    },

    reviewStatus: {                       // [FIX H1] was missing
      type: String,
      trim: true,
    },

    // ── Attachments ───────────────────────────────────────────────────────────
    attachments: {                        // [FIX C2] was completely missing
      type:    [attachmentSchema],
      default: [],
    },

    // Legacy single-file attachment string — preserved for old records
    attachment: {
      type: String,
      trim: true,
    },

    // ── Existing fields (unchanged) ───────────────────────────────────────────
    estimatedValue: {
      type:    Number,
      default: 0,
    },

    priority: {
      type:    String,
      enum:    ['High', 'Medium', 'Low'],
      default: 'Medium',
    },

    status: {
      type: String,
      enum: [
        'New', 'Under Discussion', 'Quotation Submit',
        'Negotiation', 'Order Recieved', 'Inquiry Hold', 'Inq. Lost',
      ],
      default: 'New',
    },

    nextFollowUpDate: { type: Date },

    remarks: { type: String, trim: true },

    createdBy: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },

    convertedToProject: { type: Boolean, default: false },
    projectReference:   { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  },
  { timestamps: true }
);

// ─── Text search index ────────────────────────────────────────────────────────
inquirySchema.index({
  customerName: 'text',
  companyName:  'text',
  projectName:  'text',
});

// ─── Indexes on contacts sub-array ───────────────────────────────────────────
inquirySchema.index({ 'contacts.phone': 1 });
inquirySchema.index({ 'contacts.email': 1 });

// ─── Pre-save hook ────────────────────────────────────────────────────────────
inquirySchema.pre('save', async function (next) {
  // 1. Auto-increment inquiryId
  if (!this.inquiryId) {
    try {
      const counter = await Counter.findOneAndUpdate(
        { id: 'inquiryId' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.inquiryId = counter.seq;
    } catch (err) {
      return next(err);
    }
  }

  // 2. Sync contacts[0] → legacy flat fields
  if (this.contacts && this.contacts.length > 0) {
    const primary      = this.contacts[0];
    this.contactPerson = primary.name        || this.contactPerson || '';
    this.mobileNumber  = primary.phone       || this.mobileNumber  || '';
    this.email         = primary.email       || this.email         || '';
    this.designation   = primary.designation || this.designation   || '';
  }

  // 3. Back-fill contacts[] from legacy flat fields for old records
  if ((!this.contacts || this.contacts.length === 0) && this.contactPerson) {
    this.contacts = [{
      name:        this.contactPerson || '',
      phone:       this.mobileNumber  || '',
      email:       this.email         || '',
      designation: this.designation   || '',
    }];
  }

  next();
});

module.exports = mongoose.model('Inquiry', inquirySchema);
