const mongoose = require('mongoose');

const generateProjectId = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `PROJ-${year}-${random}`;
};

const projectSchema = new mongoose.Schema(
  {
    projectId: {
      type: String,
      unique: true,
      default: generateProjectId,
    },
    inquiryReference: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inquiry',
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
    projectName: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
    },
    panelType: {
      type: String,
      enum: ['MCC', 'PCC', 'APFC', 'VFD', 'PLC', 'BUSDUCT', 'OTHER'],
    },
    orderValue: {
      type: Number,
      default: 0,
    },
    orderDate: {
      type: Date,
      default: Date.now,
    },
    expectedDeliveryDate: {
      type: Date,
    },
    actualDeliveryDate: {
      type: Date,
    },
    productionStatus: {
      type: String,
      enum: ['Not Started', 'In Progress', 'Completed'],
      default: 'Not Started',
    },
    dispatchStatus: {
      type: String,
      enum: ['Not Dispatched', 'Dispatched', 'Delivered'],
      default: 'Not Dispatched',
    },
    installationStatus: {
      type: String,
      enum: ['Not Started', 'In Progress', 'Completed'],
      default: 'Not Started',
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Partial', 'Completed'],
      default: 'Pending',
    },
    projectStatus: {
      type: String,
      enum: ['Planning', 'Design', 'Production', 'Testing', 'Dispatch', 'Installation', 'Completed'],
      default: 'Planning',
    },
    completionPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    customerRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Project', projectSchema);
