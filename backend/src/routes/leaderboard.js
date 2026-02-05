const express = require('express');
const {
  getLeaderboard,
  createTransaction,
  getTransactionHistory,
} = require('../controllers/leaderboardController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/leaderboard', getLeaderboard);
router.post('/transactions', authMiddleware, createTransaction);
router.get('/transactions/history', authMiddleware, getTransactionHistory);

module.exports = router;
