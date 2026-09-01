const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/authMiddleware');

router.get('/pools', requireAdmin, adminController.getDashboardPools);
router.post('/adjust-pool', requireAdmin, adminController.adjustPoolBalance);

module.exports = router;
