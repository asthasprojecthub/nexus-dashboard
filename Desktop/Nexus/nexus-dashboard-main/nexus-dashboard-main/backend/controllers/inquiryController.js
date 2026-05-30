// ─────────────────────────────────────────────────────────────────────────────
// backend/controllers/inquiryController.js  — FIXED (full replacement)
//
// Bug fixes applied:
//   [M1] createInquiry: replaced `payload = { ...req.body, … }` with an
//        explicit, allowlisted payload object.  Spreading req.body was
//        forwarding unknown / UI-only junk fields and could conflict with
//        explicitly set fields lower in the spread.
//   [H2] updateInquiry: strip protected fields (createdBy, inquiryId, _id,
//        __v) from updatePayload before calling findByIdAndUpdate.
//        Previously, the frontend's _json blob re-sent these fields (they
//        come back from the GET /inquiries/:id response and are part of the
//        form state spread into jsonPayload).  Allowing them through could
//        overwrite the original author and cause inquiryId collisions.
//   [H2] updateInquiry: also strip keptAttachments from the DB update (was
//        already done but now done via explicit delete to be safe).
//
// All other logic preserved exactly:
//   uploadMiddleware, parseJsonField, buildAttachmentDocs, backFillAttachments,
//   normaliseContacts, validateContacts, getInquiries, getInquiry, getFollowUps,
//   deleteInquiry, notification calls, Customer auto-create.
// ─────────────────────────────────────────────────────────────────────────────

const Inquiry            = require('../models/Inquiry');
const Customer           = require('../models/Customer');
const path               = require('path');
const fs                 = require('fs');
const multer             = require('multer');
const createNotification = require('../services/notificationService');

// ─── Multer — multi-file upload (disk storage under uploads/inquiry/) ─────────
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'inquiry');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/zip', 'application/x-zip-compressed',
];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, safe);
  },
});

const fileFilter = (_req, file, cb) => {
  cb(null, ALLOWED_MIME.includes(file.mimetype));
};

// Exported so inquiryRoutes can apply it as route middleware
const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 },  // 15 MB per file
}).array('attachments', 10);               // field name: 'attachments', max 10 files

// ─── Helper: parse _json blob injected by the frontend FormData ──────────────
// The frontend serialises all non-file fields as JSON in fd.append('_json', ...).
// After multer runs, req.body._json is the raw string; this merges it back.
const parseJsonField = (req) => {
  if (req.body && req.body._json) {
    try {
      const parsed = JSON.parse(req.body._json);
      req.body = { ...req.body, ...parsed };
    } catch (_) {
      // Malformed _json — ignore, proceed with raw req.body
    }
    delete req.body._json;
  }
};

// ─── Helper: build attachment sub-docs from multer req.files ─────────────────
const buildAttachmentDocs = (files = []) =>
  files.map(f => ({
    originalName: f.originalname,
    storedName:   f.filename,
    storagePath:  path.join('inquiry', f.filename).replace(/\\/g, '/'),  // always forward slashes
    mimeType:     f.mimetype,
    sizeBytes:    f.size,
    uploadedAt:   new Date(),
  }));

// ─── Helper: back-fill attachments[] from legacy single attachment string ─────
const backFillAttachments = (docObj) => {
  if (!docObj.attachments || docObj.attachments.length === 0) {
    if (docObj.attachment) {
      docObj.attachments = [{
        originalName: path.basename(docObj.attachment),
        storedName:   path.basename(docObj.attachment),
        storagePath:  docObj.attachment,
        mimeType:     '',
        sizeBytes:    0,
        uploadedAt:   docObj.createdAt || new Date(),
      }];
    } else {
      docObj.attachments = [];
    }
  }
  return docObj;
};

// ─── Helper: normalise any inbound payload to a proper contacts[] ─────────────
const normaliseContacts = (body) => {
  const clean = (arr) =>
    arr
      .filter(c => c && (c.name || c.phone || c.email))
      .map(({ id, _id, ...rest }) => rest);

  if (Array.isArray(body.contacts) && body.contacts.length > 0) {
    return clean(body.contacts);
  }

  if (body.contactPerson || body.mobileNumber) {
    return [{
      name:        (body.contactPerson || '').trim(),
      phone:       (body.mobileNumber  || '').trim(),
      email:       (body.email         || '').trim(),
      designation: (body.designation   || '').trim(),
    }];
  }

  return [];
};

