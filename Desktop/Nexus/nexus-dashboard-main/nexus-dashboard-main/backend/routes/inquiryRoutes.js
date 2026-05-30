// backend/routes/inquiryRoutes.js
const express = require('express');
const router  = express.Router();
const {
  getInquiries,
  getInquiry,
  createInquiry,
  updateInquiry,
  deleteInquiry,
  getFollowUps,
  uploadMiddleware,          // multer multi-file middleware
} = require('../controllers/inquiryController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/follow-ups', getFollowUps);

router.route('/')
  .get(getInquiries)
  .post(uploadMiddleware, createInquiry);    // multer runs before createInquiry

router.route('/:id')
  .get(getInquiry)
  .put(uploadMiddleware, updateInquiry)       // multer runs before updateInquiry
  .delete(authorize('admin', 'estimator'), deleteInquiry);

module.exports = router;