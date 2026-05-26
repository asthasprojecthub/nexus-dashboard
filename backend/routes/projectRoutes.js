const express = require('express');
const router = express.Router();
const {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  convertInquiryToProject,
} = require('../controllers/projectController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/convert/:inquiryId', convertInquiryToProject);
router.route('/').get(getProjects).post(createProject);
router.route('/:id')
  .get(getProject)
  .put(updateProject)
  .delete(authorize('admin'), deleteProject);

module.exports = router;
