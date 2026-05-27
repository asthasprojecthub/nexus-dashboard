const Inquiry = require('../models/Inquiry');
const Customer = require('../models/Customer');

const createNotification = require('../services/notificationService');


// ======================================================
// @desc    Get All Inquiries
// @route   GET /api/inquiries
// @access  Private
// ======================================================
const getInquiries = async (
  req,
  res,
  next
) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      priority,
      productType,
    } = req.query;

    const query = {};

    // =====================================
    // Search
    // =====================================

    if (search) {
      query.$or = [
        {
          inquiryId: {
            $regex: search,
            $options: 'i',
          },
        },

        {
          customerName: {
            $regex: search,
            $options: 'i',
          },
        },

        {
          companyName: {
            $regex: search,
            $options: 'i',
          },
        },

        {
          mobileNumber: {
            $regex: search,
            $options: 'i',
          },
        },
      ];
    }

    // =====================================
    // Filters
    // =====================================

    if (
      status &&
      status !== 'All status'
    ) {
      query.status = status;
    }

    if (priority) {
      query.priority = priority;
    }

    if (productType) {
      query.productType =
        productType;
    }

    const skip =
      (Number(page) - 1) *
      Number(limit);

    const inquiries =
      await Inquiry.find(query)

        .populate(
          'createdBy',
          'name email'
        )

        .sort({
          createdAt: -1,
        })

        .skip(skip)

        .limit(Number(limit));

    const total =
      await Inquiry.countDocuments(
        query
      );

    res.json({
      success: true,

      data: inquiries,

      pagination: {
        total,

        page: Number(page),

        pages: Math.ceil(
          total /
            Number(limit)
        ),

        limit: Number(limit),
      },
    });
  } catch (error) {
    next(error);
  }
};


// ======================================================
// @desc    Get Single Inquiry
// @route   GET /api/inquiries/:id
// @access  Private
// ======================================================
const getInquiry = async (
  req,
  res,
  next
) => {
  try {
    const inquiry =
      await Inquiry.findById(
        req.params.id
      ).populate(
        'createdBy',
        'name email'
      );

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message:
          'Inquiry not found',
      });
    }

    res.json({
      success: true,
      data: inquiry,
    });
  } catch (error) {
    next(error);
  }
};


// ======================================================
// @desc    Create Inquiry
// @route   POST /api/inquiries
// @access  Private
// ======================================================
const createInquiry = async (
  req,
  res,
  next
) => {
  try {
    req.body.createdBy =
      req.user._id;

    // =====================================
    // Generate Inquiry Number
    // =====================================

    const totalInquiries =
      await Inquiry.countDocuments();

    const nextNumber =
      1350 + totalInquiries;

    req.body.inquiryId =
      `INQ${nextNumber}`;

    // =====================================
    // Rename Negotiation Status
    // =====================================

    if (
      req.body.status ===
      'Negotiation'
    ) {
      req.body.status =
        'Commercial Discussion';
    }

    // =====================================
    // File Uploads
    // =====================================

    if (req.files) {
      req.body.attachments =
        req.files.map(
          (file) => file.path
        );
    }

    // =====================================
    // Create Inquiry
    // =====================================

    const inquiry =
      await Inquiry.create(
        req.body
      );

    // =====================================
    // Create Notification
    // =====================================

    await createNotification({
      title:
        'New Inquiry Created',

      message: `Inquiry ${inquiry.inquiryId} created for ${inquiry.customerName}`,

      type: 'info',

      recipient:
        req.user._id,

      relatedInquiry:
        inquiry._id,

      sendEmail: true,

      emailTo:
        'project.intern@nexusautomech.com',
    });

    // =====================================
    // Auto Create Customer
    // =====================================

    const existingCustomer =
      await Customer.findOne({
        $or: [
          {
            mobileNumber:
              inquiry.mobileNumber,
          },

          {
            email:
              inquiry.email,
          },
        ],
      });

    if (
      !existingCustomer &&
      inquiry.customerName
    ) {
      await Customer.create({
        customerName:
          inquiry.customerName,

        companyName:
          inquiry.companyName,

        mobileNumber:
          inquiry.mobileNumber,

        email:
          inquiry.email,

        location:
          inquiry.location,

        workProfile:
          inquiry.workProfile || '',

        createdBy:
          req.user._id,
      });
    }

    const populatedInquiry =
      await Inquiry.findById(
        inquiry._id
      ).populate(
        'createdBy',
        'name email'
      );

    res.status(201).json({
      success: true,
      data: populatedInquiry,
    });
  } catch (error) {
    next(error);
  }
};


