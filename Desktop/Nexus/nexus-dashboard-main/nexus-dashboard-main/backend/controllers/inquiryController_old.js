// ─────────────────────────────────────────────────────────────────────────────
// controllers/inquiryController.js  (updated — drop-in replacement)
//
// What changed vs the original:
//   + normaliseContacts() helper — converts legacy flat fields → contacts[]
//   + validateContacts()  helper — validates contacts array, returns errors
//   + createInquiry: normalises contacts, validates, uses contacts[0] for
//     Customer auto-create (falls back to legacy fields if contacts empty)
//   + updateInquiry: normalises contacts before update
//   + getInquiries: search now also matches contacts[].phone / name
//   + getInquiry:   unchanged (Mongoose returns full contacts[] automatically)
//   + deleteInquiry, getFollowUps: unchanged
//   All original notification logic preserved exactly.
// ─────────────────────────────────────────────────────────────────────────────

const Inquiry  = require('../models/Inquiry');
const Customer = require('../models/Customer');
const createNotification = require('../services/notificationService');

// ─── Helper: normalise any inbound payload to a proper contacts[] ─────────────
//
// Handles three possible inbound shapes:
//   A) New shape:   { contacts: [{name, phone, email, designation}, …] }
//   B) Legacy shape: { contactPerson, mobileNumber, email, designation }
//   C) Mixed:       contacts[] present but empty, legacy fields present
//
// Returns a contacts array with at least one entry (or empty if truly nothing).
const normaliseContacts = (body) => {
  // Strip transient UI-only 'id' field from each contact before saving
  const clean = (arr) =>
    arr
      .filter(c => c && (c.name || c.phone || c.email))
      .map(({ id, _id, ...rest }) => rest);   // drop id / _id from frontend

  // Shape A — contacts array provided and non-empty
  if (Array.isArray(body.contacts) && body.contacts.length > 0) {
    return clean(body.contacts);
  }

  // Shape B / C — fall back to legacy flat fields
  if (body.contactPerson || body.mobileNumber) {
    return [{
      name:        (body.contactPerson || '').trim(),
      phone:       (body.mobileNumber  || '').trim(),
      email:       (body.email         || '').trim(),
      designation: (body.designation   || '').trim(),
    }];
  }

  // Nothing at all — return empty; schema pre-save will handle old documents
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

  // Additional contacts — validate format only if values provided
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
        { customerName:       { $regex: search, $options: 'i' } },
        { companyName:        { $regex: search, $options: 'i' } },
        { projectName:        { $regex: search, $options: 'i' } },
        // Legacy flat field
        { contactPerson:      { $regex: search, $options: 'i' } },
        { mobileNumber:       { $regex: search, $options: 'i' } },
        // New contacts array — search primary contact name and phone
        { 'contacts.name':    { $regex: search, $options: 'i' } },
        { 'contacts.phone':   { $regex: search, $options: 'i' } },
        { 'contacts.email':   { $regex: search, $options: 'i' } },
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
      data: inquiries,
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

    // Back-fill contacts for old records that have none yet
    // (read-only transform — does NOT save to DB)
    const data = inquiry.toObject();
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
    // 1. Normalise contacts
    const contacts = normaliseContacts(req.body);

    // 2. Validate
    const contactErrors = validateContacts(contacts);
    if (contactErrors.length > 0) {
      return res.status(400).json({ success: false, message: contactErrors[0], errors: contactErrors });
    }

    // 3. Build payload — contacts[] is authoritative; legacy fields derived in pre-save
    const primary = contacts[0];
    const payload = {
      ...req.body,
      contacts,
      // Keep legacy fields in sync for Customer auto-create below
      contactPerson: primary.name,
      mobileNumber:  primary.phone,
      email:         primary.email,
      designation:   primary.designation,
      createdBy:     req.user._id,
    };

    const inquiry = await Inquiry.create(payload);

    // 4. Notification (unchanged from original)
    await createNotification({
      title:         'New Inquiry Added',
      message:       `Inquiry ${inquiry.inquiryId} created for ${inquiry.customerName}`,
      type:          'info',
      recipient:     req.user._id,
      relatedInquiry: inquiry._id,
      sendEmail:     true,
      emailTo:       'project.intern@nexusautomech.com',
    });

    // 5. Auto-create Customer — use primary contact; match on phone OR email
    const lookupConditions = [];
    if (primary.phone) lookupConditions.push({ mobileNumber: primary.phone });
    if (primary.email) lookupConditions.push({ email:        primary.email });

    let existingCustomer = lookupConditions.length > 0
      ? await Customer.findOne({ $or: lookupConditions })
      : null;

    if (!existingCustomer && inquiry.customerName) {
      await Customer.create({
        customerName:  inquiry.customerName,
        companyName:   inquiry.companyName,
        contactPerson: primary.name,
        mobileNumber:  primary.phone,
        email:         primary.email,
        location:      inquiry.location,
        createdBy:     req.user._id,
      });
    }

    const populatedInquiry = await Inquiry.findById(inquiry._id)
      .populate('createdBy', 'name');

    // Back-fill contacts on response in case pre-save ran before contacts persisted
    const data = populatedInquiry.toObject();
    if (!data.contacts || data.contacts.length === 0) {
      data.contacts = contacts;
    }

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
    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }

    const statusChanged = req.body.status && req.body.status !== inquiry.status;

    // Normalise contacts if provided in the update body
    let updatePayload = { ...req.body };
    if (req.body.contacts !== undefined || req.body.contactPerson !== undefined) {
      const contacts = normaliseContacts(req.body);

      // Validate only if contacts were explicitly sent
      if (contacts.length > 0) {
        const contactErrors = validateContacts(contacts);
        if (contactErrors.length > 0) {
          return res.status(400).json({ success: false, message: contactErrors[0], errors: contactErrors });
        }
        const primary = contacts[0];
        updatePayload = {
          ...updatePayload,
          contacts,
          // Keep legacy fields in sync
          contactPerson: primary.name,
          mobileNumber:  primary.phone,
          email:         primary.email,
          designation:   primary.designation,
        };
      }
    }

    const updatedInquiry = await Inquiry.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name');

    // Notifications (unchanged from original)
    await createNotification({
      title:         'Inquiry Updated',
      message:       `Inquiry ${updatedInquiry.inquiryId} updated successfully`,
      type:          'info',
      recipient:     req.user._id,
      relatedInquiry: updatedInquiry._id,
      sendEmail:     true,
      emailTo:       'project.intern@nexusautomech.com',
    });

    if (statusChanged) {
      await createNotification({
        title:         'Status Changed',
        message:       `Inquiry ${updatedInquiry.inquiryId} moved to ${updatedInquiry.status}`,
        type:          'status',
        recipient:     req.user._id,
        relatedInquiry: updatedInquiry._id,
        sendEmail:     true,
        emailTo:       'project.intern@nexusautomech.com',
      });
    }

    // Back-fill contacts on response for old records
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

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc  Delete inquiry
// @route DELETE /api/inquiries/:id
// @access Private (admin/manager)
// ─────────────────────────────────────────────────────────────────────────────
const deleteInquiry = async (req, res, next) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }

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
// @desc  Get follow-ups (unchanged from original)
// @route GET /api/inquiries/follow-ups
// @access Private
// ─────────────────────────────────────────────────────────────────────────────
const getFollowUps = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const followUps = await Inquiry.find({
      nextFollowUpDate: { $lte: today },
      status: { $nin: ['Order Recieved', 'Inq. Lost'] },
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
};
