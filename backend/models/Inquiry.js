const mongoose = require('mongoose');
const Counter = require('./Counter');

const inquirySchema = new mongoose.Schema(
  {
    inquiryId: {
      type: String,
      unique: true,
    },

    inquiryDate: {
      type: Date,
      default: Date.now,
    },

    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },

    companyName: {
      type: String,
      trim: true,
    },

    contactPerson: {
      type: String,
      trim: true,
    },

    mobileNumber: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
    },

    location: {
      type: String,
      trim: true,
    },

    productType: {
      type: String,
      enum: ['MCC', 'PCC', 'APFC', 'VFD', 'PLC', 'OTHER'],
      required: [true, 'Product type is required'],
    },

    projectName: {
      type: String,
      trim: true,
    },

    estimatedValue: {
      type: Number,
      default: 0,
    },

    priority: {
      type: String,
      enum: ['High', 'Medium', 'Low'],
      default: 'Medium',
    },

    status: {
      type: String,
      enum: [
        'New',
        'Under Discussion',
        'Quotation Submit',
        'Commercial Discussion',
        'Order Recieved',
        'Inquiry Hold',
        'Inq. Lost',
      ],
      default: 'New',
    },

    nextFollowUpDate: {
      type: Date,
    },

    remarks: {
      type: String,
      trim: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    convertedToProject: {
      type: Boolean,
      default: false,
    },

    projectReference: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
    },
  },
  { timestamps: true }
);

// Search Index
inquirySchema.index({
  customerName: 'text',
  companyName: 'text',
  projectName: 'text',
});

// Auto Increment Inquiry ID
inquirySchema.pre('save', async function (next) {
  // Skip if already exists
  if (this.inquiryId) {
    return next();
  }

  try {
    const counter = await Counter.findOneAndUpdate(
      { id: 'inquiryId' },
      { $inc: { seq: 1 } },
      {
        new: true,
        upsert: true,
      }
    );

    this.inquiryId = counter.seq;

    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model(
  'Inquiry',
  inquirySchema
)