// ======================================================
// @desc    Update Inquiry
// @route   PUT /api/inquiries/:id
// @access  Private
// ======================================================
const updateInquiry = async (
  req,
  res,
  next
) => {
  try {
    const inquiry =
      await Inquiry.findById(
        req.params.id
      );

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message:
          'Inquiry not found',
      });
    }

    // =====================================
    // Rename Negotiation
    // =====================================

    if (
      req.body.status ===
      'Negotiation'
    ) {
      req.body.status =
        'Commercial Discussion';
    }

    // =====================================
    // File Upload
    // =====================================

    if (req.files) {
      req.body.attachments =
        req.files.map(
          (file) => file.path
        );
    }

    // =====================================
    // Detect Status Change
    // =====================================

    const statusChanged =
      req.body.status &&
      req.body.status !==
        inquiry.status;

    // =====================================
    // Update Inquiry
    // =====================================

    const updatedInquiry =
      await Inquiry.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          new: true,
          runValidators: true,
        }
      ).populate(
        'createdBy',
        'name email'
      );

    // =====================================
    // Update Notification
    // =====================================

    await createNotification({
      title:
        'Inquiry Updated',

      message: `${updatedInquiry.inquiryId} updated successfully`,

      type: 'info',

      recipient:
        req.user._id,

      relatedInquiry:
        updatedInquiry._id,

      sendEmail: true,

      emailTo:
        'project.intern@nexusautomech.com',
    });

    // =====================================
    // Status Change Notification
    // =====================================

    if (statusChanged) {
      await createNotification({
        title:
          'Inquiry Status Changed',

        message: `${updatedInquiry.inquiryId} moved to ${updatedInquiry.status}`,

        type: 'status',

        recipient:
          req.user._id,

        relatedInquiry:
          updatedInquiry._id,

        sendEmail: true,

        emailTo:
          'project.intern@nexusautomech.com',
      });
    }

    res.json({
      success: true,
      data: updatedInquiry,
    });
  } catch (error) {
    next(error);
  }
};


// ======================================================
// @desc    Delete Inquiry
// @route   DELETE /api/inquiries/:id
// @access  Private
// ======================================================
const deleteInquiry = async (
  req,
  res,
  next
) => {
  try {
    const inquiry =
      await Inquiry.findById(
        req.params.id
      );

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message:
          'Inquiry not found',
      });
    }

    await createNotification({
      title:
        'Inquiry Deleted',

      message: `${inquiry.inquiryId} deleted successfully`,

      type: 'info',

      recipient:
        req.user._id,

      sendEmail: true,

      emailTo:
        'project.intern@nexusautomech.com',
    });

    await inquiry.deleteOne();

    res.json({
      success: true,
      message:
        'Inquiry deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};


// ======================================================
// @desc    Get Follow Ups
// @route   GET /api/inquiries/follow-ups
// @access  Private
// ======================================================
const getFollowUps = async (
  req,
  res,
  next
) => {
  try {
    const today =
      new Date();

    today.setHours(
      23,
      59,
      59,
      999
    );

    const followUps =
      await Inquiry.find({
        nextFollowUpDate: {
          $lte: today,
        },

        status: {
          $nin: [
            'Order Recieved',
            'Inq. Lost',
          ],
        },
      })

        .populate(
          'createdBy',
          'name'
        )

        .sort({
          nextFollowUpDate: 1,
        })

        .limit(20);

    res.json({
      success: true,
      data: followUps,
    });
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