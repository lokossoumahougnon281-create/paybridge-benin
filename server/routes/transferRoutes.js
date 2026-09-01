const express = require('express');
const router = express.Router();
const transferController = require('../controllers/transferController');
const { requireAuth } = require('../middleware/authMiddleware');

router.post('/execute', transferController.executeTransfer);
router.get('/history', transferController.getTransactionHistory);

module.exports = router;