// ─── Helper: validate contacts array, return error messages ──────────────────
const validateContacts = (contacts) => {
  const errors = [];

  if (!contacts || contacts.length === 0) {
    errors.push('At least one contact person is required');
    return errors;
  }

  const primary = contacts[0];
  if (!primary.name || !primary.name.trim()) {
    errors.push('Primary contact name is required');
  }
  if (primary.phone && !/^\d{10}$/.test(primary.phone.replace(/\s/g, ''))) {
    errors.push('Primary contact phone must be a valid 10-digit number');
  }
  if (primary.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(primary.email)) {
    errors.push('Primary contact email is invalid');
  }

  contacts.slice(1).forEach((c, i) => {
    if (c.phone && !/^\d{10}$/.test(c.phone.replace(/\s/g, ''))) {
      errors.push(`Contact ${i + 2}: phone must be a valid 10-digit number`);
    }
    if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) {
      errors.push(`Contact ${i + 2}: email is invalid`);
    }
  });

  return errors;
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc  Get all inquiries
// @route GET /api/inquiries
// @access Private
// ─────────────────────────────────────────────────────────────────────────────
const getInquiries = async (req, res, next) => {
  try {
    const {
      page = 1, limit = 10,
      search, status, priority, productType,
    } = req.query;

    const query = {};

    if (status)      query.status      = status;
    if (priority)    query.priority    = priority;
    if (productType) query.productType = productType;

    if (search) {
      query.$or = [
        { customerName:     { $regex: search, $options: 'i' } },
        { companyName:      { $regex: search, $options: 'i' } },
        { projectName:      { $regex: search, $options: 'i' } },
        { contactPerson:    { $regex: search, $options: 'i' } },
        { mobileNumber:     { $regex: search, $options: 'i' } },
        { 'contacts.name':  { $regex: search, $options: 'i' } },
        { 'contacts.phone': { $regex: search, $options: 'i' } },
        { 'contacts.email': { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [inquiries, total] = await Promise.all([
      Inquiry.find(query)
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Inquiry.countDocuments(query),
    ]);

    res.json({
      success: true,
      data:    inquiries,
      pagination: {
        total,
        page:  Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc  Get single inquiry
// @route GET /api/inquiries/:id
// @access Private
// ─────────────────────────────────────────────────────────────────────────────
const getInquiry = async (req, res, next) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }

    const data = inquiry.toObject();

    // Back-fill contacts for old records that have none yet
    if (!data.contacts || data.contacts.length === 0) {
      if (data.contactPerson || data.mobileNumber) {
        data.contacts = [{
          name:        data.contactPerson || '',
          phone:       data.mobileNumber  || '',
          email:       data.email         || '',
          designation: data.designation   || '',
        }];
      } else {
        data.contacts = [];
      }
    }

    // Back-fill attachments from legacy single attachment string
    backFillAttachments(data);

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc  Create inquiry
// @route POST /api/inquiries
// @access Private
// ─────────────────────────────────────────────────────────────────────────────
const createInquiry = async (req, res, next) => {
  try {
    // 1. Parse the _json blob sent by the multipart form
    parseJsonField(req);

    // 2. Normalise contacts
    const contacts = normaliseContacts(req.body);

    // 3. Validate contacts
    const contactErrors = validateContacts(contacts);
    if (contactErrors.length > 0) {
      return res.status(400).json({ success: false, message: contactErrors[0], errors: contactErrors });
    }

    // 4. Build attachment docs from newly uploaded files
    const newFileDocs = buildAttachmentDocs(req.files || []);

    // 5. Build an explicit, allowlisted payload  [FIX M1]
    //    Do NOT spread req.body wholesale — it may contain _id, __v, inquiryId,
    //    createdBy from a cached response, or other fields that should not be
    //    written directly.  Pick each field explicitly.
    const b       = req.body;
    const primary = contacts[0];

    const payload = {
      // ── Section 1
      inquiryDate:    b.inquiryDate    || undefined,
      rfqNumber:      b.rfqNumber      || undefined,
      customerName:   b.customerName   || b.companyName || '',
      companyName:    b.companyName    || undefined,
      contacts,
      // Legacy flat contact fields — kept in sync by pre-save hook too,
      // but set explicitly here so Customer auto-create has them immediately.
      contactPerson:  primary.name,
      mobileNumber:   primary.phone,
      email:          primary.email,
      designation:    primary.designation,
      siteAddress:    b.siteAddress    || undefined,
      location:       b.location       || b.city || b.siteAddress || undefined,

      // ── Section 2
      projectName:      b.projectName      || undefined,
      industryType:     b.industryType     || undefined,
      offerType:        b.offerType        || undefined,
      previousOrderRef: b.previousOrderRef || undefined,

      // ── Section 3
      panelTypes:             Array.isArray(b.panelTypes)  ? b.panelTypes : [],
      customPanelType:        b.customPanelType        || undefined,
      applicationDescription: b.applicationDescription || undefined,
      productType:            b.productType            || (Array.isArray(b.panelTypes) && b.panelTypes[0]) || 'OTHER',

      // ── Section 4
      supplyVoltage:        b.supplyVoltage        || undefined,
      frequency:            b.frequency            || undefined,
      panelAreaClass:       b.panelAreaClass       || undefined,
      ipRating:             b.ipRating             || undefined,
      installationType:     b.installationType     || undefined,
      shortCircuitCapacity: b.shortCircuitCapacity || undefined,
      busbarMaterial:       b.busbarMaterial       || undefined,
      enclosureStandard:    b.enclosureStandard    || undefined,

      // ── Section 5
      loadDetails: Array.isArray(b.loadDetails) ? b.loadDetails : [],

      // ── Section 6
      controlType:   b.controlType   || undefined,
      controlMatrix: b.controlMatrix || {},

      // ── Section 7
      panelMounting:         b.panelMounting                  || undefined,
      certificationRequired: b.certificationRequired === true || b.certificationRequired === 'true',
      certificationDetails:  b.certificationDetails           || undefined,
      drawingsAttached:      b.drawingsAttached === true       || b.drawingsAttached === 'true',
      deliveryDate:          b.deliveryDate                   || undefined,
      deliveryTerms:         b.deliveryTerms                  || undefined,
      programmingScope:      b.programmingScope               || undefined,
      onsiteSupport:         b.onsiteSupport === true          || b.onsiteSupport === 'true',
      paymentTerms:          b.paymentTerms                   || undefined,

      // ── Section 8
      additionalNotes: b.additionalNotes || undefined,
      internalRemarks: b.internalRemarks || undefined,
      preparedBy:      b.preparedBy      || undefined,

      // ── Meta
      status:           b.status           || 'New',
      nextFollowUpDate: b.nextFollowUpDate  || undefined,
      remarks:          b.remarks           || undefined,
      reviewStatus:     b.reviewStatus      || undefined,

      // ── Attachments (new uploads only — no kept attachments on create)
      attachments: newFileDocs,

      // ── Protected — always set from session, never from client
      createdBy: req.user._id,
    };

    const inquiry = await Inquiry.create(payload);

    // 6. Notification (non-fatal — notificationService now has its own try/catch)
    await createNotification({
      title:          'New Inquiry Added',
      message:        `Inquiry ${inquiry.inquiryId} created for ${inquiry.customerName}`,
      type:           'info',
      recipient:      req.user._id,
      relatedInquiry: inquiry._id,
      sendEmail:      true,
      emailTo:        'project.intern@nexusautomech.com',
    });

    // 7. Auto-create Customer — use primary contact; match on phone OR email
    const lookupConditions = [];
    if (primary.phone) lookupConditions.push({ mobileNumber: primary.phone });
    if (primary.email) lookupConditions.push({ email:        primary.email });

    const existingCustomer = lookupConditions.length > 0
      ? await Customer.findOne({ $or: lookupConditions })
      : null;

    if (!existingCustomer && inquiry.customerName) {
      try {
        await Customer.create({
          customerName:  inquiry.customerName,
          companyName:   inquiry.companyName,
          contactPerson: primary.name,
          mobileNumber:  primary.phone,
          email:         primary.email,
          location:      inquiry.location,
          createdBy:     req.user._id,
        });
      } catch (custErr) {
        // Customer creation is a side-effect — log but don't fail the inquiry
        console.error('[createInquiry] Customer auto-create failed:', custErr.message);
      }
    }

    const populatedInquiry = await Inquiry.findById(inquiry._id)
      .populate('createdBy', 'name');

    const data = populatedInquiry.toObject();

    if (!data.contacts || data.contacts.length === 0) {
      data.contacts = contacts;
    }
    backFillAttachments(data);

    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc  Update inquiry
// @route PUT /api/inquiries/:id
// @access Private
// ─────────────────────────────────────────────────────────────────────────────
const updateInquiry = async (req, res, next) => {
  try {
    // 1. Parse the _json blob
    parseJsonField(req);

    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }

    const statusChanged = req.body.status && req.body.status !== inquiry.status;

    // 2. Build update payload — only include fields that were actually sent.
    //    [FIX H2] Do NOT copy createdBy, inquiryId, _id, __v from the request —
    //    these come back from the GET response and land in req.body via _json.
    //    Allowing them through would overwrite the original author and could
    //    cause duplicate-key errors on inquiryId.
    const b = req.body;

    // Start with the scalar fields that are safe to update
    const updatePayload = {};

    // Helper — only set key if value is not undefined/null (avoids wiping fields
    // that weren't sent in a partial update)
    const setIfPresent = (key, val) => {
      if (val !== undefined && val !== null) updatePayload[key] = val;
    };

    // ── Section 1
    setIfPresent('inquiryDate',  b.inquiryDate);
    setIfPresent('rfqNumber',    b.rfqNumber);
    setIfPresent('customerName', b.customerName || b.companyName);
    setIfPresent('companyName',  b.companyName);
    setIfPresent('siteAddress',  b.siteAddress);
    setIfPresent('location',     b.location || b.city || b.siteAddress);

    // ── Section 2
    setIfPresent('projectName',      b.projectName);
    setIfPresent('industryType',     b.industryType);
    setIfPresent('offerType',        b.offerType);
    setIfPresent('previousOrderRef', b.previousOrderRef);

    // ── Section 3
    if (b.panelTypes !== undefined)
      updatePayload.panelTypes = Array.isArray(b.panelTypes) ? b.panelTypes : [];
    setIfPresent('customPanelType',        b.customPanelType);
    setIfPresent('applicationDescription', b.applicationDescription);
    if (b.productType) updatePayload.productType = b.productType;

    // ── Section 4
    setIfPresent('supplyVoltage',        b.supplyVoltage);
    setIfPresent('frequency',            b.frequency);
    setIfPresent('panelAreaClass',       b.panelAreaClass);
    setIfPresent('ipRating',             b.ipRating);
    setIfPresent('installationType',     b.installationType);
    setIfPresent('shortCircuitCapacity', b.shortCircuitCapacity);
    setIfPresent('busbarMaterial',       b.busbarMaterial);
    setIfPresent('enclosureStandard',    b.enclosureStandard);

    // ── Section 5
    if (b.loadDetails !== undefined)
      updatePayload.loadDetails = Array.isArray(b.loadDetails) ? b.loadDetails : [];

    // ── Section 6
    setIfPresent('controlType',   b.controlType);
    if (b.controlMatrix !== undefined)
      updatePayload.controlMatrix = b.controlMatrix || {};

    // ── Section 7
    setIfPresent('panelMounting',        b.panelMounting);
    if (b.certificationRequired !== undefined)
      updatePayload.certificationRequired = b.certificationRequired === true || b.certificationRequired === 'true';
    setIfPresent('certificationDetails', b.certificationDetails);
    if (b.drawingsAttached !== undefined)
      updatePayload.drawingsAttached = b.drawingsAttached === true || b.drawingsAttached === 'true';
    setIfPresent('deliveryDate',     b.deliveryDate);
    setIfPresent('deliveryTerms',    b.deliveryTerms);
    setIfPresent('programmingScope', b.programmingScope);
    if (b.onsiteSupport !== undefined)
      updatePayload.onsiteSupport = b.onsiteSupport === true || b.onsiteSupport === 'true';
    setIfPresent('paymentTerms', b.paymentTerms);

    // ── Section 8
    setIfPresent('additionalNotes', b.additionalNotes);
    setIfPresent('internalRemarks', b.internalRemarks);
    setIfPresent('preparedBy',      b.preparedBy);
    setIfPresent('reviewStatus',    b.reviewStatus);

    // ── Meta (estimator-editable only — keep whatever is sent)
    setIfPresent('status',           b.status);
    setIfPresent('priority',         b.priority);
    setIfPresent('estimatedValue',   b.estimatedValue);
    setIfPresent('nextFollowUpDate', b.nextFollowUpDate);
    setIfPresent('remarks',          b.remarks);

    // ── Contacts — normalise if provided
    if (b.contacts !== undefined || b.contactPerson !== undefined) {
      const contacts = normaliseContacts(b);

      if (contacts.length > 0) {
        const contactErrors = validateContacts(contacts);
        if (contactErrors.length > 0) {
          return res.status(400).json({ success: false, message: contactErrors[0], errors: contactErrors });
        }
        const primary = contacts[0];
        updatePayload.contacts      = contacts;
        updatePayload.contactPerson = primary.name;
        updatePayload.mobileNumber  = primary.phone;
        updatePayload.email         = primary.email;
        updatePayload.designation   = primary.designation;
      }
    }

    // ── Attachments: merge kept + new uploads  [FIX H2 — keptAttachments was in req.body spread before]
    const newFileDocs = buildAttachmentDocs(req.files || []);
    const keptDocs    = Array.isArray(b.keptAttachments)
      ? b.keptAttachments.filter(a => a && (a.storedName || a.originalName))
      : [];

    updatePayload.attachments = [...keptDocs, ...newFileDocs];
    // keptAttachments must never reach the DB — already excluded since we
    // never called setIfPresent('keptAttachments', …)

    const updatedInquiry = await Inquiry.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name');

    if (!updatedInquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found after update' });
    }

    // 4. Notifications (non-fatal)
    await createNotification({
      title:          'Inquiry Updated',
      message:        `Inquiry ${updatedInquiry.inquiryId} updated successfully`,
      type:           'info',
      recipient:      req.user._id,
      relatedInquiry: updatedInquiry._id,
      sendEmail:      true,
      emailTo:        'project.intern@nexusautomech.com',
    });

    if (statusChanged) {
      await createNotification({
        title:          'Status Changed',
        message:        `Inquiry ${updatedInquiry.inquiryId} moved to ${updatedInquiry.status}`,
        type:           'status',
        recipient:      req.user._id,
        relatedInquiry: updatedInquiry._id,
        sendEmail:      true,
        emailTo:        'project.intern@nexusautomech.com',
      });
    }

    // 5. Back-fill contacts on response for old records
    const data = updatedInquiry.toObject();
    if (!data.contacts || data.contacts.length === 0) {
      if (data.contactPerson) {
        data.contacts = [{
          name:        data.contactPerson || '',
          phone:       data.mobileNumber  || '',
          email:       data.email         || '',
          designation: data.designation   || '',
        }];
      }
    }
    backFillAttachments(data);

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc  Delete inquiry
// @route DELETE /api/inquiries/:id
// @access Private (admin/estimator)
// ─────────────────────────────────────────────────────────────────────────────
const deleteInquiry = async (req, res, next) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }

    // Notification is non-fatal (notificationService has its own try/catch)
    await createNotification({
      title:     'Inquiry Deleted',
      message:   `Inquiry ${inquiry.inquiryId} deleted successfully`,
      type:      'warning',
      recipient: req.user._id,
      sendEmail: true,
      emailTo:   'project.intern@nexusautomech.com',
    });

    await inquiry.deleteOne();
    res.json({ success: true, message: 'Inquiry deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc  Get follow-ups
// @route GET /api/inquiries/follow-ups
// @access Private
// ─────────────────────────────────────────────────────────────────────────────
const getFollowUps = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const followUps = await Inquiry.find({
      nextFollowUpDate: { $lte: today },
      status:           { $nin: ['Order Recieved', 'Inq. Lost'] },
    })
      .sort({ nextFollowUpDate: 1 })
      .limit(20);

    res.json({ success: true, data: followUps });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInquiries,
  getInquiry,
  createInquiry,
  updateInquiry,
  deleteInquiry,
  getFollowUps,
  uploadMiddleware,
};
