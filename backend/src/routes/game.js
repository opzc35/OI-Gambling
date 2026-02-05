const express = require('express');
const {
  startRound,
  getCurrentRound,
  submitGuess,
  settleRound,
} = require('../controllers/gameController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.post('/rooms/:id/rounds', authMiddleware, startRound);
router.get('/rooms/:id/rounds/current', authMiddleware, getCurrentRound);
router.post('/rounds/:id/guess', authMiddleware, submitGuess);
router.post('/rounds/:id/settle', authMiddleware, settleRound);

module.exports = router;
