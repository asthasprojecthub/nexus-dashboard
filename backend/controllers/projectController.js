const Project = require('../models/Project');
const Inquiry = require('../models/Inquiry');
const Customer = require('../models/Customer');

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
const getProjects = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, projectStatus, paymentStatus } = req.query;

    const query = {};
    if (projectStatus) query.projectStatus = projectStatus;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    if (search) {
      query.$or = [
        { projectId: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { projectName: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [projects, total] = await Promise.all([
      Project.find(query)
        .populate('assignedTo', 'name email')
        .populate('createdBy', 'name')
        .populate('inquiryReference', 'inquiryId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Project.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: projects,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
const getProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('assignedTo', 'name email phone')
      .populate('createdBy', 'name')
      .populate('inquiryReference');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    res.json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

// @desc    Create project (manual or from inquiry)
// @route   POST /api/projects
// @access  Private
const createProject = async (req, res, next) => {
  try {
    req.body.createdBy = req.user._id;

    const project = await Project.create(req.body);

    // If created from inquiry, update inquiry
    if (req.body.inquiryReference) {
      await Inquiry.findByIdAndUpdate(req.body.inquiryReference, {
        convertedToProject: true,
        projectReference: project._id,
        status: 'Order Confirmed',
      });
    }

    // Update customer stats
    if (req.body.customerName) {
      await Customer.findOneAndUpdate(
        { customerName: req.body.customerName },
        {
          $inc: {
            totalProjects: 1,
            totalBusinessValue: project.orderValue || 0,
          },
        }
      );
    }

    const populated = await Project.findById(project._id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
const updateProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const updated = await Project.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name');

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private (Admin)
const deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    await project.deleteOne();

    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Convert inquiry to project
// @route   POST /api/projects/convert/:inquiryId
// @access  Private
const convertInquiryToProject = async (req, res, next) => {
  try {
    const inquiry = await Inquiry.findById(req.params.inquiryId);

    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }

    if (inquiry.convertedToProject) {
      return res.status(400).json({ success: false, message: 'Inquiry already converted to project' });
    }

    const projectData = {
      inquiryReference: inquiry._id,
      customerName: inquiry.customerName,
      companyName: inquiry.companyName,
      projectName: inquiry.projectName || `${inquiry.customerName} - ${inquiry.productType}`,
      panelType: inquiry.productType,
      orderValue: inquiry.estimatedValue,
      assignedTo: inquiry.assignedSalesperson,
      createdBy: req.user._id,
      ...req.body,
    };

    const project = await Project.create(projectData);

    // Update inquiry
    await Inquiry.findByIdAndUpdate(inquiry._id, {
      convertedToProject: true,
      projectReference: project._id,
      status: 'Order Confirmed',
    });

    // Update customer stats
    await Customer.findOneAndUpdate(
      { mobileNumber: inquiry.mobileNumber },
      {
        $inc: {
          totalProjects: 1,
          totalBusinessValue: inquiry.estimatedValue || 0,
        },
      }
    );

    const populated = await Project.findById(project._id)
      .populate('assignedTo', 'name email')
      .populate('inquiryReference', 'inquiryId');

    res.status(201).json({ success: true, data: populated, message: 'Inquiry successfully converted to project' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  convertInquiryToProject,
};
