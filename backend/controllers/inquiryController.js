const Inquiry = require('../models/Inquiry');
const Customer = require('../models/Customer');

const createNotification = require('../services/notificationService');


// @desc Get all inquiries
// @route GET /api/inquiries
// @access Private
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

    // Filters
    if (status) {
      query.status = status;
    }

    if (priority) {
      query.priority = priority;
    }

    if (productType) {
      query.productType =
        productType;
    }

    // Search
    if (search) {
      query.$or = [
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
          inquiryId: {
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

    const skip =
      (Number(page) - 1) *
      Number(limit);

    const inquiries =
      await Inquiry.find(query)
        .populate(
          'createdBy',
          'name'
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


// @desc Get single inquiry
// @route GET /api/inquiries/:id
// @access Private
const getInquiry = async (
  req,
  res,
  next
) => {
  try {
    const inquiry =
      await Inquiry.findById(
        req.params.id
      )
        .populate(
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


// @desc Create inquiry
// @route POST /api/inquiries
// @access Private
const createInquiry = async (
  req,
  res,
  next
) => {
  try {
    req.body.createdBy =
      req.user._id;

    const inquiry =
      await Inquiry.create(
        req.body
      );

    // Create Notification
    await createNotification({
      title:
        'New Inquiry Added',

      message: `Inquiry ${inquiry.inquiryId} created for ${inquiry.customerName}`,

      type: 'info',

      recipient:
        req.user._id,

      relatedInquiry:
        inquiry._id,

      // Outlook Email
      sendEmail: true,

      emailTo:
        'project.intern@nexusautomech.com',
    });

    // Auto Create Customer
    let customer =
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
      !customer &&
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

        createdBy:
          req.user._id,
      });
    }

    const populatedInquiry =
      await Inquiry.findById(
        inquiry._id
      ).populate(
        'createdBy',
        'name'
      );

    res.status(201).json({
      success: true,
      data: populatedInquiry,
    });
  } catch (error) {
    next(error);
  }
};


// @desc Update inquiry
// @route PUT /api/inquiries/:id
// @access Private
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

    const statusChanged =
      req.body.status &&
      req.body.status !==
        inquiry.status;

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
        'name'
      );

    // Notification
    await createNotification({
      title:
        'Inquiry Updated',

      message: `Inquiry ${updatedInquiry.inquiryId} updated successfully`,

      type: 'info',

      recipient:
        req.user._id,

      relatedInquiry:
        updatedInquiry._id,

      sendEmail: true,

      emailTo:
        'project.intern@nexusautomech.com',
    });

    // Status Change Notification
    if (statusChanged) {
      await createNotification({
        title:
          'Status Changed',

        message: `Inquiry ${updatedInquiry.inquiryId} moved to ${updatedInquiry.status}`,

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


// @desc Delete inquiry
// @route DELETE /api/inquiries/:id
// @access Private
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

    // Notification
    await createNotification({
      title:
        'Inquiry Deleted',

      message: `Inquiry ${inquiry.inquiryId} deleted successfully`,

      type: 'warning',

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


// @desc Get follow-ups
// @route GET /api/inquiries/follow-ups
// @access Private
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