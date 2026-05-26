const express = require('express');
const router = express.Router();
const {
  getInquiries,
  getInquiry,
  createInquiry,
  updateInquiry,
  deleteInquiry,
  getFollowUps,
} = require('../controllers/inquiryController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/follow-ups', getFollowUps);
router.route('/').get(getInquiries).post(createInquiry);
router.route('/:id')
  .get(getInquiry)
  .put(updateInquiry)
  .delete(authorize('admin', 'manager'), deleteInquiry);

module.exports = router;
